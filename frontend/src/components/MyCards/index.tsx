import { useState } from "react"
import { Card } from "../Card"

export const MyCards = ({ cards, setCards }) => {
    return (
        <div>
            <Card onChangeAction={(e) => setCards((myCards: any) => { 
                myCards[0] = parseInt(e.target.value)
                return myCards
            })} />
            <Card onChangeAction={(e) => setCards((myCards: any) => { 
                myCards[1] = parseInt(e.target.value)
                return myCards
            })} />
            <Card onChangeAction={(e) => setCards((myCards: any) => { 
                myCards[2] = parseInt(e.target.value)
                return myCards
            })} />
        </div>
    )
}
