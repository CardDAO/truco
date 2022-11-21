import { BigNumber } from "ethers"
import { arrayify, Interface } from "ethers/lib/utils"
import { useCallback, useEffect, useState } from "react"
import { useContractRead, useContractWrite, usePrepareContractWrite, useSignMessage, useWaitForTransaction } from "wagmi"
import { CASTILLAN_CARDS } from "../../assets/castillan-cards"
import { AccountType, useAccountInformation } from "../../hooks/providers/Wagmi"
import { GAS_LIMIT_WRITE } from "../Dashboard"
import { toast } from 'react-toastify';
import { GraphicCard } from "../GraphicCard"

export const Card = ({ match, onChangeAction, setProcessingAction }) => {

    const [ cleanCardIndex, setCleanCardIndex ] = useState(-1)
    const [ signature, setSignature ] = useState("")
    const { address } : AccountType = useAccountInformation()
    const [ inProgress, setInProgress ] = useState(false)
    const [ checkSuccess, setCheckSuccess ] = useState(false)

    const changeAndCallback = (event: any) => {
        setCleanCardIndex(parseInt(event.target.value) >=0 ? parseInt(event.target.value) : 0)
        onChangeAction(event)
    }

    const [ goToSpell, setGoToSpell] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)


    const validateCard = useCallback(() => {
        if (cleanCardIndex > 0 && cleanCardIndex <= 40) {
            setEnableAction(true)
        } else {
            setEnableAction(false)
        }
    }, [cleanCardIndex])

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
            setProcessingAction(false)
            setInProgress(false)
        }
    })
    const onWrite = () => {
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

    const { refetch: getHashToSign } = useContractRead({
        addressOrName: match,
        contractInterface: new Interface(["function getCardProofToForSigning(address, uint8[]) public view returns (bytes32)"]),
        functionName: "getCardProofToForSigning",
        enabled: inProgress,
        args: [address, [ BigNumber.from(cleanCardIndex)]],
        overrides: {
            from: address as string
        },
        onSuccess: (data) => {
        },
        onError: (error: Error) => {
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

    const { config } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(["function playCard(uint8, bytes) public"]),
        functionName: "playCard",
        enabled: goToSpell,
        args: [ BigNumber.from(cleanCardIndex.toString()), signature],
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        onSuccess: (data) => {
            console.log(`can playCard (TRUE)`, data)
            //validateCard()
            setCheckSuccess(true)
        },
        onError: (err: Error) => {
            console.log(`can't playCard (FALSE)`, err)
            setEnableAction(false)
        }
    })

    const { write, error, isLoading, data }= useContractWrite(config)
    useEffect(() => {
        if (inProgress && checkSuccess && write) {
            write()
        }

    }, [checkSuccess, inProgress, write])

    useWaitForTransaction({
        hash: data?.hash,
        wait: data?.wait,
        onSuccess: (dataResult) => {
            toast.success(`🦄 Success: PlayCard`, {
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
            setInProgress(false)
            setProcessingAction(false)
            setCheckSuccess(false)
        },
        onError: (error: Error) => {
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
            setGoToSpell(false)
            setInProgress(false)
            setProcessingAction(false)
            setCheckSuccess(false)
        }
    })

    useEffect(() => {
        validateCard()
    }, [validateCard])

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
        <div className="relative flex-nowrap">
            {
                cleanCardIndex > 0 ?
                    <button onClick={() => {
                        setProcessingAction(true)
                        setInProgress(true)
                        onWrite()
                }} className={enableAction ? "hover:shadow-lg hover:shadow-cyan-500/50": ""}>
                        <GraphicCard cardIndex={cleanCardIndex} />
                    </button>
                    :""
            }
            <input onChange={changeAndCallback} type="text" className="block p-2 pl-5 w-20 text-sm rounded-lg border bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500" />
        </div>
    )
}
