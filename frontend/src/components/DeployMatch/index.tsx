import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useState, useEffect, useCallback } from "react"
import { useContractEvent, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from "wagmi"
import { ActionButton } from "../Actions/Button"

const TRUCOMATCH_FACTORY: string = process.env.TRUCOMATCH_FACTORY_ADDRESS as string

export const DeployMatch = ({ processingAction, setProcessingAction }) => {
    const [enableAction, setEnableAction] = useState(false)
    const [inProgress, setInProgress] = useState(false)
    const [error, setError] = useState("")

    const finishProcess = useCallback(() => {
        setProcessingAction(false)
        setInProgress(false)
        setEnableAction(true)
    }, [])

    const {config: configApprove} = usePrepareContractWrite({
        addressOrName: process.env.TRUCOIN_ADDRESS as string, // trucoin
        contractInterface: new Interface(["function approve(address, uint) public returns (bool)"]),
        functionName: "approve",
        args: [
            TRUCOMATCH_FACTORY, // match factory
            10000
        ],
        onSuccess: (data: any) => {
            if (!inProgress) {
                setError("")
                setEnableAction(true)
            }
            console.log('can deploy contract', data)
        },
        onError: (error: Error) => {
            console.log('cant deploy contract', error)
            setEnableAction(false)
        }
    })

    const { config: configDeploy, refetch: refetchDeploy} = usePrepareContractWrite({
        addressOrName: TRUCOMATCH_FACTORY, // match factory
        contractInterface: new Interface(["function newMatch(uint) public returns (address)"]),
        functionName: "newMatch",
        args: [BigNumber.from(10000)],
        overrides: {
            gasLimit: process.env.GAS_LIMIT_WRITE
        },
        onSuccess: (data: any) => {
            //console.log('run spell truco', data)
        },
        onError: (error: Error) => {
            //console.log('deploy match calc', error)
        }
    })

    const {data: dataDeploy, error: deployError, write: contractDeploy } = useContractWrite(configDeploy)
    const {data: dataApprove, error: approveError, write: approveTrucoins} = useContractWrite(configApprove)

    useWaitForTransaction({
        hash: dataApprove?.hash,
        onSuccess: async (data) => {
            if (data?.status === 1) {
                const tryDeploy = await refetchDeploy({throwOnError: true, cancelRefetch: false})
                if (tryDeploy.status === "success"){
                    setError("")
                    contractDeploy?.()
                } else {
                    if (inProgress) {
                        setError("Check transact deploy failed")
                        finishProcess()
                    }
                }
            } else {
                if (inProgress) {
                    setError("Check transact deploy failed")
                    finishProcess()
                }
            }
        },
        onError: (e: Error) => {
            if (inProgress) { 
                setError("Transaction approve failed")
                finishProcess()
            }
        },
        wait: dataApprove?.wait
    })

    useContractEvent({
        addressOrName: TRUCOMATCH_FACTORY, // match factory
        contractInterface: new Interface([
            'event TrucoMatchCreated(address, address, uint256)'
        ]),
        eventName: 'TrucoMatchCreated',
        listener: (event) => {
            if (inProgress) {
                finishProcess()
            }
            setError("")
            console.log('truco match created', event)
        },
    })

    useEffect(() => {
        if (approveError || deployError) {
            setError("Error TX")
            finishProcess()
        }
        console.log('approve or deploy error', approveError, deployError)

    }, [approveError, deployError])

    
    return (
        <div>
            {
                inProgress ?
                <div className="text-center my-2">
                    <div role="status">
                        <svg aria-hidden="true" className="inline mr-2 w-8 h-8 text-gray-600 animate-spin fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                        </svg>
                    <span className="sr-only">Loading...</span>
                    </div>
                </div>
                : ""
            }
            {
                enableAction ?
                    <ActionButton clickCallback={ () => {
                    //setDeployClick(true)
                    if (!inProgress) {
                        setInProgress(true)
                        approveTrucoins?.()
                        setError("")
                    }
                    //contractDeploy?.()
                }} text="Deploy new Match" />
                : ""
            }
            <p className="text-red-500 text-sm"> {error}</p>
        </div>
    )
}
