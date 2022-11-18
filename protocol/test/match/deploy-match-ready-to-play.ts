import { ethers } from 'hardhat'
import { deployTrucoChampionsTokenContract } from '../../scripts/helpers/truco-champions-token-deploy'
import { deployMatchContract } from '../deploy-contracts'

async function setTrucoChampionsToken(_match: TrucoMatchTester) {
    const { trucoChampionsToken } = await deployTrucoChampionsTokenContract()

    // Since game will end we Prepare SBT NFT for winner in order to logic goes through
    await trucoChampionsToken.mint(_match.address)

    // Change SBT contract address to the one deployed in this test
    await _match.setTrucoChampionsTokenContractAddress(
        trucoChampionsToken.address
    )
    return trucoChampionsToken
}

export async function deployMatchContractReadyToPlay() {
    // Contracts are deployed using the first signer/account by default
    const [player1, player2] = await ethers.getSigners()

    const { match, trucoin, engine, gameStateQueries, bet } =
        await deployMatchContract()

    await engine.setWhiteListed(match.address, true)

    // Approve trucoins to be used by the match contract
    await trucoin.connect(player2).approve(match.address, bet)

    // Player2 joins the match
    await match.connect(player2).join()

    // Start deal
    await match.connect(player1).newDeal()

    const trucoChampionsToken = await setTrucoChampionsToken(match)

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
