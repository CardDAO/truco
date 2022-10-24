import { useEffect, useState, useRef, useCallback } from 'react'
import { Truco } from "../../engine/truco/Truco"
import {  useAccountInformation, AccountType, useCreateRoom, Player, Message, sendMessage } from '../../hooks/providers/Wagmi'
import { Join } from "../../engine/truco/commands/Join"
import { GameInterface } from "../../engine/shared/GameInterface"
import { useSignMessage } from 'wagmi'
import { verifyMessage } from 'ethers/lib/utils'

import { trackersURL }  from '../../assets/trackers'
import P2PT, { Peer } from "p2pt"

type MessageType = {
    message: String
}


export const useTruco = () => {
    //const [ game, setGame ] = useState(new Truco())
    const [p2pt, setP2PT] = useState(new P2PT<MessageType>(trackersURL, 'UNIQUE_KEY_GAME'))

    const [ peers, setPeers ] = useState([] as Peer[])
    const recoveredAddress = useRef<String>()
    const { address, isConnected } : AccountType = useAccountInformation()
    const [ inSession, setInSession ]  = useState(false)
    const [ messages, setMessages ] = useState([] as MessageType[])


   // const { data, error, isLoading, signMessage } = useSignMessage({
   //   onSuccess(data, variables) {
   //     // Verify signature when sign message succeeds
   //     const address = verifyMessage(variables.message, data)
   //     console.log('verifico', data, variables, address)
   //     recoveredAddress.current = address
   //   },
   // })

    const sendMessageAll = useCallback((message: String) => {
        if (peers.length > 0) {
            const miMensaje = {message: p2pt._peerId + ": " + message}
            setMessages((currentMessages) => [...currentMessages, miMensaje])
            peers.forEach((peer: Peer) => {
                console.log('enviando mensaje')
                p2pt.send(peer, miMensaje)
            }) 
        }
    }, [p2pt, peers])

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
                setMessages((currentMessages) => [...currentMessages, message])
            })
            p2pt.start()
        }
        return () => { p2pt.destroy() }
    }, [p2pt, isConnected, inSession])

    return {
        address,
        isConnected,
        recoveredAddress,
        clickConnectToGame,
        inSession,
        peers,
        sendMessageAll,
        messages
    }
}
