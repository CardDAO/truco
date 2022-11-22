import { BigNumber } from "ethers"
import { arrayify, Interface } from "ethers/lib/utils"
import { useCallback, useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useContractRead, useContractWrite, usePrepareContractWrite, useSignMessage, useWaitForTransaction } from "wagmi"
import { AccountType, useAccountInformation } from "../../../hooks/providers/Wagmi"
import { GAS_LIMIT_WRITE } from "../../Dashboard"
import { ActionButton } from "../Button"

export const RevealCards = ({ match, setProcessingAction, cards, processingAction}: any) => {
    const [enableAction, setEnableAction] = useState(false)
    const [ inProgress, setInProgress ] = useState(false)
    const [ signature, setSignature ] = useState("")
    const [ goToSpell, setGoToSpell ] = useState(false)
    const [ checkSuccess, setCheckSuccess ] = useState(false)

    const { address } : AccountType = useAccountInformation()

    const { error: errorToSign, signMessage } = useSignMessage({
        onSuccess(signature: any, variables: any) {
            setSignature(signature)
            setGoToSpell(true)
        },
        onError(error:Error) {
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
        }
    })

    const { refetch: getHashToSign } = useContractRead({
        addressOrName: match,
        contractInterface: new Interface(["function getCardProofToForSigning(address, uint8[]) public view returns (bytes32)"]),
        functionName: "getCardProofToForSigning",
        enabled: inProgress,
        args: [ address, cards.reduce((previous, current) => [...previous, BigNumber.from(current.toString())], []) ],
        overrides: {
            from: address as string
        },
        onSuccess: (data) => {

        },
        onError: (error: Error) => {
            setProcessingAction(false)
            setInProgress(false)
            toast.error(`🦄 Error get message to sign: ${error?.message}`, {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
        }
    })

    const onReveal =  () => {
        getHashToSign().then((result) => {
            signMessage({
                message: arrayify(result.data)
            })
        }).catch((error: Error) => {
            setProcessingAction(false)
            setInProgress(false)
            setCheckSuccess(false)
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
        })
        
    }
    const { config } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(["function revealCards(uint8[] memory, bytes memory) public"]),
        functionName: "revealCards",
        enabled: goToSpell,
        args: [ cards, signature],
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        onSuccess: (data) => {
            setCheckSuccess(true)
        },
        onError: (err: Error) => {
            setEnableAction(false)
        }
    })

    console.log('realcards', cards)
    const validateCards = useCallback(() => {
        console.log('validateCards', cards)
        if (cards.length === 3) {
            setEnableAction(true)
        } else {
            setEnableAction(false)
        }
    }, [cards, processingAction])

    useEffect(() =>{
        validateCards()
    }, [processingAction, cards, validateCards])

    const { write, error, isLoading, data }= useContractWrite(config)
    useEffect(() => {
        console.log('send reveal cards', checkSuccess, inProgress, cards, write)
        if (inProgress && checkSuccess && write) {
            write()
        }
    }, [checkSuccess, inProgress, write])

    useWaitForTransaction({
        hash: data?.hash,
        wait: data?.wait,
        onSuccess: (dataResult) => {
            toast.success(`🦄 Success: revealed cards -> ${dataResult.toString()}`, {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            setInProgress(false)
            setCheckSuccess(false)
            setProcessingAction(false)
        },
        onError: (error: Error) => {
            setInProgress(false)
            setCheckSuccess(false)
            setProcessingAction(false)
            toast.error(`🦄 Error playcard: ${error}`, {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });

        }
    })

    useEffect(() => {
        console.log('error?', error, errorToSign)
        if ((error || errorToSign)) {
            setGoToSpell(false)
            setInProgress(false)
            setProcessingAction(false)
            setCheckSuccess(false)
            toast.error(`🦄 Error: ${error ? error.message : errorToSign?.message}`, {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
        }
    }, [ error, errorToSign, setProcessingAction ])

    return (
        <>
        {
            <ActionButton clickCallback={() => {
                validateCards()
                if (cards.length === 3) {
                    setProcessingAction(true)
                    setInProgress(true)
                    onReveal()

                }
            }} text="Reveal Cards" />
        }
        </>
    )
}
