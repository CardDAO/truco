import { formatEther, Interface } from "ethers/lib/utils"
import { useEffect, useState } from "react"
import { MdMoney } from "react-icons/md"
import { useContractEvent, useContractRead } from "wagmi"
import { useCurrentBet } from "../../hooks/match/GetCurrentBet"
import { ChallengeTypes, MatchStateEnum } from "../Dashboard"

export const GameState = ({
    accountAddress, matchAddress,
    setJoined, joined, processingAction,
    setPlayerTurn, playerTurn,
    setProcessingAction, matchStateValue, setMatchStateValue,
    currentChallenge, setCurrentChallenge,
    waitResponse, setWaitResponse
}) => {
    //const [ betValue, setBetValue ] = useState(0)
    const {currentBetValue: betValue} = useCurrentBet(matchAddress)
    const [ shuffler, setShuffler ] = useState(undefined)

    const {refetch: refetchState} = useContractRead({
       addressOrName: process.env.FRONT_MATCH_FACADE_ADDRESS as string,
       contractInterface: new Interface([
           "function getMatchInfo(address) public view returns (uint256 matchState, uint256 challenge, bool waitResponse, address shuffler, uint256 bet)"
       ]),
       functionName: 'getMatchInfo',
       args: [matchAddress],
       onSuccess: (data) => {
           console.log('get mAtch State', data)
           if (data.length > 1) {
               setMatchStateValue(parseInt(data.matchState.toString()))
               setCurrentChallenge(parseInt(data.challenge.toString()))
               setWaitResponse(data.waitResponse)
               setShuffler(data.shuffler.toString())
               //setMatchStateValue(data[1])
           }
       },
       onError: (err: Error) => {
           console.log('get match state',err)
       }
    })

    useEffect(() => {
        refetchState()
    }, [processingAction])

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

    useContractEvent({
        addressOrName: matchAddress,
        contractInterface: new Interface(['event NewDealRequired(address newShuffler, uint8 nextNonce)']),
        eventName: 'NewDealRequired',
        listener: (event) => {
            setProcessingAction(true)
            console.log('new deal required -> New Shuffler event, change', event)
            //refetchState()
            setShuffler(event.newShuffler)
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
            <p>{waitResponse? "Waiting response...": ""}</p>
            <p>
                {
                    currentChallenge && currentChallenge > 0 ? `Challenge ${ChallengeTypes[currentChallenge]}` : ""
                }
            </p>
            <p>
                {
                    shuffler && accountAddress === shuffler ? `YOUR SHUFFLER` : ""
                }
            </p>
            
        </div>
    )
}
