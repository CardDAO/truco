import { useState, useEffect } from "react"
import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead } from "wagmi"
import { ActionButton } from "../Button"

export const SpellTruco = (props) => {

    const [ goToSpell, setGoToSpell] = useState(false)
    const [ checkSpell, setCheckSpell ] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)

    const spellTruco = useContractRead({
        addressOrName: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // match
        contractInterface: new Interface(["function spellTruco() view returns (bool)"]),
        functionName: "spellTruco",
        args: [],
        enabled: goToSpell,
        onSuccess: (data) => {
            console.log('run spell truco', data)
            setGoToSpell(false)
        }
    })

    const checkSpellTruco = useContractRead({
        addressOrName: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // frontadapter
        contractInterface: new Interface(["function canSpellTruco(address) view returns (bool)"]),
        functionName: "canSpellTruco",
        args: ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"], // match
        enabled: checkSpell,
        onSuccess: (data) => {
            console.log('checked spell', data)
            setEnableAction(true)
        }
    })

    useEffect(() => {
        setCheckSpell(true)
    }, [])
    //const goToShuffling = (newGame: any, setNewGame:any, initShuffling:any, sendMessageAll:any) => {
    //    console.log('go to shuffle')
    //    let message : Move = initShuffling(newGame, setNewGame)
    //    sendMessageAll(message)
    //}

    return (
        <>
            enableAction ?
                <ActionButton onClick={() => { setGoToSpell(true) }} text="Spell Truco!" />
            : ""
        </>
    )
}
