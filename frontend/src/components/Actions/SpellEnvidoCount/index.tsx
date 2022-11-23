import { useState, useEffect } from "react"
import { BigNumber, ethers } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite } from "wagmi"
import { ActionButton } from "../Button"
import { GAS_LIMIT_WRITE } from "../../Dashboard"

export const SpellEnvidoCount = ({match, processingAction, setProcessingAction, count}: any) => {

    const [ goToSpell, setGoToSpell] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)

    const { config, refetch } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(["function spellEnvidoCount(uint8 _points) public"]),
        functionName: "spellEnvidoCount",
        args: [ count ],
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        onSuccess: (data) => {
            console.log('can spell envido count TRUE', data)
            setEnableAction(true)
        },
        onError: (err: Error) => {
            console.log('can spell envido count FALSE', err)
            setEnableAction(false)
        }
    })

    const { write, error, isLoading, data }= useContractWrite(config)

    useEffect(() => {
        if (error && goToSpell) {
            setGoToSpell(false)
            setProcessingAction(false)
        }
    }, [ error, goToSpell ])

    useEffect(() => {
        refetch()
    }, [count])

    return (
        <>
        {
            enableAction ?
                    <ActionButton clickCallback={() => {
                        setGoToSpell(true) 
                        setProcessingAction(true)
                        write?.()
                    }} text="Envido Count!" />
            : ""
        }
        </>
    )
}
