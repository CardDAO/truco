import { Chat } from "../Chat"
import { Actions } from "../Actions"
import './index.css'
import { useP2PT } from "../../engine/truco/P2PT"
import { Interface, verifyMessage } from 'ethers/lib/utils'
import { useState, useCallback, useEffect } from "react"
import { createContext } from "react"
import { StateEnum } from "../../hooks/enums"
import { createPlayer, createDeck } from 'mental-poker'
import { InitCommunication, sayHelloAll } from "../Actions/InitComunication"
import { useContractRead, useSignMessage, useContractEvent } from "wagmi"
import { GAME_CONFIG } from "../../engine/truco/GameConfig"
import {useProcessMessage} from '../../engine/truco/ProcessMessages'
import { firstShuffling } from "../Actions/FirstShuffling"
import { consecutiveShuffling } from "../Actions/ConsecutiveShuffling"
import { initEncryptDeck } from "../Actions/InitEncryptDeck"
import { dealCards } from "../Actions/DealCards"
import { SpellTruco } from "../Actions/SpellTruco"
import { DeployMatch } from "../DeployMatch"
import { JoinMatch } from "../Actions/JoinMatch"
import { SpellEnvido } from "../Actions/SpellEnvido"
import { MyCards } from "../MyCards"
import { RecalculateEnvido } from "../Actions/RecalculateEnvido"
import { SpellEnvidoCount } from "../Actions/SpellEnvidoCount"
import { AcceptChallenge } from "../Actions/AcceptChallenge"
import { AcceptChallengeForRaising } from "../Actions/AcceptChallengeForRaising"
import { SpellFaltaEnvido } from "../Actions/SpellFaltaEnvido"
import { SpellReTruco } from "../Actions/SpellReTruco"
import { SpellEnvidoEnvido } from "../Actions/SpellEnvidoEnvido"
import { SpellRealEnvido } from "../Actions/SpellRealEnvido"
import { SpellValeCuatro } from "../Actions/SpellValeCuatro"
import { NewDeal } from "../Actions/NewDeal"
import { GameState } from "../GameState"
import { Resign } from "../Actions/Resign"
import { OpponentInfo } from "../OpponentInfo"
import { MdRefresh } from "react-icons/md"
import { RevealCards } from "../Actions/RevealCards"


export const GAS_LIMIT_WRITE = process.env.GAS_LIMIT_WRITE
export enum MatchStateEnum {
    WAITING_FOR_PLAYERS,
    WAITING_FOR_DEAL,
    WAITING_FOR_PLAY,
    WAITING_FOR_REVEAL,
}


export enum ChallengeTypes {
    None,
    Truco,
    ReTruco,
    ValeCuatro,
    Envido,
    EnvidoEnvido,
    RealEnvido,
    FaltaEnvido
}

const arrayToBuffer = (array: any[]) => array.map(simpleObject => Buffer.from(simpleObject.data))


export const Dashboard = ({ address, inSession, matchAddress }: any) => {
    // TODO add hasPeers -> allow actions
    // FRONT -> SHUFFLING AND P2P
    const { p2pt, peers, messages, sendToPeers, latestNonce } = useP2PT(inSession, 'UNIQUE_KEY_GAME')
    const [ sharedCodewordFragment, setSharedCodewordFragments ] = useState([])
    const [ opponents, setOpponents ] = useState({})
    const [ state, setState ] = useState(StateEnum.WAITING_PLAYERS)
    const [ cardCodewords, setCardCodewords ] = useState([])
    const [ deck, setDeck ] = useState([] as Buffer[])
    const [ myCards, setMyCards ] = useState({} as AssignedCards)
    const [ usedCardsIndexes, setUsedCardsIndexes ] = useState([] as number[])
    const [ selfPlayer, setSelfPlayer ] = useState(createPlayer(GAME_CONFIG))
    // FRONT -> CONTRACT
    const [ joined , setJoined ] = useState(false)
    const [ processingAction, setProcessingAction ] = useState(false)
    const [ cleanCards, setCleanCards ] = useState([])
    const [ usedContractCards, setUsedContractCards ] = useState([])
    const [ currentEnvido, setCurrentEnvido ] = useState(0)
    const [ matchStateValue, setMatchStateValue ] = useState(undefined)
    const [playerTurn, setPlayerTurn] = useState(undefined)
    const [ currentChallenge, setCurrentChallenge ]  = useState(undefined)
    const [ waitResponse, setWaitResponse]  = useState(undefined)
    
    // verify before to send
    const { data, error: errorSendMessage, isLoading, signMessage } = useSignMessage({
        onSuccess(signature: any, variables: any) {
            sendToPeers(address, signature, variables)
            //setState(gameState, setGameState, messageSourceSigned.message.topic, messageSourceSigned.message.data)
        }
    })
    useContractRead({
       addressOrName: matchAddress,
       contractInterface: new Interface(["function getPlayers() public view returns (address[2])"]),
       functionName: 'getPlayers',
       onSuccess: (data) => {
           if (data?.indexOf(address) >= 0) {
               setJoined(true)
           }
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
                            newOpponents[signer] = { dealedCards: [], cardCodewordFragments: arrayToBuffer(newMessage.message.data.cardCodewordFragments)  }
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
                        
                        const dealedCardIndexes = dealedCards.map((dealCard: MentalPokerCard) => dealCard.cardIndex)
                        setUsedCardsIndexes(
                            oldUsedCardsIndexes => [
                                ...oldUsedCardsIndexes,
                                ...dealedCardIndexes
                            ])

                        setOpponents(oldOpponents => {
                            const opponentToDeal = oldOpponents[signer]
                            opponentToDeal.cardsIndexes = dealedCardIndexes
                            oldOpponents[signer] = opponentToDeal

                            return oldOpponents
                        })

                        setState(StateEnum.START_GAME)
                    }
                    break
                case 'deal_cards':
                    if (state === StateEnum.DEAL_CARDS) {
                        // SET MY CARDS
                        setMyCards({cards: newMessage.message.data?.cardsToDeal})

                        // DEAL CARDS
                        const dealedCards: MentalPokerCard[] = dealCards(deck, usedCardsIndexes, selfPlayer, latestNonce, signMessage)
                        const dealedCardIndexes = dealedCards.map((dealCard: MentalPokerCard) => dealCard.cardIndex)
                        
                        setUsedCardsIndexes(
                            oldUsedCardsIndexes => [
                                ...oldUsedCardsIndexes,
                                ...dealedCards.map((dealCard: MentalPokerCard) => dealCard.cardIndex)
                            ])
                        setOpponents(oldOpponents => {
                            const opponentToDeal = oldOpponents[signer]
                            opponentToDeal.cardsIndexes = dealedCardIndexes
                            oldOpponents[signer] = opponentToDeal

                            return oldOpponents
                        })
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
        <>
        {
        joined ?
        <div className="Dashboard-Grid">
            <div className="Chat-Column">
                <p>Deck: {deck}</p>
                <p>cardcodewords: {cardCodewords}</p>
                <p>status: {state}</p>
                <button type="button" className={`Loading-GameState ${processingAction ? "animate-bounce bg-indigo-500 shadow-lg shadow-indigo-500/50" : "" }`} onClick={()=> { setProcessingAction(true); setTimeout(() => {setProcessingAction(false)}, 2000) }}>
                    {
                    processingAction ?
                    <svg aria-hidden="true" role="status" className="inline w-4 h-4 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                    </svg>
                    :
                    <MdRefresh />
                    }
                </button>
                <GameState 
                    setPlayerTurn={setPlayerTurn}
                    playerTurn={playerTurn}
                    setJoined={setJoined}
                    accountAddress={address}
                    matchAddress={matchAddress}
                    joined={joined}
                    setProcessingAction={setProcessingAction}
                    processingAction={processingAction}
                    matchStateValue={matchStateValue}
                    setMatchStateValue={setMatchStateValue}
                    currentChallenge={currentChallenge}
                    setCurrentChallenge={setCurrentChallenge}
                    waitResponse={waitResponse}
                    setWaitResponse={setWaitResponse}
                />
            </div>
            <div className="Game-View">
                <div className="h-full m-2 grid grid-cols-1 grid-rows-7 text-gray-200 gap-3 justify-center h-min-50">
                        <div>
                        <div className="border-dashed border-2 border-orange-700 justify-center">
                        {
                            matchAddress && matchStateValue === MatchStateEnum.WAITING_FOR_PLAY ?
                                <OpponentInfo playerAddress={address} match={matchAddress} processingAction={processingAction} playerTurn={playerTurn} />
                            : ""
                        }
                        {
                            Object.keys(opponents).map((opponent, index) => {
                                return <p key={index}>{opponent}</p>
                        })
                        }
                        </div>
                        <div className="border-dashed border-2 row-span-3 border-lime-700">
                            <div>
                                <label>Envido
                                <input value={currentEnvido} className="block p-2 w-20 rounded-lg border sm:text-xs bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500" onChange={(event) => setCurrentEnvido(event.target.value)} />
                                </label>
                            </div>
                            <MyCards processingAction={processingAction} match={matchAddress} setProcessingAction={setProcessingAction} cards={cleanCards} setCards={setCleanCards} usedContractCards={usedContractCards} setUsedContractCards={setUsedContractCards} />
                            {
                            matchAddress && matchStateValue === MatchStateEnum.WAITING_FOR_REVEAL && playerTurn === address ?
                            <RevealCards cards={cleanCards} match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} /> : ""
                            }
                        </div>
                        <div className="border-dashed border-2 border-gray-600">
                            <Actions playerTurn={playerTurn} currentChallenge={currentChallenge} setProcessingAction={setProcessingAction} processingAction={processingAction}>
                            {
                                matchAddress ?
                                matchStateValue === MatchStateEnum.WAITING_FOR_PLAY && playerTurn === address ?
                                    <>
                                    {
                                        currentChallenge === ChallengeTypes.None || (!waitResponse)?
                                        <>
                                        <SpellTruco match={matchAddress}  setProcessingAction={setProcessingAction} processingAction={processingAction} />
                                        <SpellReTruco match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} />
                                        <SpellValeCuatro match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} />
                                        <SpellEnvido match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} />
                                        <SpellFaltaEnvido match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} />
                                        <SpellEnvidoEnvido match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} />
                                        <SpellRealEnvido match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} />
                                        <SpellEnvidoCount playerTurn={playerTurn} currentChallenge={currentChallenge} match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} count={currentEnvido}/>
                                        </>
                                        :
                                        <>
                                        <AcceptChallenge playerTurn={playerTurn} currentChallenge={currentChallenge} match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} />
                                        <AcceptChallengeForRaising playerTurn={playerTurn} currentChallenge={currentChallenge} match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} />
                                        </>
                                    }
                                    <RecalculateEnvido playerTurn={playerTurn} currentChallenge={currentChallenge} cards={cleanCards} setCurrentEnvido={setCurrentEnvido} />
                                    <Resign playerTurn={playerTurn} currentChallenge={currentChallenge} match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} />
                                    </>
                                    :
                                    matchStateValue === MatchStateEnum.WAITING_FOR_DEAL ?
                                        <NewDeal match={matchAddress} setProcessingAction={setProcessingAction} processingAction={processingAction} myAddress={address} />
                                    :
                                    <>
                                        <InitCommunication signMessage={signMessage} latestNonce={latestNonce} state={state} self={selfPlayer} setState={setState} />
                                    </>
                                    : ""
                            }
                            </Actions>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        :
        <div className="h-full m-2 grid grid-cols-1 grid-rows-1 text-gray-200 gap-3 justify-center h-min-50">
            <JoinMatch match={matchAddress} setJoined={setJoined} processingAction={processingAction} setProcessingAction={setProcessingAction} />
        </div>
        }
        </>
    )
}
