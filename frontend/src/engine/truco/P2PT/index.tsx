import { trackersURL }  from '../../../assets/trackers'
import { useEffect, useState, useRef, useCallback } from 'react'
import { verifyMessage } from 'ethers/lib/utils'
import P2PT, { Peer } from "p2pt"


const determineCurrentNonce = (messageList: any[]) => {
    return messageList.length === 0 ?
        0
        :
        messageList[messageList.length - 1];
}

const addToMessageList = (
    messageSigned: MessageType,
    setMessages: (currentMessages: any) => any,
) => {
    setMessages((currentMessages: MessageType[]) => [...currentMessages,messageSigned])
    //setLastNonceReceived(messageSigned.message.nonce as number)
}

export const useP2PT = (inSession: Boolean, sessionKey : String) => {
    console.log('go use p2pt')
    const p2pt: any = useRef()
    const [ peers, setPeers ] = useState([] as Peer[])

    const [ messages, setMessages ] = useState([] as MessageType[])
    const addPeer : any = useRef()
    const removePeer: any = useRef()
    const trackingConnection: any = useRef()
    const messageReceive: any = useRef()



    // verificar antes de enviar
    const verifyAndAddMessage = (messageSigned: MessageType) => {
        //verify message nonce and exists signature
        
        const currentNonce = determineCurrentNonce(messages)
        if (messageSigned.signature !== undefined && messageSigned.message !== undefined && messageSigned.message.nonce > currentNonce) {
            const sourceAddress = verifyMessage(
                JSON.stringify(messageSigned.message),
                messageSigned.signature!!
            )
            const jsonMessage : Move = messageSigned.message
            if (sourceAddress !== undefined) {
                console.log("mensaje verificado desde address", sourceAddress, jsonMessage)
                //processMessage(gameState, setGameState, jsonMessage.topic, jsonMessage.data) 
                addToMessageList(messageSigned, setMessages)
            }
        }
    }
    const sendToPeers = (address: any, signature:any, variables: any) => {
        const signer = verifyMessage(variables.message, signature)
        // comprobar address
        if (signer === address) {
            const messageSourceSigned: MessageType = {
                message: JSON.parse(variables.message as string),
                signature: signature
            }     
            // ADD TO LIST
            peers.forEach((peer: Peer) => {
                p2pt.send(peer, messageSourceSigned)
            }) 
            addToMessageList(messageSourceSigned, setMessages)
        }
    }



    // define callbacks for p2pt
    const removePeerCallback = useCallback((disconnectedPeer: Peer) => {
        setPeers((currentPeers) => currentPeers.filter((peer) => peer !== disconnectedPeer))
        console.log('remove peer', disconnectedPeer.id)
    }, [])
    const verifyAndAddMessageCallback = useCallback((disconnectedPeer: Peer, message: any) => {
        console.log('verify message callback', disconnectedPeer, message)
        verifyAndAddMessage(message)
    }, [verifyAndAddMessage])

    const addPeerCallback = useCallback((newPeer: Peer) => {
        setPeers((currentPeers) => [...currentPeers, newPeer])
        console.log('new peer added', newPeer)
    }, [])

    const trackingConnectionCallback = useCallback((tracker:any, stats:any) => {
        console.log('Connected to tracker : ' + tracker.announceUrl)
        console.log('Tracker stats : ' + JSON.stringify(stats))
        console.log('My identifier', p2pt.current._peerId)
    }, [])

    // init refs (only refresh if change callback)
    useEffect(() => {
        addPeer.current = addPeerCallback
        removePeer.current = removePeerCallback 
        trackingConnection.current = trackingConnectionCallback
        messageReceive.current = verifyAndAddMessageCallback
    }, [addPeerCallback, removePeerCallback, trackingConnectionCallback, verifyAndAddMessageCallback])

    // init p2pt, only refresh if "inSession" (disconnect)
    useEffect(() => {
        function callRemovePeer(peer:Peer) {
            removePeer.current(peer)
        }
        function callAddPeer(peer:Peer) {
            console.log('call new peer')
            addPeer.current(peer)
        }
        function callTrackingConnection(tracker: any, stats: any) {
            trackingConnection.current(tracker, stats)
        }
        function callMessageReceived(peer:Peer, message: any) {
            messageReceive.current(peer, message)
        }
        if (inSession) {
            p2pt.current = new P2PT<MessageType>(trackersURL, 'UNIQUE_KEY_GAME')
            p2pt.current.on('peerconnect', callAddPeer)
            p2pt.current.on('peerclose', callRemovePeer)
            p2pt.current.on('trackerconnect', callTrackingConnection)
            p2pt.current.on('msg', callMessageReceived)
            p2pt.current.start()
            return () => { p2pt.current.destroy() }
        }
    }, [inSession])

    return { p2pt, peers, setPeers, messages, sendToPeers }

}

