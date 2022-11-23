import { useEffect, useState, useRef, useCallback, MutableRefObject, useContext } from 'react'
import {  useAccountInformation, AccountType, useCreateRoom, Player, Message, sendMessage } from '../../hooks/providers/Wagmi'
import { useSignMessage } from 'wagmi'
import { verifyMessage } from 'ethers/lib/utils'
import P2PT, { Peer } from "p2pt"
import { utils, BytesLike } from 'ethers'
import { generateKeyUsingSecret, encryptUsingOTP, encryptAllUsingOTP, encryptCard } from '../shared/cryptoprimitives'
import { useP2PT } from './P2PT'
import { StateEnum } from "../../hooks/enums"

// new library
import { createContext } from "vm"



const CASTILLAN_CARDS: Card[] = [
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
    0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23,
    0x24, 0x25, 0x26, 0x27,
]

const addToMessageList = (
    messageSigned: MessageType,
    setMessages: (currentMessages: any) => any,
    setLastNonceReceived: (nonce: any) => any
) => {
    setMessages((currentMessages: MessageType[]) => [...currentMessages,messageSigned])
    setLastNonceReceived(messageSigned.message.nonce as number)
}

/**
 * process for select shuffled cards to opponent
 */
const selectCardsForOpponent = (encryptedCards: Card[], myDictionary: BytesLike[]): ExposeCard[] => {
    // TODO check length encryptedCards === myKeys
    // shuffle cards (without encrypt)
    const shuffledCards = utils.shuffled(encryptedCards).slice(0, 3)
    const assignedCards: ExposeCard[] = []
    // determine indexes from original array
    shuffledCards.forEach(value => {
       const indexCard = encryptedCards.indexOf(value)
       assignedCards.push({
           index: indexCard,
           keys: [myDictionary[indexCard]],
           card: encryptedCards[indexCard]
       })
    })

    // asigned cards ExposeCard[]
    return assignedCards 
}

const broadcastDeck = (deck: any) => {
    // TODO: send deck p2pt (MessageType)
}

const broadcastCards = (cards: any) => {
    // TODO: send cards p2pt (MessageType)
}

const encryptDeck = (cards: Card[], password: string) => {
    const dictionary = generateKeyUsingSecret(password, cards.length)
    return {
        cards: encryptUsingOTP(cards, dictionary),
        dictionary
    }
}

const encryptAllOnePasswordDeck = (cards: Card[], password: string) => {
    return encryptAllUsingOTP(cards, password)
}

const processShufflingAllDeck = (cards: Card[], password: string) : Card[] => {
    const shuffled = utils.shuffled(cards)
    return encryptAllOnePasswordDeck(shuffled, password);
}

const initShuffling = (newGame:any, nonce: number): Move => {
    const cardCodewords = createDeck(
        [newGame.self, ...newGame.opponent].map(player => player.cardCodewordFragment)
    )
    const prepareMessage : Move = {
        topic: "first_shuffling" as String,
        data: cardCodewords,
        nonce
    }
    return prepareMessage
}

const receiveAndEncryptDeck = (opponentCodewords: any[]): Move => {
    return prepareMessage
}

const receiveAndEncryptCards = (cards: Card[], oldPassword: string, newPassword: string) => {
    // not complete players first shuffling?
    // i didnt second shuffled?
    // state is -> SHOULD_INIT_SECOND_SHUFFLING_ROUND
    // state is -> SECOND_SHUFFLING_WAITING_OTHERS
    //
    // if complete second shuffle for all and i state is DEAL_CARDS  -> redirect to selectOpponentCardsAndSend
    const decryptedDeck = encryptAllOnePasswordDeck(cards, oldPassword)

    // no shuffle in second round
    //const shuffledCards = utils.shuffled(decryptedDeck)

    const {cards: encryptedCards, dictionary} = encryptDeck(decryptedDeck, newPassword)


    return {encryptedCards, dictionary}
    //broadcastDeck(encryptedCards) // broadcast to all statuses SECOND_SHUFFLING_WAITING_OTHERS
    // if state SECOND_SHUFFLING_WAITING_OTHERS -> WAITING_MY_CARDS
    // if state SHOULD_INIT_SECOND_SHUFFLING_ROUND -> DEAL_CARDS 
}


/**
 * send cards to opponent
 */
const selectOpponentCardsAndSend = (cards: Card[], myKeys: BytesLike[]) => {
    // state is DEAL_CARDS  and complete second shuffling
    const selectedCards = selectCardsForOpponent(cards, myKeys)
    // TODO mark used cards
    broadcastCards(selectedCards)
    // set state WAITING_MY_CARDS
}

const receiveMyCards = (receivedCards: ExposeCard[], encryptedCards: Card[], myDictionary: BytesLike[]): Card[] => {
    // state is WAITING_MY_CARDS
    const myCards:any = []
    receivedCards.forEach((exposedCard: ExposeCard) => {
        // add my key to keys for decrypt card
        exposedCard.keys.push(myDictionary[exposedCard.index])
        // decrypt card
        myCards.push(exposedCard.keys.reduce((toCleanCard, current) => {
            if (toCleanCard === undefined)
                return encryptCard(encryptedCards[exposedCard.index], current)
            return encryptCard(toCleanCard, current)
        }, undefined))
    })

    // TODO verify cards (valid 0-39 and isnt used)
    // TODO mark used cards

    // set state to -> START_GAME
    return myCards
}


const setState = (gameState: GameState, setGameState: any, topic: String, data?: Data) => {
    switch(topic) {
        case "first_shuffling":
            if (gameState.state === StateEnum.SHOULD_INIT_SHUFFLING) {
                setGameState((oldGameState: GameState) => ({...oldGameState, state: StateEnum.SHOULD_INIT_SECOND_SHUFFLING_ROUND}) )
            }
            break;
    }
}

export const useTruco = () => {
    //const p2pt = useRef(new P2PT<MessageType>(trackersURL, 'UNIQUE_KEY_GAME'))

    const [ deck, setDeck ] = useState({cards: []})
    //const [ peers, setPeers ] = useState([] as Peer[])
    //const { address, isConnected } : AccountType = useAccountInformation()
    //const [ inSession, setInSession ]  = useState(false)
    const [ messages, setMessages ] = useState([] as MessageType[])
    const [gameState, setGameState] = useState({} as GameState)

    const [ lastNonceSended, setLastNonceSended ] = useState(-1)
    const [ lastNonceReceived, setLastNonceReceived ] = useState(-1)

    // recibir mensaje
    const verifyAndAddMessage = useCallback((messageSigned: MessageType) => {
        //verify message nonce and exists signature
        if (messageSigned.signature !== undefined && messageSigned.message !== undefined && messageSigned.message.nonce > lastNonceReceived) {
            const sourceAddress = verifyMessage(
                JSON.stringify(messageSigned.message),
                messageSigned.signature!!
            )
            const jsonMessage : Move = messageSigned.message
            if (sourceAddress !== undefined) {
                processMessage(gameState, setGameState, jsonMessage.topic, jsonMessage.data) 
                addToMessageList(messageSigned, setMessages, setLastNonceReceived)
            }
        }
    }, [])

    const requestPeers = () => {
        if (inSession) {
            p2pt.current.requestMorePeers()
        }
    }

    const processMessage = (gameState: GameState, setGameState: any, topic: String, message?: Data) => {
        switch(topic) {
            case "first_shuffling":
                if (gameState.state === StateEnum.FIRST_SHUFFLING_WAITING_OTHERS) {
                    const shuffledCards = message as Shuffling
                    const sendFirstRoundShuffled: Move = receiveAndEncryptDeck(shuffledCards.cards)
                    sendMessageAll(sendFirstRoundShuffled)
                    break;
                }
                if (gameState.state === StateEnum.SHOULD_INIT_SECOND_SHUFFLING_ROUND) {
                    const shuffledCards = message as Shuffling
                    const { encryptedCards, dictionary } = receiveAndEncryptCards(shuffledCards.cards, "01", "01")
                    setGameState((oldGameState: GameState) => ({...oldGameState, myDictionary: dictionary}))
                    const sendSecondShuffled : Move = {
                        topic: "second_shuffling",
                        data: encryptedCards,
                        nonce: 0
                    }
                    sendMessageAll(sendSecondShuffled)
                    break;
                }
                break;

            default:
                console.log('none topic')

        }
    }

    // conectar a juego deprecated
    const clickConnectToGame = useCallback((playerNumber: number) => {
        if (address && isConnected) {
            console.log('p2p started')
            setGameState(
                (oldGameState) => ({...oldGameState, state:playerNumber === 1 ? StateEnum.SHOULD_INIT_SHUFFLING : StateEnum.FIRST_SHUFFLING_WAITING_OTHERS })
            )
            setInSession(true)
        } else {
            setInSession(false)
        }
        
    }, [address, isConnected])

    return {
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
    }
}
