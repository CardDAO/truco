import { useState } from "react"
import { Card } from "../Card"

const getIndexCardFromEvent = (event) => {
    const value = parseInt(event.target.value)
    return !isNaN(value) && value > 0 && value < 40 ? value : 0 
}
export const MyCards = ({ match, cards, setCards, setProcessingAction }) => {
    return (
        <div className="flex flex-row">
            <Card onChangeAction={(e) => setCards((myCards: any) => { 
                myCards[0] = getIndexCardFromEvent(e) 
                return myCards
            })} match={match} setProcessingAction={setProcessingAction} />
            <Card onChangeAction={(e) => setCards((myCards: any) => { 
                myCards[1] = getIndexCardFromEvent(e) 
                return myCards
            })} match={match} setProcessingAction={setProcessingAction} />
            <Card onChangeAction={(e) => setCards((myCards: any) => { 
                myCards[2] = getIndexCardFromEvent(e) 
                return myCards
            })} match={match} setProcessingAction={setProcessingAction} />
        </div>
    )
}
