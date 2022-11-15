import { ethers } from 'hardhat'

export async function deployGameStateQueriesContract(
    cardsDeck: CardsDeck,
    envidoResolver: EnvidoResolver,
    trucoResolver: TrucoResolver
) {
    const GameStateQueries = await ethers.getContractFactory('GameStateQueries')
    const gameStateQueries = await GameStateQueries.deploy(
        trucoResolver.address,
        envidoResolver.address,
        cardsDeck.address
    )
    return { gameStateQueries }
}
