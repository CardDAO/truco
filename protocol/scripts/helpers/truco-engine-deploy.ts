import { ethers } from "hardhat";

export async function deployEnvidoResolverContract(
    trucoin: Trucoin,
    trucoResolver: TrucoResolver,
    envidoResolver: envidoResolver,
    gameStateQueries: GameStateQueries
) {
    const TrucoEngine = await ethers.getContractFactory('Engine2PlayersTester')
    const engine = await TrucoEngine.deploy(
        trucoin.address,
        trucoResolver.address,
        envidoResolver.address,
        gameStateQueries.address
    )
    return { engine }
}
