import { Interface } from "ethers/lib/utils"
import { useEffect, useState } from "react"
import { useContractRead } from "wagmi"
import { CASTILLAN_CARDS } from "../../assets/castillan-cards"

export const OpponentInfo = ({ match, processingAction, playerTurn }) => {
    const [revealedCards, setRevealedCards] = useState([])
    const [envidoCount, setEnvidoCount ] = useState(0)
    console.log("QWEQWEEWQQEWQEWQWE")

    const { error, refetch: refreshData , data} = useContractRead({
        addressOrName: process.env.FRONT_MATCH_FACADE_ADDRESS as string,
        contractInterface: new Interface(['function getOpponentInfo(address) public view returns (uint8[3] memory, uint8)']),
        functionName: 'getOpponentInfo',
        enabled: true,
        args: [match],
        onSuccess: (data) => {
            console.log('data opponent', data)
            if (data) {
                setRevealedCards(data[0])
                setEnvidoCount(data[1])
            }
        },
        onError:(err: Error) => {
            console.log('ERROR: getdata opponent', err)
        },
        onSettled: (data) => {
            console.log('settled opponent' , data)
        }
    })

    useEffect(() => {
        console.log('refetching', data)
        refreshData({ throwOnError: true, cancelRefetch: false})
    }, [processingAction, playerTurn, refreshData, data])

    useEffect(() => {
        if(error) {
            console.log("ERROR OPPONENT",error)
        }

        //refreshData()
    }, [error])


    return (
        <div>
            <div><p>Cards</p>
            {
                revealedCards?.map((cardIndex) => {
                    console.log('cards', cardIndex)
                    return CASTILLAN_CARDS[parseInt(cardIndex)]
                })
            }
            </div>
            <div> <p>Envido</p>
            {
                envidoCount
            }
            </div>
        </div>
    )

}
