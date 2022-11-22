import { Interface } from "ethers/lib/utils"
import { useEffect, useState } from "react"
import { useContractRead } from "wagmi"
import { CASTILLAN_CARDS } from "../../assets/castillan-cards"
import { GraphicCard } from "../GraphicCard"

export const OpponentInfo = ({ playerAddress, match, processingAction, playerTurn }) => {
    const [revealedCards, setRevealedCards] = useState([])
    const [envidoCount, setEnvidoCount ] = useState(0)

    const { error, refetch: refreshData , data} = useContractRead({
        addressOrName: process.env.FRONT_MATCH_FACADE_ADDRESS as string,
        contractInterface: new Interface(['function getOpponentInfo(address) public view returns (uint8[3] memory, uint8)']),
        functionName: 'getOpponentInfo',
        enabled: true,
        args: [match],
        overrides: {
            from: playerAddress
        },
        onSuccess: (data) => {
            if (data) {
                setRevealedCards(data[0])
                setEnvidoCount(data[1])
            }
        },
        onError:(err: Error) => {
            console.log('ERROR: getdata opponent', err)
        },
    })

    useEffect(() => {
        refreshData({ throwOnError: true, cancelRefetch: false})
    }, [processingAction, playerTurn, refreshData, data])

    useEffect(() => {
        if(error) {
            console.log("ERROR getdata opponent",error)
        }
    }, [error])


    return (
        <div>
            <div><p className="text-sm text-red-600">Opponent</p>
            {
                revealedCards?.map((cardIndex, indexKey) => {
                    return <GraphicCard key={indexKey} cardIndex={parseInt(cardIndex)} />
                })
            }
            </div>
            <div> <p>Envido <span>
            {
                envidoCount >= 0 && envidoCount <=33 ? envidoCount : " - "
            }</span></p>
            </div>
        </div>
    )

}
