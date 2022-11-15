import { Interface } from "ethers/lib/utils"
import { useCallback, useEffect, useState } from "react"
import { useContractWrite, usePrepareContractWrite } from "wagmi"
import { CASTILLAN_CARDS } from "../../assets/castillan-cards"
import { GAS_LIMIT_WRITE } from "../Dashboard"

export const Card = ({ match, onChangeAction, setProcessingAction }) => {

    const [cardName, setCardName ] = useState("")
    const [ cleanCardIndex, setCleanCardIndex ] = useState(-1)

    const changeAndCallback = (event: any) => {
        setCleanCardIndex(parseInt(event.target.value))
        setCardName(CASTILLAN_CARDS[parseInt(event.target.value)])
        onChangeAction(event)
    }

    const [ goToSpell, setGoToSpell] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)


    const validateCard = useCallback(() => {
        if (CASTILLAN_CARDS[cleanCardIndex] === undefined) {
            setEnableAction(false)
        } else {
            setEnableAction(true)
        }
    }, [cleanCardIndex])

    const { config } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(["function playCard(uint8) public"]),
        functionName: "playCard",
        args: [ cleanCardIndex ],
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        onSuccess: (data) => {
            console.log(`can playCard (TRUE) with card ${cleanCardIndex}`, data)
            validateCard()
        },
        onError: (err: Error) => {
            console.log(`can't playCard (FALSE)`, err)
            setEnableAction(false)
        }
    })

    const { write, error, isLoading, data }= useContractWrite(config)
    useEffect(() => {
        validateCard()
    }, [validateCard])

    useEffect(() => {
        console.log('spell')
        if (error && goToSpell) {
            setGoToSpell(false)
            setProcessingAction(false)
        }
    }, [ error, goToSpell ])

    return (
        <div className="relative">
            <label className="block mb-2 text-sm font-medium text-gray-300">Card<span className="text-xs mx-2">{cardName}</span>
            <input onChange={changeAndCallback} type="text" className="block p-2 pl-5 w-full text-sm rounded-lg border bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500" />
            {
                enableAction ?
                    <button onClick={() => {
                        setGoToSpell(true) 
                        setProcessingAction(true)
                        write?.()
                    }} className="text-white absolute right-2.5 bottom-1.5 bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-800 font-medium rounded-lg text-sm px-2 py-1">
                        PlayCard
                    </button>
                : ""
            }
            </label>
        </div>
    )
}
