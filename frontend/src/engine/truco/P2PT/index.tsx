import { trackersURL }  from '../../../assets/trackers'
import { useEffect, useState, useRef, useCallback } from 'react'
import P2PT, { Peer } from "p2pt"

export const useP2PT = (inSession: Boolean, sessionKey : String, sendMessage: any) => {
    console.log('go use p2pt')
    const p2pt: any = useRef()
    const [ peers, setPeers ] = useState([] as Peer[])

    const addPeer : any = useRef()
    const removePeer: any = useRef()
    const trackingConnection: any = useRef()
    const messageReceive: any = useRef()
    // define callbacks for p2pt
    const removePeerCallback = useCallback((disconnectedPeer: Peer) => {
        setPeers((currentPeers) => currentPeers.filter((peer) => peer !== disconnectedPeer))
        console.log('remove peer', disconnectedPeer.id)
    }, [])
    const verifyAndAddMessageCallback = useCallback((disconnectedPeer: Peer, message: any) => {
        console.log('dale gask', disconnectedPeer, message)
        sendMessage(message)
    }, [sendMessage])

    const addPeerCallback = useCallback((newPeer: Peer) => {
        setPeers((currentPeers) => [...currentPeers, newPeer])
        console.log('new peer added', newPeer)
    }, [])

    const trackingConnectionCallback = useCallback((tracker:any, stats:any) => {
        console.log('Connected to tracker : ' + tracker.announceUrl)
        console.log('Tracker stats : ' + JSON.stringify(stats))
        console.log('My identifiere', p2pt.current._peerId)
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

    return { p2pt, peers, setPeers }

}
