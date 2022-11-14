import { useState, useEffect } from "react"
import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite } from "wagmi"
import { ActionButton } from "../Button"
import { GAS_LIMIT_WRITE } from "../../Dashboard"

export const AcceptChallengeForRaising = ({match, processingAction, setProcessingAction}: any) => {

    const [ goToSpell, setGoToSpell] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)

    const { config } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(["function acceptChallengeForRaising() public"]),
        functionName: "acceptChallengeForRaising",
        args: [],
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        onSuccess: (data) => {
            console.log('can acceptChalleng TRUE', data)
            setEnableAction(true)
        },
        onError: (err: Error) => {
            console.log('can acceptChalleng FALSE', err)
            setEnableAction(false)
        }
    })

    const { write, error, isLoading, data }= useContractWrite(config)

    useEffect(() => {
        console.log('spell')
        if (error && goToSpell) {
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
                    }} text="AcceptChallengeForRaising!" />
            : ""
        }
        </>
    )
}
