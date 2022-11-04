import { useContext } from "react"
import { GameContext } from "../../../engine/truco/useTruco"
import { StateEnum } from "../../../hooks/enums"

export const InitCommunication = ({signMessage: any}) => {
    const game = useContext(GameContext)

    const sayHelloAll = () => {
        signMessage({
            message: JSON.stringify({
                topic: 'hello',
                data: { cardCodewordFragments: newGame.self.cardCodewordFragments },
                nonce: 0 // replaced by the method
            }) 
        })
    }
    if (game.state === StateEnum.WAITING_PLAYERS) {
        return (
            <button className="text-white bg-gradient-to-r from-gray-500 to-stone-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-gray-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2" onClick={() => sayHelloAll()}> Init shuffling</button>
        )
    }

    return (<></>)
}
