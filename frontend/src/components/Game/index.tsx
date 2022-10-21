import { useState } from 'react'
import P2PT from "p2pt"
import {  useAccountInformation, AccountType, useCreateRoom, Player, Message, sendMessage } from '../../hooks/providers/Wagmi'

export const Game = () => {

    const { address, isConnected } : AccountType = useAccountInformation()
    const [ players, setPlayers ] = useState<Player[]>([])

    const p2pt = useCreateRoom(
        (newPlayer: Player) => {
            console.log('player', newPlayer)
            setPlayers(currentPlayers => [...currentPlayers, newPlayer])
        },
        (message: Message) => {
            console.log('recibí', message)
        }
    )

    const sendMessageClick = () => {
        console.log(p2pt)
        sendMessage(
            p2pt as P2PT<Message>,
            {peer: players[0], message: {message: "Holis"}},
            (message: Message) => {
                console.log('respuesta', message)
            }
        )
    }
    return (
        <>
            {
                isConnected ? 
                    <div>
                        <h1 className="text-white text-4xl text-center align-middle">Start game {address}</h1>
                        <button onClick={() => {sendMessageClick()}}>Send message</button>
                    </div>
                    :
                    <h1 className="text-white text-4xl text-center align-middle">Connect wallet</h1>
            }
        </>
    )
}
