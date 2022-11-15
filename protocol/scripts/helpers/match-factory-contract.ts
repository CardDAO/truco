import { ethers, upgrades } from "hardhat"

export async function deployMatchFactoryContract(engine: Engine, trucoin: Trucoin, trucoChampionsToken: TrucoChampionsToken, gameStateQueries: GameStateQueries, min_bet) {

    const TrucoMatchFactory = await ethers.getContractFactory(
        'TrucoMatchFactory'
    )
    const factory = await upgrades.deployProxy(TrucoMatchFactory, [
        engine.address,
        trucoin.address,
        trucoChampionsToken.address,
        gameStateQueries.address,
        min_bet,
    ])
    await factory.deployed()

    return { factory }
}
