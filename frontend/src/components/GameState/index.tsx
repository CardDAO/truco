import { formatEther, Interface } from "ethers/lib/utils"
import { useState } from "react"
import { MdMoney } from "react-icons/md"
import { useContractEvent, useContractRead } from "wagmi"
import { useCurrentBet } from "../../hooks/match/GetCurrentBet"
import { ChallengeTypes, MatchStateEnum } from "../Dashboard"

export const GameState = ({accountAddress, matchAddress, setJoined, joined, processingAction, setProcessingAction, matchStateValue, setMatchStateValue}) => {
    //const [ betValue, setBetValue ] = useState(0)
    const {currentBetValue: betValue} = useCurrentBet(matchAddress)
    const [playerTurn, setPlayerTurn] = useState(undefined)
    const [ currentChallenge, setCurrentChallenge ]  = useState(undefined)

    const {refetch: refetchState} = useContractRead({
       addressOrName: process.env.FRONT_MATCH_FACADE_ADDRESS as string,
       contractInterface: new Interface(["function getMatchInfo(address) public view returns (uint256 matchState, uint256 challenge, address shuffler, uint256 bet)"]),
       functionName: 'getMatchInfo',
       args: [matchAddress],
       onSuccess: (data) => {
           console.log('get mAtch State', data)
           if (data.length > 1) {
               setMatchStateValue(parseInt(data.matchState.toString()))
               setCurrentChallenge(data.challenge)
               //setMatchStateValue(data[1])
           }
       },
       onError: (err: Error) => {
           console.log('get match state',err)
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
            if (event) {
                setPlayerTurn(event[0])
            }
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
            <p>
                {
                    MatchStateEnum[matchStateValue]
                }
            </p>
            <p>
                {
                    playerTurn === accountAddress ?
                        "YOUR TURN" : playerTurn
                }
            </p>
            <p>
                {
                    currentChallenge && currentChallenge > 0 ? `Challenge ${ChallengeTypes[currentChallenge]}` : ""
                }
            </p>
            
        </div>
    )
}
