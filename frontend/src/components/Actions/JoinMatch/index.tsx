import { useState, useEffect, useCallback } from "react"
import { BigNumber, ethers } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from "wagmi"
import { ActionButton } from "../Button"
import { GAS_LIMIT_WRITE } from "../../Dashboard"
import { ToastContainer, toast } from 'react-toastify';
import { useCurrentBet } from "../../../hooks/match/GetCurrentBet"

export const JoinMatch = ({match, processingAction, setProcessingAction, setJoined}: any) => {

    const [ enableAction, setEnableAction ] = useState(true)
    const [allowanceClick, setAllowanceClick] = useState(false)
    const [ inProgress , setInProgress ] = useState(false)
    const {currentBetValue} = useCurrentBet(match)
    const [ betValue, setBetValue ] = useState(0)

    useEffect(() => {
        if((!betValue || betValue <= 0) && currentBetValue && currentBetValue > 0) {
            setBetValue(currentBetValue)
        }
    }, [ currentBetValue ])
     
    const finishProcess = useCallback(() => {
        setProcessingAction(false)
        setInProgress(false)
    }, [])

    const initJoin = async () => {
        setProcessingAction(true)
        setInProgress(true)
        try {
            await approveTrucoins?.()
        } catch {
            setProcessingAction(false)
            setInProgress(false)
        }
    }
    useEffect(() => {
        if (betValue > 0) {
           setAllowanceClick(true) 
        } else {
           setAllowanceClick(false) 
        }
    }, [betValue])



    // APPROVE TRUCOIN BUTTON
    const { config: configApprove } = usePrepareContractWrite({
        addressOrName: process.env.TRUCOIN_ADDRESS as string, // trucoin
        contractInterface: new Interface(["function approve(address, uint) public returns (bool)"]),
        functionName: "approve",
        args: [
            match, // match (join player)
            betValue && betValue >= 0 ? betValue : 0
        ],
        //enabled: allowanceClick,
        onSuccess: (data: any) => {
            if (inProgress) { 
                finishProcess()
            }
        },
        onError: (error: Error) => {
            if (inProgress){ 
                finishProcess()
            }
        },
    })
    const { error: approveError, data: transactionApproveTrucoins, writeAsync: approveTrucoins } = useContractWrite(configApprove)
    // JOIN BUTTON
    const { config: joinConfig, refetch: refetchJoin } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(["function join() public"]),
        functionName: "join",
        args: [],
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        onSuccess: (data) => {
            //setGoToSpell(false)
        },
        onError: (err: Error) => {
            if (inProgress) { 
                finishProcess()
            }
        }
    })
    const { error: joinError, isLoading, data: joinTransaction, write: joinToGame }= useContractWrite(joinConfig)

    useWaitForTransaction({
        hash: transactionApproveTrucoins?.hash,
        onSuccess: async (data) => {
            if (data?.status === 1) {
                console.log('data is 1', data)
                const tryJoinResult = await refetchJoin({throwOnError: true, cancelRefetch: false})
                console.log('try 1', tryJoinResult)
                if (tryJoinResult.status === "success"){
                    console.log('call joint')
                    joinToGame?.()
                } else {
                    console.log('try join is not success', tryJoinResult.status)
                    if (inProgress) { 
                        finishProcess()
                    }
                }
            } else {
                console.log('approve trucoins status wrong', data)
                if (inProgress) { 
                    finishProcess()
                }
            }
        },
        onError: (e: Error) => {
            if (inProgress) { 
                finishProcess()
            }
            //refetchJoin({throwOnError: true, cancelRefetch: false})
        },
        wait: transactionApproveTrucoins?.wait
    })

    useWaitForTransaction({
        hash: joinTransaction?.hash,
        onSuccess: (data) => {
            // TODO SET JOINED IF STATUS === 1
            if (data?.status === 1) {
                setJoined(true)
                toast.success(`🦄 Joined to match`, {
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
            if (inProgress) { 
                finishProcess()
            }
        },
        onError: () => {
            if (inProgress) { 
                finishProcess()
            }
        }
    })

    useEffect(() => {
        if (approveError || joinError) {

            toast.error(`🦄 Error: ${approveError ? approveError?.message : joinError?.message}`, {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });

            finishProcess()
        }

    }, [approveError, joinError])

    return (
        <>
        {
            enableAction ?
                <>
                    <input
                        value={betValue}
                        onChange={(event) => {
                            setBetValue(event.target.value)
                        }}
                        type="number"
                        placeholder="Bet value for the game (Trucoins without decimal)"
                        className="block p-2 pl-5 w-full text-sm rounded-lg border bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-sm text-gray-400">Match current bet: {currentBetValue}</p>
                    <ActionButton clickCallback={() => {
                            if (allowanceClick) {
                                initJoin()
                            }
                        }} text={
                        processingAction ?
                        <svg aria-hidden="true" role="status" className="inline w-4 h-4 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                        </svg>:


                        "Allowance Trucoin and Join" }
                        enabled={allowanceClick}
                    />
                </>
            : ""
        }
        </>
    )
}
