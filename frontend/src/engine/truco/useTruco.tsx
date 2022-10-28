import { useEffect, useState, useRef, useCallback } from 'react'
import { Truco } from "../../engine/truco/Truco"
import {  useAccountInformation, AccountType, useCreateRoom, Player, Message, sendMessage } from '../../hooks/providers/Wagmi'
import { Join } from "../../engine/truco/commands/Join"
import { GameInterface } from "../../engine/shared/GameInterface"
import { useSignMessage } from 'wagmi'
import { verifyMessage } from 'ethers/lib/utils'
import { SignatureLike } from "@ethersproject/bytes"

import { trackersURL }  from '../../assets/trackers'
import P2PT, { Peer } from "p2pt"


type Request = {
    action?: String,
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

export const useTruco = () => {
    //const [ game, setGame ] = useState(new Truco())
    const [p2pt, setP2PT] = useState(new P2PT<MessageType>(trackersURL, 'UNIQUE_KEY_GAME'))

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
    },[])

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

const createMessage = (address:String, action?: String) => {

}
