import { useState, useEffect, useCallback } from "react"
import { BigNumber, ethers } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from "wagmi"
import { ActionButton } from "../Button"
import { GAS_LIMIT_WRITE } from "../../Dashboard"
import { ToastContainer, toast } from 'react-toastify';

export const JoinMatch = ({match, processingAction, setProcessingAction, setJoined}: any) => {

    const [ enableAction, setEnableAction ] = useState(true)
    const [allowanceClick, setAllowanceClick] = useState(false)
    const [ inProgress , setInProgress ] = useState(false)

    const finishProcess = useCallback(() => {
        console.log('finish process', inProgress, allowanceClick)
        setProcessingAction(false)
        setInProgress(false)
    }, [])

    const initJoin = async () => {

        setProcessingAction(true)
        setInProgress(true)
        setAllowanceClick(true)
        try {
            await approveTrucoins?.()
        } catch {
            setProcessingAction(false)
            setInProgress(false)
        }
    }


    // APPROVE TRUCOIN BUTTON
    const { config: configApprove } = usePrepareContractWrite({
        addressOrName: process.env.TRUCOIN_ADDRESS as string, // trucoin
        contractInterface: new Interface(["function approve(address, uint) public returns (bool)"]),
        functionName: "approve",
        args: [
            match, // match (join player)
            10000
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
        onSettled(data, error) {
          console.log('Settled', { data, error })
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
            console.log('errorrrr 2')
            console.log('error join', e)
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
            console.log('aca paso')
            if (data?.status === 1) {
                setJoined(true)
            }
            if (inProgress) { 
                finishProcess()
            }
        },
        onError: () => {
            console.log('erroraso')
            if (inProgress) { 
                finishProcess()
            }
        }
    })

    //useEffect(() => {
    //    if (processingAction) {
    //        setEnableAction(false)
    //    } else {
    //        setEnableAction(true)
    //    }
    //}, [processingAction])

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
                    <ActionButton clickCallback={() => {
                        initJoin()
                    }} text="Allowance Trucoin and Join" />
            : ""
        }
        </>
    )
}
