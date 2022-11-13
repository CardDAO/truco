import { useState, useEffect } from "react"
import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from "wagmi"
import { ActionButton } from "../Button"

export const JoinMatch = ({match}: any) => {

    const [ enableAction, setEnableAction ] = useState(false)
    const [allowanceClick, setAllowanceClick] = useState(false)

    // APPROVE TRUCOIN BUTTON
    const {config: configApprove, refetch} = usePrepareContractWrite({
        addressOrName: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // trucoin
        contractInterface: new Interface(["function approve(address, uint) public returns (bool)"]),
        functionName: "approve",
        args: [
            match, // match (join player)
            10000
        ],
        enabled: allowanceClick,
        onSuccess: (data: any) => {
            setAllowanceClick(false)
            console.log('approve trucoins for join', data)
        },
        onError: (error: Error) => {
            console.log('error approve trucoin', error)
            setAllowanceClick(false)
        }
    })
    const {status: statusApprove, data: dataApprove, write: approveTrucoins} = useContractWrite(configApprove)
    const [waitTransactionApprove, setWaitTransactionApprove] = useState(false)
    useWaitForTransaction({
        hash: dataApprove?.hash,
        //wait: dataApprove?.wait,
        //enabled: waitTransactionApprove,
        onSuccess: async (data) => {
            console.log('finish approve for join', data, data?.status === 1 ? "OK" : "REVERT")
            //setEnableAction(true)
            setWaitTransactionApprove(true)
            refetchJoin({throwOnError: true, cancelRefetch: false})
        },
        onError: () => {
            console.log('error join')
            //refetchJoin({throwOnError: true, cancelRefetch: false})
        }
    })

    //useEffect(() => {
    //    if (dataApprove && statusApprove === 'loading') {
    //        console.log('set approve, waiting transaction enable')
    //        setWaitTransactionApprove(true)
    //    }
    //    //setCheckSpell(true)
    //}, [ dataApprove, statusApprove ])

    // JOIN BUTTON
    const { config: joinConfig, refetch: refetchJoin } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(["function join() public"]),
        functionName: "join",
        args: [],
        // TODO refetch if change status game
        onSuccess: (data) => {
            console.log('test join TRUE -> show', data, waitTransaction)
            if (waitTransactionApprove)
                setEnableAction(true)
            //setGoToSpell(false)
        },
        onError: (err: Error) => {
            console.log('test join FALSE -> hide', data)
            setEnableAction(false)
        }
    })

    const { write, error, isLoading, data}= useContractWrite(joinConfig)

    const [waitTransaction, setWaitTransaction] = useState(false)
    const waitForTransaction = useWaitForTransaction({
        hash: data?.hash,
        wait: data?.wait,
        enabled: waitTransaction,
        onSuccess: (data) => {
            console.log('finish joined', data)
        }
    })

    useEffect(() => {
        if (data) {
            setWaitTransaction(true)
        }
        console.log('contract', isLoading, error, data)
        //setCheckSpell(true)
    }, [ isLoading, error, data ])

    return (
        <>
        {
            enableAction ?
                isLoading ? 
                    <p className="text-white">CARGANDO...</p>
                :
                    error ? 
                        <p>{error?.toString()}</p>
                        :
                        <ActionButton clickCallback={() => {
                            write?.()
                        }} text="Join" />
            : ""
        }
            <ActionButton clickCallback={() => {
                setAllowanceClick(true)
                approveTrucoins?.()
            }} text="Join Allowance Trucoin" />
        </>
    )
}
