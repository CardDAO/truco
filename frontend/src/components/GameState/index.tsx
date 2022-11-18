import { Interface } from "ethers/lib/utils"
import { useState } from "react"
import { MdMoney } from "react-icons/md"
import { useContractEvent, useContractRead } from "wagmi"

export const GameState = ({matchAddress, joined, processingAction, setProcessingAction}) => {
    const [ betValue, setBetValue ] = useState(0)
    useContractRead({
       addressOrName: process.env.FRONT_MATCH_FACADE_ADDRESS as string,
       contractInterface: new Interface(["function getCurrentBet(address) public view returns (uint256)"]),
       functionName: 'getCurrentBet',
       onSuccess: (data) => {
           if (data) {
               console.log('bet value data', data)
               setBetValue(data)
           }
       }
    })
    useContractEvent({
        enabled: joined,
        addressOrName: matchAddress, // match factory
        contractInterface: new Interface([
            'event TurnSwitch(address indexed playerTurn)'
        ]),
        eventName: 'TurnSwitch',
        listener: (event) => {
            setProcessingAction(true)
            console.log('turn switched event, change', event)
            setProcessingAction(false)
        },
    })
    
    return (
        <div>
            <p className="text-gray-300 text-md">Current <MdMoney /> bet value: {betValue}</p>
        </div>
    )
}
