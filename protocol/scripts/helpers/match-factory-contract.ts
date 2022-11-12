import { ethers, upgrades } from "hardhat"

export async function deployMatchFactoryContract(engine: Engine, trucoin: Trucoin, gameStateQueries: GameStateQueries, min_bet) {

    const TrucoMatchFactory = await ethers.getContractFactory(
        'TrucoMatchFactory'
    )
    const factory = await upgrades.deployProxy(TrucoMatchFactory, [
        engine.address,
        trucoin.address,
        gameStateQueries.address,
        min_bet,
    ])
    await factory.deployed()

    return { factory }
}
