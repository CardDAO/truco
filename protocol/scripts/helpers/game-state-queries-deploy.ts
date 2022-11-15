import { ethers, upgrades } from 'hardhat'

export async function deployGameStateQueriesContract(
    cardsDeck: CardsDeck,
    envidoResolver: EnvidoResolver,
    trucoResolver: TrucoResolver
) {
    const GameStateQueries = await ethers.getContractFactory('GameStateQueries')
    const gameStateQueries = await upgrades.deployProxy(GameStateQueries, [
        trucoResolver.address,
        envidoResolver.address,
        cardsDeck.address,
    ])
    await gameStateQueries.deployed()

    return { gameStateQueries }
}
