import { useEffect, useState, useRef, useCallback } from 'react'
import { Truco } from "../../engine/truco/Truco"
import {  useAccountInformation, AccountType, useCreateRoom, Player, Message, sendMessage } from '../../hooks/providers/Wagmi'
import { Join } from "../../engine/truco/commands/Join"
import { GameInterface } from "../../engine/shared/GameInterface"
import { useSignMessage } from 'wagmi'
import { verifyMessage } from 'ethers/lib/utils'

export const useTruco = () => {

    const [ game, setGame ] = useState(new Truco())
    const recoveredAddress = useRef<String>()
    const { address, isConnected } : AccountType = useAccountInformation()
    const [ inSession, setInSession ]  = useState(false)

    const { data, error, isLoading, signMessage } = useSignMessage({
      onSuccess(data, variables) {
        // Verify signature when sign message succeeds
        const address = verifyMessage(variables.message, data)
        console.log('verifico', data, variables, address)
        recoveredAddress.current = address
      },
    })

    const clickConnectToGame = useCallback(() => {
        if (address && isConnected) {
            game.init(
                address,
                isConnected,
                (truco: Truco): void => {
                    // TODO: este aún no funciona, cuando actualiza no se renderiza nuevamente
                    setGame(truco)
                    setInSession(true)
                }
            )
        } else {
            setInSession(false)
        }
        
    }, [game, isConnected, address, setGame])

    useEffect(() => {
        clickConnectToGame()
    }, [clickConnectToGame])

    return {
        address,
        isConnected,
        game,
        setGame,
        recoveredAddress,
        signMessage,
        data,
        clickConnectToGame,
        inSession
    }
}
