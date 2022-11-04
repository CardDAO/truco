import { InitCommunication } from "./InitComunication"

export const Actions = (props) => {

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
