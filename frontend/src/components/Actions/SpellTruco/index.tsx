import { useState, useEffect } from "react"
import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite } from "wagmi"
import { ActionButton } from "../Button"
import { GAS_LIMIT_WRITE } from "../../Dashboard"

export const SpellTruco = ({match}: any) => {

    console.log("VAMO ESE MATCH", match)
    const [ goToSpell, setGoToSpell] = useState(false)
    const [ checkSpell, setCheckSpell ] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)

    const { config: spellTrucoConfig } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(["function spellTruco() public"]),
        functionName: "spellTruco",
        args: [],
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        // TODO refetch if change status game
        //enabled: goToSpell,
        onSuccess: (data) => {
            console.log('run spell truco TRUE', data)
            setEnableAction(true)
            //setGoToSpell(false)
        },
        onError: (err: Error) => {
            console.log('run spell truco FALSE', data)
            setEnableAction(false)
        }
    })

    const { write, error, isLoading, data}= useContractWrite(spellTrucoConfig)

    useEffect(() => {
        console.log('spell')
    }, [ isLoading, error, data ])

    return (
        <>
        {
            enableAction ?
                isLoading ? 
                    <p className="text-white">CARGANDO...</p>
                :
                    error ? 
                        <p>{error.toString()}</p>
                        :
                    <ActionButton clickCallback={() => {
                        setGoToSpell(true) 
                        write?.()
                    }} text="Spell Truco!" />
            : ""
        }
        </>
    )
}
