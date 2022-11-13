import { useState, useEffect } from "react"
import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite } from "wagmi"
import { ActionButton } from "../Button"

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

    //const checkSpellTruco = useContractRead({
    //    addressOrName: "x5FC8d32690cc91D4c39d9d3abcBD16989F875707", // frontadapter
    //    contractInterface: new Interface(["function canSpellTruco(address) view returns (bool)"]),
    //    functionName: "canSpellTruco",
    //    args: ["0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"], // match
    //    enabled: checkSpell,
    //    onSuccess: (data) => {
    //        console.log('checked spell', data)
    //        setEnableAction(true)
    //    }
    //})

    useEffect(() => {
        console.log('spell')
        //setCheckSpell(true)
    }, [ isLoading, error, data ])
    //const goToShuffling = (newGame: any, setNewGame:any, initShuffling:any, sendMessageAll:any) => {
    //    console.log('go to shuffle')
    //    let message : Move = initShuffling(newGame, setNewGame)
    //    sendMessageAll(message)
    //}

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
