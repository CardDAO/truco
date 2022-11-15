import { ethers } from "ethers"
import { useEffect, useState, useCallback, KeyboardEventHandler} from 'react'
import { useTruco } from "../../engine/truco/useTruco"
import {  useAccountInformation, AccountType, useCreateRoom, Player, Message, sendMessage } from '../../hooks/providers/Wagmi'
import { Dashboard } from "../Dashboard"
import { DeployMatch } from "../DeployMatch"

const BUTTON_STYLE = "text-white focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:focus:ring-cyan-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"

export const Game = () => {

    const [messageInput, setMessageInput] = useState("")
    const [matchAddress, setMatchAddress] = useState("")
    const { address, isConnected } : AccountType = useAccountInformation()
    const [ inSession, setInSession ]  = useState(false)
    const [ invalidAddress, setInvalidAddress ] = useState("")
    const [ processingAction, setProcessingAction] = useState(false)

    const verifyAndSetMatchAddress = (e: any) => {
        try {
            if (e.target.value.length > 0) {
                ethers.utils.getAddress(e.target.value)
            }
            setInvalidAddress("")
            setMatchAddress(e.target.value)
        } catch {
            setInvalidAddress("Error, verifique el address del match")
        }
    }

    return (
        <>
            {
                !isConnected ?
                    <h1 className="text-white text-4xl text-center align-middle">Connect wallet</h1>
                    :
                    !inSession ? 
                    <div className="text-center align-middle">
                        <h2 className="text-white text-xl py-5 text-center align-middle">Start game</h2>
                        <p className="text-gray-600 truncate">{address?.toString()}</p>
                        {
                        !processingAction ?
                            <>
                                <div>
                                    <input placeholder="Match Addresss (empty to deploy)" type="text" onChange={verifyAndSetMatchAddress} className="block p-2 w-full rounded-lg border sm:text-xs bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500 my-5" />
                                </div>
                                <button type="button" disabled={invalidAddress? true : false} className={ invalidAddress ? BUTTON_STYLE + " bg-gray-400" : BUTTON_STYLE + " bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl" } onClick={() => { setInSession(!inSession) }}>Join game</button>
                                <p className="text-sm text-red-500">{invalidAddress ?? ""}</p>
                            </>
                            :""
                        }
                        <div>
                            <DeployMatch setProcessingAction={setProcessingAction} processingAction={processingAction} />
                        </div>
                    </div>
                    :
                    <Dashboard
                        address={address}
                        inSession={inSession}
                        messageInput={messageInput}
                        matchAddress={matchAddress}
                        setMessageInput={setMessageInput}
                    />
            }
        </>
    )
}
