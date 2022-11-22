import { useState, useEffect } from "react"
import { ActionButton } from "../Button"
import { GAS_LIMIT_WRITE } from "../../Dashboard"
import { toast } from 'react-toastify';
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from "wagmi"

export const NewDeal = ({
     match, processingAction, setProcessingAction, myAddress, playingDeal, setPlayingDeal }: any
) => {

    const [ imShuffler, setImShuffler] = useState(false)
    const [ goToSpell, setGoToSpell] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)

    useContractRead({
        addressOrName: process.env.FRONT_MATCH_FACADE_ADDRESS as string,
        contractInterface: new Interface(['function getCurrentShuffler(address) public view returns (address)']),
        functionName: 'getCurrentShuffler',
        args: [match],
        onSuccess: (data) => {
            if (data && myAddress === data) {
                setImShuffler(true)
                
            }
        },
        onError:(err: Error) => {
            console.log('ERROR: getdata current shuffler', err)

        }
    })

    const { refetch, config } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(['function newDeal() public']),
        functionName: 'newDeal',
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        onSuccess: (data) => {
            console.log(`can newDeal (TRUE)`, data)
            if (imShuffler) {
                setEnableAction(true)
            }
        },
        onError: (err: Error) => {
            console.log(`can't newDeal (FALSE)`, err)
            setEnableAction(false)
        }
    })

    const { write, error, isLoading, data } = useContractWrite(config)

    useWaitForTransaction({
        hash: data?.hash,
        wait: data?.wait,
        onSuccess: (data) => {
            setPlayingDeal(true)
            console.log('succes transaction newdeal', data)
        },
        onError: (err:Error) => {
            console.log('ERROR transaction newdeal', err)
        }
    })

    useEffect(() => {
        if (imShuffler) {
            refetch()
        }
    }, [imShuffler, refetch])


    useEffect(() => {
        if (error && goToSpell) {
            toast.error(`🦄 Error: ${error?.message}`, {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            setGoToSpell(false)
            setProcessingAction(false)
        }
    }, [ error, goToSpell ])

    return (
        <>
        {
            enableAction ?
                    <ActionButton clickCallback={() => {
                        setGoToSpell(true) 
                        setProcessingAction(true)
                        write?.()
                    }} text="New deal" />
            : ""
        }
        </>
    )
}
