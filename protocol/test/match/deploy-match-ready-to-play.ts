import { ethers } from 'hardhat'
import { deployMatchContract } from '../deploy-contracts'

export async function deployMatchContractReadyToPlay() {
    // Contracts are deployed using the first signer/account by default
    const [player1, player2] = await ethers.getSigners()

    const { match, trucoin, trucoChampionsToken, engine, gameStateQueries, bet } =
        await deployMatchContract()

    await engine.setWhiteListed(match.address, true)

    // Approve trucoins to be used by the match contract
    await trucoin.connect(player2).approve(match.address, bet)

    // Player2 joins the match
    await match.connect(player2).join()

    // Start deal
    await match.connect(player1).newDeal()

    return {
        match,
        engine,
        player1,
        player2,
        gameStateQueries,
        trucoin,
        trucoChampionsToken,
    }
}
