import { useEffect, useState, useCallback, KeyboardEventHandler} from 'react'
import { useTruco } from "../../engine/truco/useTruco"
import { Dashboard } from "../Dashboard"

export const Game = () => {

    const [messageInput, setMessageInput] = useState("")
    const [playerNumber, setPlayerNumber] = useState(1)
    const { 
        address,
        isConnected,
        clickConnectToGame,
        inSession,
        peers,
        sendMessageAll,
        isLoading,
        errorSendMessage,
        messages,
        requestPeers,
        goToShuffling
    } = useTruco()


    return (
        <>
            {
                !isConnected ?
                    <h1 className="text-white text-4xl text-center align-middle">Connect wallet</h1>
                    :
                    !inSession ? 
                    <div className="text-center align-middle">
                        <h2 className="text-white text-xl py-5 text-center align-middle">Start game {address?.toString()}</h2>
                        <input type="text" onChange={() => setPlayerNumber(playerNumber)}/>
                        <button type="button" className="text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:focus:ring-cyan-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2" onClick={() => { clickConnectToGame(playerNumber) }}>Join game</button>
                    </div>
                    :
                        <Dashboard
                            peers={peers}
                            messages={messages}
                            messageInput={messageInput}
                            setMessageInput={setMessageInput}
                            sendMessageAll={sendMessageAll}
                            isLoading={isLoading}
                            errorSendMessage={errorSendMessage}
                            requestPeers={requestPeers}
                            goToShuffling={goToShuffling}
                        />
            }
        </>
    )
}
