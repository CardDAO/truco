import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployEngineContract } from '../deploy-engine-contract'

import { BigNumber } from 'ethers'

import { TrucoMatch } from '../../typechain-types/contracts/TrucoMatch'
import { ChallengeEnum, ResponseEnum } from '../trucoV1/struct-enums'

describe('Multi Transaction Test: Envido', function () {
    const tokenAtStake = BigNumber.from(10)

    async function deployContract() {
        // Contracts are deployed using the first signer/account by default
        const [player1, player2, invalid_player] = await ethers.getSigners()

        const { trucoin, engine } = await deployEngineContract()

        // Transfer trucoins to players
        await trucoin.mint(player1.address, tokenAtStake)
        await trucoin.mint(player2.address, tokenAtStake)

        const TrucoMatch = await ethers.getContractFactory('TrucoMatchTester')
        const match = await TrucoMatch.deploy(
            engine.address,
            trucoin.address,
            tokenAtStake
        )

        // Approve trucoins to be used by the match contract
        await trucoin.connect(player1).approve(match.address, tokenAtStake)
        await trucoin.connect(player2).approve(match.address, tokenAtStake)

        // Owner stakes tokens
        await match.connect(player1).stake(0)

        // Player2 joins the match
        await match.connect(player2).join()

        return { match, engine, trucoin, player1, player2, invalid_player }
    }

    describe('Invalid Moves', function () {
        it('Envido when Envido was already Challenged', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellEnvido()

            await match.connect(player2).acceptChallengeForRaising()
            expect(match.connect(player2).spellEnvido()).to.be.reverted
        })

        it('Raising without accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellEnvido()

            expect(match.connect(player2).spellRealEnvido()).to.be.reverted
        })

        it('Lowering challenge', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellRealEnvido()

            await match.connect(player2).acceptChallengeForRaising()
            expect(match.connect(player2).spellEnvido()).to.be.reverted
        })

        it('Spelling envido count without accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellEnvido()

            expect(match.connect(player2).spellEnvidoCount(BigNumber.from(33)))
                .to.be.reverted
        })

        it('Spelling envido again after refusal', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellEnvido()
            await match.connect(player2).refuseChallenge()

            expect(match.connect(player1).spellEnvido()).to.be.reverted
        })

        it('Spelling invalid envido count', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellEnvido()
            await match.connect(player2).refuseChallenge()

            expect(match.connect(player2).spellEnvidoCount(BigNumber.from(34)))
                .to.be.reverted
        })

        it('Spelling refusal after accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellEnvido()
            await match.connect(player2).acceptChallenge()
            expect(match.connect(player2).refuseChallenge()).to.be.reverted
        })

        it('Out of turn Envido Count spelling', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellEnvido()
            await match.connect(player2).acceptChallenge()
            expect(match.connect(player1).spellEnvidoCount(BigNumber.from(33)))
                .to.be.reverted
        })
    })

    describe('Refusals', function () {
        it('Envido from None', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )
            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.None)
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellEnvido()

            state = await match.currentMatch()

            // Player 2 should respond
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            // State should be as follows
            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Envido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.true
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.None)
            )

            // TRANSACTION: Player 2 refuses challenge
            await match.connect(player2).refuseChallenge()

            state = await match.currentMatch()

            // PLayer 2 is mano, so it should hold the turn to spell envido count
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Envido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Refuse)
            )

            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                BigNumber.from(1)
            )
        })

        it('Envido raising to EnvidoEnvido', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellEnvido()

            // TRANSACTION: Player 2 accepts and raises the challenge
            await match.connect(player2).acceptChallengeForRaising()
            await match.connect(player2).spellEnvidoEnvido()

            // TRANSACTION: Player 2 refuses
            await match.connect(player1).refuseChallenge()

            let state: TrucoMatch.Match = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.EnvidoEnvido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Refuse)
            )

            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                BigNumber.from(2)
            )
        })

        it('FaltaEnvido from None', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellFaltaEnvido()

            // TRANSACTION: Player 2 accepts and raises the challenge
            await match.connect(player2).refuseChallenge()

            let state: TrucoMatch.Match = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.FaltaEnvido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Refuse)
            )

            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                BigNumber.from(1)
            )
        })

        it('FaltaEnvido from RealEnvido', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellRealEnvido()

            // TRANSACTION: Player 2 accepts and raises the challenge
            await match.connect(player2).acceptChallengeForRaising()
            await match.connect(player2).spellFaltaEnvido()

            // TRANSACTION: Player 1 refuses
            await match.connect(player1).refuseChallenge()

            let state: TrucoMatch.Match = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.FaltaEnvido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Refuse)
            )

            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                BigNumber.from(3)
            )
        })
    })
    describe('Acceptances', function () {
        it('RealEnvido Spell and Acceptance', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellRealEnvido()

            // TRANSACTION: Player 2 accepts the challenge
            await match.connect(player2).acceptChallenge()

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.RealEnvido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Accept)
            )
        })

        it('FaltaEnvido Spell and Acceptance', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellRealEnvido()

            // TRANSACTION: Player 2 accepts the challenge
            await match.connect(player2).acceptChallenge()

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.RealEnvido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Accept)
            )
        })

        it('Envido raising to EnvidoEnvido', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellEnvido()

            // TRANSACTION: Player 2 accepts the challenge
            await match.connect(player2).spellEnvidoEnvido()

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.EnvidoEnvido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.true
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.None)
            )
        })

        it('Complete Envido Flow: Spell envido, accept it, spell envido counts for each player', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.None)
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellEnvido()

            state = await match.currentMatch()

            // Player 2 should respond
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            // State should be as follows
            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Envido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.true
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.None)
            )

            // TRANSACTION: Player 2 accepts the challenge
            await match.connect(player2).acceptChallenge()

            // PLayer 2 is mano, so it should hold the turn to spell envido count
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Envido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Accept)
            )

            // TRANSACTION: Player 2 spells envido count
            await match.connect(player2).spellEnvidoCount(BigNumber.from(20))

            let envidoCount = await match.getEnvidoCountPerPlayer()

            state = await match.currentMatch()

            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )

            expect(envidoCount[1]).to.be.equal(BigNumber.from(20))
            // There should be no points rewarded at this stage
            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                BigNumber.from(0)
            )

            // TRANSACTION: Player 1 spells envido count and resolves envido
            await match.connect(player1).spellEnvidoCount(BigNumber.from(33))

            envidoCount = await match.getEnvidoCountPerPlayer()
            state = await match.currentMatch()

            expect(envidoCount[0]).to.be.equal(BigNumber.from(33))
            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                BigNumber.from(2)
            )

            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )
        })

        it('Complete Envido Flow with raising from Envido to RealEnvido', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellEnvido()

            // TRANSACTION: Player 2 accepts and raises to RealEnvido
            await match.connect(player2).acceptChallengeForRaising()
            await match.connect(player2).spellRealEnvido()

            // TRANSACTION: Player 1 accepts challenge
            await match.connect(player1).acceptChallenge()

            // TRANSACTION: Player 2 spells envido count
            await match.connect(player2).spellEnvidoCount(BigNumber.from(20))

            // TRANSACTION: Player 2 spells envido count and resolves envido
            await match.connect(player1).spellEnvidoCount(BigNumber.from(33))

            let envidoCount = await match.getEnvidoCountPerPlayer()
            let state = await match.currentMatch()

            expect(envidoCount[0]).to.be.equal(BigNumber.from(33))
            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                BigNumber.from(5)
            )

            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )
        })

        it('Complete Envido Flow with raising 2 times: from Envido, to EnvidoEnvido to FaltaEnvido', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellEnvido()

            // TRANSACTION: Player 2 accepts and raises to RealEnvido
            await match.connect(player2).acceptChallengeForRaising()
            await match.connect(player2).spellEnvidoEnvido()

            // TRANSACTION: Player 1 accepts challenge and raises to FaltaEnvido
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellFaltaEnvido()

            // TRANSACTION: Player 2 accepts and waits for envido count
            await match.connect(player2).acceptChallenge()
            await match.connect(player2).spellEnvidoCount(BigNumber.from(20))

            // TRANSACTION: Player 1 spells envido count
            await match.connect(player1).spellEnvidoCount(BigNumber.from(33))

            let envidoCount = await match.getEnvidoCountPerPlayer()
            let state = await match.currentMatch()

            expect(envidoCount[0]).to.be.equal(BigNumber.from(33))
            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                state.gameState.pointsToWin
            )
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )
        })
    })
    describe('Corner cases', function () {
        it('Spelling 0 as envido count (should go ok)', async function () {

            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellEnvido()
            await match.connect(player2).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(BigNumber.from(0))
            await match.connect(player1).spellEnvidoCount(BigNumber.from(33))

            let envidoCount = await match.getEnvidoCountPerPlayer()
            let state = await match.currentMatch()

            expect(envidoCount[0]).to.be.equal(BigNumber.from(33))
            expect(envidoCount[1]).to.be.equal(BigNumber.from(0))

            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                BigNumber.from(2)
            )
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )
        })
    })

})