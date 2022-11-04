import { Chat } from "../Chat"
import { Actions } from "../Actions"
import './index.css'
import { useP2PT } from "../../engine/truco/P2PT"
import { verifyMessage } from 'ethers/lib/utils'
import { useCallback, useEffect } from "react"
import { createContext } from "react"
import { StateEnum } from "../../hooks/enums"
import { createConfig, createPlayer, createDeck } from 'mental-poker'
import { InitCommunication } from "../Actions/InitComunication"
import { useSignMessage } from "wagmi"
import {useProcessMessage} from '../../engine/truco/ProcessMessages'

const GAME_CONFIG = createConfig(40)

export const GameContext = createContext()

export const Dashboard = ({ address, inSession }: any) => {
    const { p2pt, peers, messages, sendToPeers, latestNonce } = useP2PT(inSession, 'UNIQUE_KEY_GAME')
    // verify before to send
    const { data, error: errorSendMessage, isLoading, signMessage } = useSignMessage({
        onSuccess(signature: any, variables: any) {
            sendToPeers(address, signature, variables)
            //setState(gameState, setGameState, messageSourceSigned.message.topic, messageSourceSigned.message.data)
        }
    })


    useEffect(() => {
        let interval = setInterval(() => {
            if (p2pt.current && peers.length === 0) {
                p2pt.current.requestMorePeers()
            }
        }, 1000)
        return () => {clearInterval(interval)}
    }, [p2pt, peers])

    useProcessMessage(messages)

    // init
    useEffect(() => {
        if (peers) {
            GameContext.peers = peers
        }
    }, [])

    //<Chat
    //    peers={peers}
    //    messages={messages}
    //    messageInput={messageInput}
    //    setMessageInput={setMessageInput}
    //    sendMessageAll={sendToPeers}
    //    isLoading={isLoading}
    //    errorSendMessage={errorSendMessage}
    ///>

    return (
        <div className="Dashboard-Grid">
            <div className="Chat-Column">
            </div>
            <div className="Game-View">
                <GameContext.Provider value={{
                    self: createPlayer(GAME_CONFIG),
                    opponent: [],
                    sharedCardCodewordFragments: [],
                    state: StateEnum.WAITING_PLAYERS,
                }}>
                    <div className="h-full m-2 grid grid-cols-1 grid-rows-7 text-gray-200 gap-3 justify-center h-min-50">
                        <div className="border-dashed border-2 border-orange-700 justify-center">
                            Opponent
                        </div>
                        <div className="border-dashed border-2 row-span-3 bg-slate-50/50 border-emerald-50">
                            Played cards
                        </div>
                        <div className="border-dashed border-2 row-span-2 border-lime-700">
                            My cards
                        </div>
                        <div className="border-dashed border-2 border-gray-600">
                            <Actions>
                                <InitCommunication signMessage={signMessage} latestNonce={latestNonce} />
                            </Actions>
                        </div>
                    </div>
                </GameContext.Provider>
            </div>
        </div>
    )
}
