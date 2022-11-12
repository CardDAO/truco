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
        addressOrName: "x5FC8d32690cc91D4c39d9d3abcBD16989F875707", // frontadapter
        contractInterface: new Interface(["function canSpellTruco(address) view returns (bool)"]),
        functionName: "canSpellTruco",
        args: ["0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"], // match
        enabled: checkSpell,
        onSuccess: (data) => {
            console.log('checked spell', data)
            setEnableAction(true)
        }
    })

    useEffect(() => {
        console.log('spell')
        setCheckSpell(true)
    }, [])
    //const goToShuffling = (newGame: any, setNewGame:any, initShuffling:any, sendMessageAll:any) => {
    //    console.log('go to shuffle')
    //    let message : Move = initShuffling(newGame, setNewGame)
    //    sendMessageAll(message)
    //}

    return (
        <>
        {
            enableAction ?
            <ActionButton onClick={() => { setGoToSpell(true) }} text="Spell Truco!" />
            : ""
        }
        </>
    )
}
