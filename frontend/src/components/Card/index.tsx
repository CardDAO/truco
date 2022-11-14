import { useState } from "react"
import { CASTILLAN_CARDS } from "../../assets/castillan-cards"

export const Card = ({onChangeAction}) => {

    const [cardName, setCardName ] = useState("")

    const changeAndCallback = (event) => {
        setCardName(CASTILLAN_CARDS[parseInt(event.target.value)])
        onChangeAction(event)
    }

    return (
        <div>
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Card<span className="text-xs mx-2">{cardName}</span>
            <input onChange={changeAndCallback} type="text" className="block p-2 w-full text-gray-900 bg-gray-50 rounded-lg border border-gray-300 sm:text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
            </label>
        </div>
    )
}
