import { ethers } from 'hardhat'
import { GameStateQueries } from '../../typechain-types'

export async function deployFrontMatchFacadeContract(
    gameStateQueriesContract: GameStateQueries
) {
    const FrontMatchFacade = await ethers.getContractFactory('FrontMatchFacade')
    const frontMatchFacade = await FrontMatchFacade.deploy(
        gameStateQueriesContract.address
    )

    return { frontMatchFacade }
}
