import { useState } from "react"
import { Card } from "../Card"

export const MyCards = ({ match, cards, setCards, setProcessingAction }) => {
    return (
        <div>
            <Card onChangeAction={(e) => setCards((myCards: any) => { 
                myCards[0] = parseInt(e.target.value)
                return myCards
            })} match={match} setProcessingAction={setProcessingAction} />
            <Card onChangeAction={(e) => setCards((myCards: any) => { 
                myCards[1] = parseInt(e.target.value)
                return myCards
            })} match={match} setProcessingAction={setProcessingAction} />
            <Card onChangeAction={(e) => setCards((myCards: any) => { 
                myCards[2] = parseInt(e.target.value)
                return myCards
            })} match={match} setProcessingAction={setProcessingAction} />
        </div>
    )
}
