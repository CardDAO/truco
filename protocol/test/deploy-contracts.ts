import { ethers } from 'hardhat'
import { deployEnvidoResolverContract } from '../scripts/helpers/envido-resolver-deploy'
import { deployGameStateQueriesContract } from '../scripts/helpers/game-state-queries-deploy'
import { deployMatchFactoryContract } from '../scripts/helpers/match-factory-contract'
import { deployTrucoChampionsTokenContract } from '../scripts/helpers/truco-champions-token-deploy'
import { deployTrucoEngineContract } from '../scripts/helpers/truco-engine-deploy'
import { deployTrucoResolverContract } from '../scripts/helpers/truco-resolver-deploy'
import { deployTrucoinContract } from '../scripts/helpers/trucoin-deploy'

export async function deployDeckContract() {
    const CardsDeck = await ethers.getContractFactory('CastillianDeck')
    const cardsDeck = await CardsDeck.deploy()

    return { cardsDeck }
}

export async function deployEngineContract() {
    const { trucoin } = await deployTrucoinContract()

    const { trucoResolver } = await deployTrucoResolverContract()

    const { envidoResolver } = await deployEnvidoResolverContract()

    const { cardsDeck } = await deployDeckContract()

    const { gameStateQueries } = await deployGameStateQueriesContract(
        cardsDeck,
        envidoResolver,
        trucoResolver
    )

    const {engine } = await deployTrucoEngineContract(
        trucoin,
        trucoResolver,
        envidoResolver,
        gameStateQueries,
        true
    )

    return { engine, trucoin, gameStateQueries, cardsDeck }
}

export async function deployMatchContract() {
    // Contracts are deployed using the first signer/account by default
    const [player1, player2, invalid_player] = await ethers.getSigners()

    const { trucoin, engine, gameStateQueries, trucoChampionsToken } =
        await deployFactoryContract()

    // Minimum bet is the engine minimum fee divided by 2 players plus some extra
    const bet = (await engine.MINIMUM_FEE()).div(2).add(1000)

    // Transfer trucoins to players
    await trucoin.mint(player1.address, bet)
    await trucoin.mint(player2.address, bet)
    await trucoin.mint(invalid_player.address, bet)

    const TrucoMatch = await ethers.getContractFactory('TrucoMatchTester')
    const match = await TrucoMatch.deploy(
        engine.address,
        trucoin.address,
        trucoChampionsToken.address,
        gameStateQueries.address,
        player1.address,
        bet
    )

    await engine.setWhiteListed(match.address, true)

    // Approve trucoins to be used by the match contract
    await trucoin.connect(player1).approve(match.address, bet)
    await trucoin.connect(player2).approve(match.address, bet)

    return {
        match,
        engine,
        trucoin,
        player1,
        player2,
        invalid_player,
        bet,
        gameStateQueries,
    }
}

export async function deployFactoryContract() {
    const [owner] = await ethers.getSigners()

    const { trucoin, engine, gameStateQueries } = await deployEngineContract()

    const { trucoChampionsToken } = await deployTrucoChampionsTokenContract()

    // Minimum bet is the engine minimum fee divided by 2 players plus some extra
    const min_bet = (await engine.MINIMUM_FEE()).div(2).add(1000)

    const { factory } = await deployMatchFactoryContract(
        engine,
        trucoin,
        trucoChampionsToken,
        gameStateQueries,
        min_bet
    )

    await trucoChampionsToken.transferOwnership(factory.address)

    return {
        factory,
        engine,
        gameStateQueries,
        trucoin,
        trucoChampionsToken,
        owner,
        min_bet,
    }
}
