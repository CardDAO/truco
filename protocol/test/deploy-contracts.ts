import { ethers, upgrades } from 'hardhat'

export async function deployDeckContract() {
    const CardsDeck = await ethers.getContractFactory('CastillianDeck')
    const cardsDeck = await CardsDeck.deploy()

    return { cardsDeck }
}

export async function deployEngineContract() {
    const Trucoin = await ethers.getContractFactory('Trucoin')
    const trucoin = await Trucoin.deploy()

    const TrucoResolver = await ethers.getContractFactory('TrucoResolver')
    const trucoResolver = await TrucoResolver.deploy()

    const EnvidoResolver = await ethers.getContractFactory('EnvidoResolver')
    const envidoResolver = await EnvidoResolver.deploy()

    const { cardsDeck } = await deployDeckContract()

    const GameStateQueries = await ethers.getContractFactory('GameStateQueries')
    const gameStateQueries = await GameStateQueries.deploy(
        trucoResolver.address,
        envidoResolver.address,
        cardsDeck.address
    )

    const TrucoEngine = await ethers.getContractFactory('Engine2PlayersTester')
    const engine = await TrucoEngine.deploy(
        trucoin.address,
        trucoResolver.address,
        envidoResolver.address,
        gameStateQueries.address
    )

    return { engine, trucoin, gameStateQueries }
}

export async function deployMatchContract() {
    // Contracts are deployed using the first signer/account by default
    const [owner, player2, invalid_player] = await ethers.getSigners()

    const { trucoin, engine, gameStateQueries } = await deployEngineContract()

    // Minimum bet is the engine minimum fee divided by 2 players plus some extra
    const bet = (await engine.MINIMUM_FEE()).div(2).add(1000)

    // Transfer trucoins to players
    await trucoin.mint(owner.address, bet)
    await trucoin.mint(player2.address, bet)
    await trucoin.mint(invalid_player.address, bet)

    const TrucoMatch = await ethers.getContractFactory('TrucoMatch')
    const match = await TrucoMatch.deploy(
        engine.address,
        trucoin.address,
        gameStateQueries.address,
        bet
    )

    return { match, engine, trucoin, owner, player2, invalid_player, bet }
}

export async function deployFactoryContract() {
    const [owner] = await ethers.getSigners()

    const { trucoin, engine, gameStateQueries } = await deployEngineContract()

    // Minimum bet is the engine minimum fee divided by 2 players plus some extra
    const min_bet = (await engine.MINIMUM_FEE()).div(2).add(1000)

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

    return { factory, trucoin, owner, min_bet }
}
