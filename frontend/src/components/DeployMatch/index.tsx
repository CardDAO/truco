import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useState, useEffect, useCallback } from "react"
import { useContractEvent, useContractWrite, usePrepareContractWrite } from "wagmi"
import { ActionButton } from "../Actions/Button"

export const DeployMatch = () => {
    const [deployClick, setDeployClick] = useState(false)
    const [allowanceClick, setAllowanceClick] = useState(false)

    const {config: configApprove} = usePrepareContractWrite({
        addressOrName: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // trucoin
        contractInterface: new Interface(["function approve(address, uint) public returns (bool)"]),
        functionName: "approve",
        args: [
            "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", // match factory
            10000
        ],
        enabled: allowanceClick,
        onSuccess: (data: any) => {
            setAllowanceClick(false)
            console.log('run spell truco', data)
        },
        onError: (error: Error) => {
            console.log('deploy match calc', error)
            setAllowanceClick(false)
        }
    })

    const { config: configDeploy } = usePrepareContractWrite({
        addressOrName: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", // match factory
        contractInterface: new Interface(["function newMatch(uint) public returns (address)"]),
        functionName: "newMatch",
        args: [BigNumber.from(10000)],
        enabled: deployClick,
        onSuccess: (data: any) => {
            console.log('run spell truco', data)
            setDeployClick(false)
        },
        onError: (error: Error) => {
            console.log('deploy match calc', error)
            setDeployClick(false)
        }
    })

    const {data: dataDeploy, error: errorApprove, write: contractDeploy} = useContractWrite(configDeploy)
    const {data: dataApprove, write: approveTrucoins} = useContractWrite(configApprove)

    useContractEvent({
        addressOrName: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", // match factory
        contractInterface: new Interface([
            'event TrucoMatchCreated(address, address, uint256)'
        ]),
        eventName: 'TrucoMatchCreated',
        listener: (event) => console.log('daleeee macher',event),
    })
    const viewResponseDeploy = useCallback(async () => {
        await dataDeploy?.wait()
        console.log(dataDeploy)
    }, [dataDeploy])

    const viewResponseApprove = useCallback(async () => {
        await dataApprove?.wait()
        console.log(dataApprove)
    }, [dataApprove])

    useEffect(() => {
        if (dataApprove) {
            viewResponseApprove()
            console.log('response', dataApprove)
        }

    }, [dataApprove, viewResponseApprove])

    useEffect(() => {
        if (dataDeploy) {
            viewResponseDeploy()
            console.log('response', dataDeploy)
        }

    }, [dataDeploy, viewResponseDeploy])
    
    return (
        <div>
            <ActionButton clickCallback={() => {
                console.log('CLICK ALLOWANCE')
                setAllowanceClick(true)
                approveTrucoins?.()
            }} text="Allowance Trucoin" />

            <ActionButton clickCallback={ () => {
                console.log('llamar a write')
                setDeployClick(true)
                contractDeploy?.()
            }} text="Deploy new Match" />

            <p> {errorApprove}</p>
        </div>
    )
}
