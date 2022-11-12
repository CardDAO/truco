import { useState, useEffect } from 'react'
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi'
import { ABI } from '../../assets/abi'
import { Contract } from '@ethersproject/contracts'
import { trackersURL }  from '../../assets/trackers'
import P2PT, { Peer } from "p2pt"


export type Player = {
    id: string;
    respond(msg: Message): Promise<[peer: Player, msg: any]>;
}

export type Message = {
    message: Object,
    peer: Player
}


export type AccountType = {
    isConnected: Boolean,
    address?: String,
    contract?: Contract
}

export const useAccountInformation = () : AccountType => {
    const { address, isConnected } = useAccount()
    return {
        isConnected,
        address
    }
}

export const useCreateRoom = (
    onNewPlayer: (player: Player) => void,
    onReceive: (message: Message) => void
) : P2PT<Message> | {} => {
    const [ p2pState, setP2PState ] = useState({})
    const { isConnected, address } = useAccountInformation()
    useEffect(() => {
        const p2pt: P2PT = new P2PT<Message>(trackersURL, 'UNIQUE_KEY_GAME')
        if (isConnected && address) {
            p2pt.setIdentifier((address as string))
            p2pt.on('msg', (peer, message) => {
                onReceive({message, peer})
            })///.then
            p2pt.on('peerconnect', (peer: Peer) => {
                onNewPlayer.bind(this)
                onNewPlayer(peer)
            })//.then
            p2pt.start()
            setP2PState(p2pt)
            console.log('setted p2p', p2pt)
        }
        return () => {
            //p2pt.off('peerconnect')
        }
    }, [])

    return p2pState 
}

export const sendMessage = (p2pt: P2PT, {peer, message}: Message, callback: (message:Message) => void) => {
    console.log('dentron de message',p2pt)
    p2pt.send(peer, message).then(([peer, message]) => {
        callback({peer, message})
    })
}
