import { useEffect } from "react"
import { InitCommunication } from "./InitComunication"

export const Actions = (props) => {

    useEffect(() => {
        props.setProcessingAction(true)
        props.setProcessingAction(false)
    }, [props.playerTurn, props.currentChallenge])

    return (
        <>
            {props.children}
        </>
    )
}
