import { ContractFactory } from 'ethers'
import { ethers, upgrades } from 'hardhat'

export async function deployTrucoEngineContract(
    trucoin: Trucoin,
    trucoResolver: TrucoResolver,
    envidoResolver: envidoResolver,
    gameStateQueries: GameStateQueries,
    test: boolean
) {
    let TrucoEngine: ContractFactory
    if (test)
        TrucoEngine = await ethers.getContractFactory('Engine2PlayersTester')
    else TrucoEngine = await ethers.getContractFactory('Engine2Players')
    const engine = await upgrades.deployProxy(TrucoEngine, [
        trucoin.address,
        trucoResolver.address,
        envidoResolver.address,
        gameStateQueries.address,
    ])
    await engine.deployed()
    return { engine }
}
