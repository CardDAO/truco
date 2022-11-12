import { useCallback } from "react"
import { GameContext } from '../../Dashboard'
import { StateEnum } from "../../../hooks/enums"
export const sayHelloAll = async (signMessage, latestNonce, self, state) => {
    signMessage({
        message: JSON.stringify({
            topic: 'hello',
            data: { cardCodewordFragments: self.cardCodewordFragments },
            nonce: latestNonce+1 // replaced by the method
        }) 
    })
}

export const InitCommunication = ({signMessage, latestNonce, self, state, setState}: any) => {
    const initCommunication = useCallback(async () => {
        setState(StateEnum.SHOULD_INIT_SHUFFLING)
        await sayHelloAll(signMessage, latestNonce, self, state)
    }, [signMessage, latestNonce, self, state])

    if (state === StateEnum.WAITING_PLAYERS) {
        return (
            <button
                className="text-white bg-gradient-to-r from-gray-500 to-stone-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-gray-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
                onClick={async () => await initCommunication()}
            >
                Share codewords
            </button>
        )
    }

    return (<></>)
}
