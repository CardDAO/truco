import { useState, useEffect, useCallback } from "react"
import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from "wagmi"
import { ActionButton } from "../Button"
import { GAS_LIMIT_WRITE } from "../../Dashboard"

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
            console.log('approve trucoins for join', data, inProgress)
            if (inProgress) { 
                finishProcess()
            }
        },
        onError: (error: Error) => {
            console.log('error approve trucoin', error)
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
            console.log('can join')
            //setGoToSpell(false)
        },
        onError: (err: Error) => {
            console.log('errorrrr')
            console.log('test join FALSE -> hide', err)
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
            console.log('finsih')
            finishProcess()
        }
        console.log('approve or algo error', approveError, joinError)

    }, [approveError, joinError])

    return (
        <>
        {
            joinError ? 
            <p>{joinError?.message}</p>
            :
            ""
        }
        {
            enableAction ?
                    <ActionButton clickCallback={() => {
                        initJoin()
                    }} text="Join Allowance Trucoin" />
            : ""
        }
        </>
    )
}
