import { useState, useEffect } from "react"
import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite } from "wagmi"
import { ActionButton } from "../Button"
import { GAS_LIMIT_WRITE } from "../../Dashboard"

export const SpellEnvido = ({match, processingAction, setProcessingAction}: any) => {

    const [ goToSpell, setGoToSpell] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)

    const { config: spellTrucoConfig } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(["function spellEnvido() public"]),
        functionName: "spellTruco",
        args: [],
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        onSuccess: (data) => {
            console.log('can spell envido TRUE', data)
            setEnableAction(true)
        },
        onError: (err: Error) => {
            console.log('can spell envido FALSE', data)
            setEnableAction(false)
        }
    })

    const { write, error, isLoading, data }= useContractWrite(spellTrucoConfig)

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
                    }} text="Spell Envido!" />
            : ""
        }
        </>
    )
}
