import { useEffect, useState, useRef, useCallback } from 'react'
import {  useAccountInformation, AccountType, useCreateRoom, Player, Message, sendMessage } from '../../hooks/providers/Wagmi'
import { useSignMessage } from 'wagmi'
import { verifyMessage } from 'ethers/lib/utils'
import P2PT, { Peer } from "p2pt"
import { utils, BytesLike } from 'ethers'
import { generateKeyUsingSecret, encryptUsingOTP, encryptAllUsingOTP, encryptCard } from '../shared/cryptoprimitives'
import { useP2PT } from './P2PT'


const CASTILLAN_CARDS: Card[] = [
    "0x00", "0x01", "0x02", "0x03", "0x04", "0x05", "0x06", "0x07", "0x08", "0x09", "0x0a", "0x0b",
    "0x0c", "0x0d", "0x0e", "0x0f", "0x10", "0x11", "0x12", "0x13", "0x14", "0x15", "0x16", "0x17",
    "0x18", "0x19", "0x1a", "0x1b", "0x1c", "0x1d", "0x1e", "0x1f", "0x20", "0x21", "0x22", "0x23",
    "0x24", "0x25", "0x26", "0x27",
];

const addToMessageList = (
    messageSigned: MessageType,
    setMessages: (currentMessages: any) => any,
    setLastNonceReceived: (nonce: any) => any
) => {
    setMessages((currentMessages: MessageType[]) => [...currentMessages,messageSigned])
    setLastNonceReceived(messageSigned.message.nonce as number)
}

const sendToPeers = (p2pt: P2PT, peers: Peer[], messageSourceSigned: MessageType) => {
    peers.forEach((peer: Peer) => {
        console.log('enviando mensaje')
        p2pt.send(peer, messageSourceSigned)
    }) 
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
    return encryptUsingOTP(cards, generateKeyUsingSecret(password, cards.length))
}

const encryptAllOnePasswordDeck = (cards: Card[], password: string) => {
    return encryptAllUsingOTP(cards, password)
}

const processShufflingAllDeck = (cards: Card[], password: string)  => {
    // deck shuffled
    const shuffled = utils.shuffled(cards)
    // encrypt deck first shuffling
    let encryptedDeck = encryptAllOnePasswordDeck(cards, password);
    //encryptedDeck = encryptDeck(shuffled, "0x01")
    //send
    broadcastDeck(encryptDeck)
}

const initShuffling = (cards: Card[], password: string) => {
    processShufflingAllDeck(cards, "01")
    // set my state waiting first_shuffling_waiting_others
}

const receiveAndEncryptDeck = (cards: Card[]) => {
    processShufflingAllDeck(cards, "02")
    // set my state waiting init_second_shuffling_round
}

const receiveAndEncryptCards = (cards: Card[], password: string) => {
    const decryptedDeck = encryptAllOnePasswordDeck(cards, password)

    // no shuffle in second round
    //const shuffledCards = utils.shuffled(decryptedDeck)

    const encryptedCards = encryptDeck(decryptedDeck, password)

    broadcastDeck(encryptedCards)
    // set state to waiting_other_player encrypt each of the cards if my state is -> first_shuffling_waiting_others
    // else -> set state -> waiting_my_cards
}


/**
 * send cards to opponent
 */
const selectOpponentCardsAndSend = (cards: Card[], myKeys: BytesLike[]) => {

    const selectedCards = selectCardsForOpponent(cards, myKeys)
    // TODO mark used cards
    broadcastCards(selectedCards)
}

const receiveMyCards = (receivedCards: ExposeCard[], encryptedCards: Card[], myDictionary: BytesLike[]): Card[] => {

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

    return myCards
}

export const useTruco = () => {
    //const p2pt = useRef(new P2PT<MessageType>(trackersURL, 'UNIQUE_KEY_GAME'))

    const [ deck, setDeck ] = useState({cards: []})

    //const [ peers, setPeers ] = useState([] as Peer[])
    const { address, isConnected } : AccountType = useAccountInformation()
    const [ inSession, setInSession ]  = useState(false)
    const [ messages, setMessages ] = useState([] as MessageType[])

    const [ lastNonceSended, setLastNonceSended ] = useState(-1)
    const [ lastNonceReceived, setLastNonceReceived ] = useState(-1)

    const verifyAndAddMessage = useCallback((messageSigned: MessageType) => {
        console.log('verify executed', messageSigned)
        if (messageSigned.signature !== undefined && messageSigned.message !== undefined && messageSigned.message.nonce > lastNonceReceived) {
            const sourceAddress = verifyMessage(
                JSON.stringify(messageSigned.message),
                messageSigned.signature!!
            )
            const jsonMessage = messageSigned.message
            if (sourceAddress !== undefined) {
                console.log("mensaje verificado desde address", sourceAddress, jsonMessage)
                addToMessageList(messageSigned, setMessages, setLastNonceReceived)
            }
        }
    }, [])

    const {p2pt, peers, setPeers} = useP2PT(inSession, 'UNIQUE_KEY_GAME', verifyAndAddMessage)

    const { data, error: errorSendMessage, isLoading, signMessage } = useSignMessage({
        onSuccess(signature, variables) {
            const signer = verifyMessage(variables.message, signature)
            console.log('verified message', signature, variables, 'Address', address)
            if (signer === address) {
                const messageSourceSigned: MessageType = {
                    message: JSON.parse(variables.message as string),
                    signature: signature
                }
                addToMessageList(messageSourceSigned, setMessages, setLastNonceReceived)
                sendToPeers(p2pt.current, peers, messageSourceSigned)
            }
        }
    })

    const requestPeers = () => {
        if (inSession) {
            p2pt.current.requestMorePeers()
        }
    }

    const sendMessageAll = useCallback((message: String) => {
        //if (peers.length > 0) { // TODO: temporal commented
        const currentNonce = lastNonceReceived + 1
        setLastNonceSended(currentNonce)
        const sent = {
            action: message,
            nonce: currentNonce
        }
        signMessage({ message: JSON.stringify(sent) })
        //}
    }, [signMessage, lastNonceReceived])

    const clickConnectToGame = useCallback(() => {
        if (address && isConnected) {
            console.log('p2p started')
            setInSession(true)
        } else {
            setInSession(false)
        }
        
    }, [address, isConnected])

    //useEffect(() => {
    //    //if (p2pt.current && isConnected && inSession) {
    //    //    console.log('go, p2p define')
    //    //    p2pt.current.on('trackerconnect', (tracker, stats) => {
    //    //        trackingConnection(tracker, stats)
    //    //    })
    //    //    p2pt.current.on('peerconnect', callAddPeer)
    //    //    p2pt.current.on('peerclose', callRemovePeer)
    //    //    p2pt.current.on('msg', (peer: Peer, message) => {
    //    //        verifyAndAddMessage(message)
    //    //    })
    //    //    p2pt.current.start()
    //    //}
    //    //return () => { p2pt.current.destroy() }
    //}, [p2pt, isConnected, inSession])


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
        requestPeers
    }
}
