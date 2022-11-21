import { Interface } from "ethers/lib/utils"
import { useEffect, useState } from "react"
import { useContractRead } from "wagmi"
import { AccountType, useAccountInformation } from "../../hooks/providers/Wagmi"
import { RevealCards } from "../Actions/RevealCards"
import { Card } from "../Card"
import { GraphicCard } from "../GraphicCard"

const getIndexCardFromEvent = (event) => {
    const value = parseInt(event.target.value)
    return !isNaN(value) && value > 0 && value < 40 ? value : 0 
}
export const MyCards = ({ match, cards, setCards, setProcessingAction, processingAction, usedContractCards, setUsedContractCards}) => {

    const { address } : AccountType = useAccountInformation()
    const { refetch: fetchUsedCards } = useContractRead({
       addressOrName: process.env.FRONT_MATCH_FACADE_ADDRESS as string,
       contractInterface: new Interface([
           "function getMyCardsInfo(address) public view returns (uint8[3] memory, uint8)"
       ]),
       functionName: 'getMyCardsInfo',
       args: [match],
       overrides: {
           from: address
       },
       onSuccess: (data) => {
           console.log('data from contract', data, data[0].length)
           if (data && data[0].length > 0) {
               setUsedContractCards(oldCards => [...data[0]])
           }
       },
       onError: (err: Error) => {
           console.log('get used contract cards',err)
       }
    })

    useEffect(() => {
        fetchUsedCards()
    }, [cards, processingAction,fetchUsedCards])

    return (
        <div className="flex flex-row">
            {
                usedContractCards.map((card, index) => {
                    if (card === 0) {
                        return <Card key={index} onChangeAction={(e) => setCards((myCards: any) => { 
                            myCards[index] = getIndexCardFromEvent(e) 
                            return myCards
                        })} match={match} setProcessingAction={setProcessingAction} />
                    } else {
                        return <GraphicCard cardIndex={card}/>
                    }
                })
            }
        </div>
    )
}
