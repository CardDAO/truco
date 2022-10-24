import { useEffect, useState, useCallback} from 'react'
import P2PT from "p2pt"
import { useTruco } from "../../engine/truco/useTruco"

export const Game = () => {

    const { 
        address,
        isConnected,
        game,
        setGame,
        recoveredAddress,
        signMessage,
        data,
        clickConnectToGame,
        inSession
    } = useTruco()


    return (
        <>
            {
                !isConnected ?
                    <h1 className="text-white text-4xl text-center align-middle">Connect wallet</h1>
                    :
                    !inSession ? 
                    <div className="text-center align-middle">
                        <h2 className="text-white text-xl py-5 text-center align-middle">Start game {address?.toString()}</h2>
                        <button type="button" className="text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:focus:ring-cyan-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2" onClick={() => { clickConnectToGame() }}>Join game</button>
                    </div>
                    :
                    <div className="text-center align-middle">
                        <h3 className="text-white text-xl">Jugadores</h3>
                        <div className="w-100 text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            { game.players.map((player, index) => {
                                console.log("listando jugador",player, index)
                                return (
                                    <button key={index} type="button" className="py-2 px-4 w-full font-medium text-left border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:hover:text-white dark:focus:ring-gray-500 dark:focus:text-white">
                                        {player.toString() ?? "undefined"}
                                    </button>
                                )

                            })}
                        </div>
                    </div>
            }
        </>
    )
}
