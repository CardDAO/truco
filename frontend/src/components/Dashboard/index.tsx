import { Chat } from "../Chat"
import { Actions } from "../Actions"
import './index.css'
import { useP2PT } from "../../engine/truco/P2PT"
import { verifyMessage } from 'ethers/lib/utils'
import { useState, useCallback, useEffect } from "react"
import { createContext } from "react"
import { StateEnum } from "../../hooks/enums"
import { createPlayer, createDeck } from 'mental-poker'
import { InitCommunication, sayHelloAll } from "../Actions/InitComunication"
import { useSignMessage } from "wagmi"
import { GAME_CONFIG } from "../../engine/truco/GameConfig"
import {useProcessMessage} from '../../engine/truco/ProcessMessages'
import { firstShuffling } from "../Actions/FirstShuffling"
import { consecutiveShuffling } from "../Actions/ConsecutiveShuffling"
import { initEncryptDeck } from "../Actions/InitEncryptDeck"
import { dealCards } from "../Actions/DealCards"




const arrayToBuffer = (array: any[]) => array.map(simpleObject => Buffer.from(simpleObject.data))


export const Dashboard = ({ address, inSession }: any) => {
    // TODO add hasPeers -> allow actions
    const { p2pt, peers, messages, sendToPeers, latestNonce } = useP2PT(inSession, 'UNIQUE_KEY_GAME')
    const [ sharedCodewordFragment, setSharedCodewordFragments ] = useState([])
    const [ opponents, setOpponents ] = useState({})
    const [ state, setState ] = useState(StateEnum.WAITING_PLAYERS)
    const [ cardCodewords, setCardCodewords ] = useState([])
    const [ deck, setDeck ] = useState([] as Buffer[])
    const [ myCards, setMyCards ] = useState({} as AssignedCards)
    const [ usedCardsIndexes, setUsedCardsIndexes ] = useState([] as number[])
    const [ selfPlayer, setSelfPlayer ] = useState(createPlayer(GAME_CONFIG))
    
    // verify before to send
    const { data, error: errorSendMessage, isLoading, signMessage } = useSignMessage({
        onSuccess(signature: any, variables: any) {
            sendToPeers(address, signature, variables)
            //setState(gameState, setGameState, messageSourceSigned.message.topic, messageSourceSigned.message.data)
        }
    })

    useEffect(() => {
        let interval = setInterval(() => {
            if (p2pt.current && peers?.length === 0) {
                p2pt.current.requestMorePeers()
            }
        }, 1000)
        return () => {clearInterval(interval)}
    }, [p2pt, peers])

    useProcessMessage({
        messages, 
        onNewMessage: useCallback(async (newMessage: MessageType) => {
            const signer = verifyMessage(JSON.stringify(newMessage.message), newMessage.signature)
            if (signer === address)
                return
            switch (newMessage.message.topic) {
                case 'hello':
                    if (newMessage.message.data?.cardCodewordFragments) {
                        if (opponents[signer] === undefined) {
                            const newOpponents = opponents
                            newOpponents[signer] = { cardCodewordFragments: arrayToBuffer(newMessage.message.data.cardCodewordFragments)  }
                            setOpponents(newOpponents)
                            setSharedCodewordFragments((oldSharedCodewordsList: any) => [...oldSharedCodewordsList, newMessage.message.data.cardCodewordFragments!!])
                            setState(StateEnum.CREATING_DECK)

                            if (cardCodewords.length === 0) { // generate only one deck
                                setCardCodewords(
                                    createDeck([selfPlayer.cardCodewordFragments, newOpponents[signer].cardCodewordFragments])
                                )
                                if (state === StateEnum.WAITING_PLAYERS) {
                                    setState(StateEnum.SECOND_SHUFFLING_WAITING_OTHERS)
                                    await sayHelloAll(signMessage, latestNonce, selfPlayer, state)
                                }
                                if (state === StateEnum.SHOULD_INIT_SHUFFLING) {
                                   setState(StateEnum.SHOULD_INIT_SECOND_SHUFFLING_ROUND)
                                }
                            }
                        }
                    }
                    break
                case 'init_shuffling':
                    if (state === StateEnum.SECOND_SHUFFLING_WAITING_OTHERS) {
                        console.log('shuffling p2')
                       consecutiveShuffling(deck, arrayToBuffer(newMessage.message.data?.deck), selfPlayer, latestNonce, signMessage) 
                    }
                    console.log('comenzar el shuffling', newMessage)
                    break
                case 'consecutive_shuffling':
                    if (state === StateEnum.SECOND_SHUFFLING_WAITING_OTHERS) {
                        console.log('encrypt p1')
                       initEncryptDeck(deck, arrayToBuffer(newMessage.message.data?.deck), selfPlayer, latestNonce, signMessage) 
                       setState(StateEnum.DEAL_CARDS)
                    }
                    console.log('comenzar el shuffling', newMessage)
                    break
                case 'init_locking':
                    if (state === StateEnum.SECOND_SHUFFLING_WAITING_OTHERS) {
                        console.log('encrypt p2')
                        const encryptedDeck = await initEncryptDeck(deck, arrayToBuffer(newMessage.message.data?.deck), selfPlayer, latestNonce, signMessage)
                        setDeck(encryptedDeck)
                        setState(StateEnum.WAITING_MY_CARDS)
                    }
                    if (state === StateEnum.DEAL_CARDS) {
                        console.log('select cards for p2')
                        const finalDeck = arrayToBuffer(newMessage.message.data?.deck)
                        setDeck(finalDeck) // save deck
                        // DEAL CARDS
                        const dealedCards: MentalPokerCard[] = dealCards(finalDeck, usedCardsIndexes, selfPlayer, latestNonce, signMessage)
                        
                        setUsedCardsIndexes(
                            oldUsedCardsIndexes => [
                                ...oldUsedCardsIndexes,
                                ...dealedCards.map((dealCard: MentalPokerCard) => dealCard.cardIndex)
                            ])

                        setState(StateEnum.START_GAME)
                    }
                    break
                case 'deal_cards':
                    if (state === StateEnum.DEAL_CARDS) {
                        // SET MY CARDS
                        setMyCards({cards: newMessage.message.data?.cardsToDeal})

                        // DEAL CARDS
                        const dealedCards: MentalPokerCard[] = dealCards(deck, usedCardsIndexes, selfPlayer, latestNonce, signMessage)
                        
                        setUsedCardsIndexes(
                            oldUsedCardsIndexes => [
                                ...oldUsedCardsIndexes,
                                ...dealedCards.map((dealCard: MentalPokerCard) => dealCard.cardIndex)
                            ])
                        setState(StateEnum.START_GAME)
                    }
                    break
            }
        }, [state, address, signMessage, deck, cardCodewords, latestNonce, opponents, selfPlayer ])
    })
    // go to first shuffling
    useEffect(() => {
        if (Object.keys(opponents).length > 0 && cardCodewords.length >1 && state === StateEnum.SHOULD_INIT_SECOND_SHUFFLING_ROUND) {
           firstShuffling(deck, cardCodewords, selfPlayer, latestNonce, signMessage)
           setState(StateEnum.SECOND_SHUFFLING_WAITING_OTHERS)
        }
    }, [opponents, cardCodewords, state])


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
                <p>Deck: {deck}</p>
                <p>cardcodewords: {cardCodewords}</p>
                <p>status: {state}</p>
            </div>
            <div className="Game-View">
                <div className="h-full m-2 grid grid-cols-1 grid-rows-7 text-gray-200 gap-3 justify-center h-min-50">
                    <div className="border-dashed border-2 border-orange-700 justify-center">
                        Opponent
                        {
                            Object.keys(opponents).map((opponent, index) => {
                                return <p key={index}>{opponent}</p>
                            })
                        }
                    </div>
                    <div className="border-dashed border-2 row-span-3 bg-slate-50/50 border-emerald-50">
                        Played cards
                    </div>
                    <div className="border-dashed border-2 row-span-2 border-lime-700">
                        My cards
                    </div>
                    <div className="border-dashed border-2 border-gray-600">
                        <Actions>
                            <InitCommunication signMessage={signMessage} latestNonce={latestNonce} state={state} self={selfPlayer} setState={setState} />
                        </Actions>
                    </div>
                </div>
            </div>
        </div>
    )
}
