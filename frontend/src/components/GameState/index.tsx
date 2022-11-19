import { formatEther, Interface } from "ethers/lib/utils"
import { useState } from "react"
import { MdMoney } from "react-icons/md"
import { useContractEvent, useContractRead } from "wagmi"
import { useCurrentBet } from "../../hooks/match/GetCurrentBet"
import { MatchStateEnum } from "../Dashboard"

export const GameState = ({accountAddress, matchAddress, setJoined, joined, processingAction, setProcessingAction, matchStateValue, setMatchStateValue}) => {
    //const [ betValue, setBetValue ] = useState(0)
    const {currentBetValue: betValue} = useCurrentBet(matchAddress)

    const {refetch: refetchState} = useContractRead({
       addressOrName: matchAddress,
       contractInterface: new Interface(["function matchState() public view returns (uint256, uint8)"]),
       functionName: 'matchState',
       onSuccess: (data) => {
           console.log('get mAtch State', data)
           if (data.length > 1) {
               setMatchStateValue(data[1])
           }
       }
    })

    useContractRead({
       addressOrName: matchAddress,
       contractInterface: new Interface(["function getPlayers() public view returns (address[2])"]),
       functionName: 'getPlayers',
       onSuccess: (data) => {
           console.log('get playes')
           if (data?.indexOf(accountAddress) >= 0) {
               setJoined(true)
           }
       }
    })

    useContractEvent({
        addressOrName: matchAddress, // match factory
        contractInterface: new Interface([
            'event TurnSwitch(address indexed playerTurn)'
        ]),
        eventName: 'TurnSwitch',
        listener: (event) => {
            setProcessingAction(true)
            console.log('turn switched event, change', event)
            refetchState()
            setProcessingAction(false)
        },
    })

    useContractEvent({
        addressOrName: matchAddress, // match factory
        contractInterface: new Interface([
            'event MatchStarted(address indexed player1, address indexed player2, uint256 bet)'
        ]),
        eventName: 'MatchStarted',
        listener: (event) => {
            setProcessingAction(true)
            refetchState()
            console.log('match start event, change', event)
            setProcessingAction(false)
        },
    })

    useContractEvent({
        addressOrName: matchAddress, // match factory
        contractInterface: new Interface([
            'event NewDeal(address shuffler)'
        ]),
        eventName: 'NewDeal',
        listener: (event) => {
            setProcessingAction(true)
            console.log('new deal event, change', event)
            refetchState()
            setProcessingAction(false)
        },
    })
    
    return (
        <div className="text-gray-100">
            <p className="text-md">Current bet value: {betValue} Weis</p>
            {
                MatchStateEnum[matchStateValue]
            }
        </div>
    )
}
