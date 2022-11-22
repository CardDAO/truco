import { useEffect } from "react"
import { InitCommunication } from "./InitComunication"

export const Actions = (props) => {

    useEffect(() => {
        props.setProcessingAction(true)
        props.setProcessingAction(false)
    }, [props.playerTurn, props.currentChallenge])
    //const goToShuffling = (newGame: any, setNewGame:any, initShuffling:any, sendMessageAll:any) => {
    //    console.log('go to shuffle')
    //    let message : Move = initShuffling(newGame, setNewGame)
    //    sendMessageAll(message)
    //}

    return (
        <>
            {props.children}
        </>
    )
}
