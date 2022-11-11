import { expect } from 'chai'

import { IERC3333 } from '../../typechain-types/contracts/trucoV1/interfaces/IERC3333'
import { ChallengeEnum } from './struct-enums'
import { deployEngineContract } from '../deploy-contracts'

import MoveStruct = IERC3333.MoveStruct
import TransactionStruct = IERC3333.TransactionStruct

import { BigNumber } from 'ethers'
import {ethers} from "hardhat";

describe('Engine Main Logic', function () {
    describe('Turn handling', function () {
        it('Incorrect turn', async function () {
            const { engine } = await deployEngineContract()

            let state = await engine.initialGameState()

            let move: MoveStruct = {
                action: BigNumber.from(ChallengeEnum.None),
                parameters: [],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn + 1,
                moves: [move],
                state: state,
            }

            await expect(
                engine.executeTransaction(transaction)
            ).to.be.revertedWith('Incorrect player turn')
        })
    })

    describe('Fee collection at Game start', function () {

        it('Account with funds, no allowance', async function () {
            const { engine, trucoin } = await deployEngineContract()

            let signer = await ethers.getSigner();

            // Un-whitelisted player
            engine.setWhiteListed(engine.address, false);

            // Duplicate minimum fee
            trucoin.mint(signer.address, (await engine.MINIMUM_FEE()).mul(2));

            await expect(engine.startGame()).to.be.revertedWith('ERC20: insufficient allowance')
        })

        it('Account allowance, no funds', async function () {
            const { engine, trucoin } = await deployEngineContract()

            let signer = await ethers.getSigner();

            // Un-whitelisted player
            engine.setWhiteListed(engine.address, false);

            let fees = await engine.getFees()

            trucoin.approve(engine.address, fees)

            await expect(engine.startGame()).to.be.revertedWith('ERC20: insufficient allowance')
        })

        it('Allowance ok, but minimum balance to cover fee not met', async function () {
            const { engine, trucoin } = await deployEngineContract()

            let signer = await ethers.getSigner();

            // Un-whitelisted player
            engine.setWhiteListed(engine.address, false);

            // Duplicate minimum fee
            trucoin.mint(signer.address, (await engine.MINIMUM_FEE()).sub(1));

            let fees = await engine.getFees()

            trucoin.approve(engine.address, fees)

            await expect(engine.startGame()).to.be.revertedWith('ERC20: insufficient allowance')
        })


        it('Sufficient funds, but insufficient allowance', async function () {
            const { engine, trucoin } = await deployEngineContract()

            let signer = await ethers.getSigner();

            // Un-whitelisted player
            engine.setWhiteListed(engine.address, false);

            // Duplicate minimum fee
            trucoin.mint(signer.address, (await engine.MINIMUM_FEE()).mul(2));

            let fees = await engine.getFees()

            trucoin.approve(engine.address, fees.sub(1))

            await expect(engine.startGame()).to.be.revertedWith('ERC20: insufficient allowance')
        })

        it('Start game ok', async function () {
            const { engine, trucoin } = await deployEngineContract()

            let signer = await ethers.getSigner()

            // Un-whitelisted player
            engine.setWhiteListed(engine.address, false);

            let fees = await engine.MINIMUM_FEE()

            // Duplicate fees needed
            await trucoin.mint(signer.address, await fees.mul(2));

            // Approve allowance
            await trucoin.approve(engine.address, await engine.getFees())

            await expect(engine.startGame()).to.emit(
                engine,
                'MatchStarted'
            ).withArgs(signer.address, fees)
            .to.changeTokenBalance(trucoin, signer.address, fees.mul(-1))
            .to.changeTokenBalance(trucoin, engine.address, fees)
        })

    })
})
