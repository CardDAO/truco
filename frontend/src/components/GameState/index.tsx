import { formatEther, Interface } from "ethers/lib/utils"
import { useEffect, useState } from "react"
import { MdMoney } from "react-icons/md"
import { useContractEvent, useContractRead } from "wagmi"
import { useCurrentBet } from "../../hooks/match/GetCurrentBet"
import { ChallengeTypes, MatchStateEnum } from "../Dashboard"
import { Modal } from "../Modal"
import { walletParser } from "../../hooks/helpers/walletParser"

export const GameState = ({
    accountAddress, matchAddress,
    setJoined, joined, processingAction,
    setPlayerTurn, playerTurn,
    setProcessingAction, matchStateValue, setMatchStateValue,
    currentChallenge, setCurrentChallenge,
    waitResponse, setWaitResponse,
    shuffler, setShuffler,
    setPlayingDeal
}) => {
    //const [ betValue, setBetValue ] = useState(0)
    const {currentBetValue: betValue} = useCurrentBet(matchAddress)
    const [ teamPoints, setTeamPoints ] = useState([])
    const [ matchPoints, setMatchPoints ] = useState(0)
    const [ showPoints , setShowPoints ] = useState(false)

    const {refetch: refetchState} = useContractRead({
       addressOrName: process.env.FRONT_MATCH_FACADE_ADDRESS as string,
       contractInterface: new Interface([
           "function getMatchInfo(address) public view returns (uint256 matchState, uint256 challenge, bool waitResponse, address shuffler, address playerTurn, uint256 bet)"
       ]),
       functionName: 'getMatchInfo',
       args: [matchAddress],
       onSuccess: (data) => {
           if (data.length > 1) {
               setMatchStateValue(parseInt(data.matchState.toString()))
               setCurrentChallenge(parseInt(data.challenge.toString()))
               setWaitResponse(data.waitResponse)
               setShuffler(data.shuffler.toString())
               setPlayerTurn(data.playerTurn.toString())
               //setMatchStateValue(data[1])
           }
            fetchPoints()
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
           if (data?.indexOf(accountAddress) >= 0) {
               setJoined(true)
           }
       }
    })

    const {refetch: fetchPoints } = useContractRead({
       addressOrName: process.env.FRONT_MATCH_FACADE_ADDRESS as string,
       contractInterface: new Interface([
           "function getMatchPoints(address) public view returns (uint8[] memory, uint8)"
       ]),
       functionName: 'getMatchPoints',
       args: [matchAddress],
       onSuccess: (data) => {
           if (data.length > 1) {
               setTeamPoints(data[0])
               setMatchPoints(data[1])
           }
       },
       onError: (err: Error) => {
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
            setPlayingDeal(true)
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
            //refetchState()
            setShuffler(event.newShuffler)
            setProcessingAction(false)
        },

    })
    
    return (
        <div className="text-gray-100">
            <p>
                {
                    MatchStateEnum[matchStateValue]
                }
            </p>
            <p className={`${playerTurn === accountAddress ? "text-amber-400" : "text-stone-400"}`}>
                {
                    playerTurn === accountAddress ?
                        "YOUR TURN"
                        : 
                            playerTurn ? `TURN OF ${walletParser(playerTurn)}`: ""
                }
            </p>
            <p>{waitResponse? "Waiting response...": ""}</p>
            <p>
                {
                    shuffler && accountAddress === shuffler ? `YOU'RE SHUFFLER` : ""
                }
            </p>
            <button onClick={() => {setShowPoints(currentShowPoints => !currentShowPoints)}} className="relative inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-medium text-gray-100 rounded-lg group bg-gradient-to-br from-cyan-500 to-blue-500 group-hover:from-cyan-500 group-hover:to-blue-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-cyan-800 ">
              <span className="relative px-2 py-1.5 transition-all ease-in duration-75 bg-gray-900 rounded-md group-hover:bg-opacity-0">
                  View match resume
              </span>
            </button>
            <Modal show={showPoints} title="Points" closeModal={() => {setShowPoints(currentShowPoints=> !currentShowPoints)}}>
                <p>Match address {matchAddress}</p>
                <p className="text-md">Current bet value: {betValue} Weis</p>
                <p>
                    {
                        currentChallenge && currentChallenge > 0 ? `Current challenge -> ${ChallengeTypes[currentChallenge]}` : ""
                    }
                </p>
                {teamPoints.map((point, index) => {
                    return <div key={index}>Team: <small>{index}</small> - Points: <small>{point}</small></div>
                })}
                <p>MatchPoints {matchPoints}</p>
            </Modal>
            
        </div>
    )
}
