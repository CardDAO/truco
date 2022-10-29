import { useEffect, useState, useRef, useCallback } from 'react'
import {  useAccountInformation, AccountType, useCreateRoom, Player, Message, sendMessage } from '../../hooks/providers/Wagmi'
import { useSignMessage } from 'wagmi'
import { verifyMessage } from 'ethers/lib/utils'
import { SignatureLike } from "@ethersproject/bytes"
import { trackersURL }  from '../../assets/trackers'
import P2PT, { Peer } from "p2pt"
import { utils, BytesLike } from 'ethers'
import { generateKeyUsingSecret, encryptUsingOTP, PromiseOrValue } from '../shared/cryptoprimitives'


type Card = PromiseOrValue<BytesLike>

const cards: Card[] = [
    "0x00", "0x01", "0x02", "0x03", "0x04", "0x05", "0x06", "0x07", "0x08", "0x09", "0x0a", "0x0b",
    "0x0c", "0x0d", "0x0e", "0x0f", "0x10", "0x11", "0x12", "0x13", "0x14", "0x15", "0x16", "0x17",
    "0x18", "0x19", "0x1a", "0x1b", "0x1c", "0x1d", "0x1e", "0x1f", "0x20", "0x21", "0x22", "0x23",
    "0x24", "0x25", "0x26", "0x27",
];

type Request = {
    action?: String, //json
    nonce: Number
}

type MessageType = {
    message: Request,
    signature?: SignatureLike
}


const addToMessageList = (
    messageSigned: MessageType,
    setMessages: (currentMessages: any) => any,
    setLastNonceReceived: (nonce: any) => any
) => {
    setMessages((currentMessages: MessageType[]) => [...currentMessages,messageSigned])
    setLastNonceReceived(messageSigned.message.nonce as number)
}

const sendToPeers = (p2pt:P2PT, peers: Peer[], messageSourceSigned: MessageType) => {
    peers.forEach((peer: Peer) => {
        console.log('enviando mensaje')
        p2pt.send(peer, messageSourceSigned)
    }) 
}

const selectCardsForOpponent = (cards: Card[]): number[] => {
    // shuffle cards (without encrypt)
    const shuffledCards = utils.shuffled(cards).slice(0, 3)

    // determine indexes from original array
    const indexes: number[] = []
    shuffledCards.forEach(value => {
       indexes.push(cards.indexOf(value))
    })

    return indexes
}

const broadcastDeck = (deck: any) => {
    // TODO: send deck p2pt (MessageType)
}

const encryptDeck = (cards: Card[], password: string) => {
    return encryptUsingOTP(cards, generateKeyUsingSecret(password, cards.length))
}

const initShuffling = (cards: Card[], password: String) => {
    // deck shuffled
    const shuffled = utils.shuffled(cards)
    // encrypt
    const encryptedDeck = encryptDeck(shuffled, "una clave como 123456")
    //send
    broadcastDeck(encryptDeck)
    
}

export const useTruco = () => {
    const [p2pt, setP2PT] = useState(new P2PT<MessageType>(trackersURL, 'UNIQUE_KEY_GAME'))

    const [ deck, setDeck ] = useState({cards: []})

    const [ peers, setPeers ] = useState([] as Peer[])
    const { address, isConnected } : AccountType = useAccountInformation()
    const [ inSession, setInSession ]  = useState(false)
    const [ messages, setMessages ] = useState([] as MessageType[])

    const [ lastNonceSended, setLastNonceSended ] = useState(-1)
    const [ lastNonceReceived, setLastNonceReceived ] = useState(-1)


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
                sendToPeers(p2pt, peers, messageSourceSigned)
            }
        }
    })

    const verifyAndAddMessage = useCallback((messageSigned: MessageType) => {
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


    const removePeer = useCallback((disconnectedPeer: Peer) => {
        setPeers((currentPeers) => currentPeers.filter((peer) => peer === disconnectedPeer))
        console.log('remove peer', disconnectedPeer)
    }, [])

    const addPeer = useCallback((newPeer: Peer) => {
        setPeers((currentPeers) => [...currentPeers, newPeer])
        console.log('new peer added', newPeer)
    }, [])

    const trackingConnection = useCallback((tracker:any, stats:any) => {
        console.log('Connected to tracker : ' + tracker.announceUrl)
        console.log('Tracker stats : ' + JSON.stringify(stats))
        console.log('My identifier ', p2pt._peerId)
    }, [p2pt])

    useEffect(() => {
        if (p2pt && isConnected && inSession) {
            console.log('go, p2p define')
            p2pt.on('trackerconnect', (tracker, stats) => {
                trackingConnection(tracker, stats)
            })
            p2pt.on('peerconnect', addPeer)
            p2pt.on('peerclose', (peer) => {
                removePeer(peer)
            })
            p2pt.on('msg', (peer: Peer, message) => {
                verifyAndAddMessage(message)
            })
            p2pt.start()
        }
        return () => { p2pt.destroy() }
    }, [p2pt, isConnected, inSession])


    return {
        address,
        isConnected,
        clickConnectToGame,
        inSession,
        peers,
        sendMessageAll,
        isLoading,
        errorSendMessage,
        messages
    }
}
