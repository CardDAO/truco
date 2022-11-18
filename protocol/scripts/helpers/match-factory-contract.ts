import { ethers, upgrades } from 'hardhat'
import {
    GameStateQueries,
    SignatureValidation,
    TrucoChampionsToken,
    Trucoin,
} from '../../typechain-types'
import { Engine } from '../../typechain-types/contracts/trucoV1/Engine'
import { deploySignatureValidation } from './signature-validation-deploy'

export async function deployMatchFactoryContract(
    engine: Engine,
    trucoin: Trucoin,
    trucoChampionsToken: TrucoChampionsToken,
    gameStateQueries: GameStateQueries,
    min_bet
) {
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
