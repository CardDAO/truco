import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployMatchContract } from '../deploy-contracts'

import { BigNumber } from 'ethers'

import { TrucoMatch } from '../../typechain-types/contracts/TrucoMatch'
import { ChallengeEnum, ResponseEnum } from '../trucoV1/struct-enums'

describe('Multi Transaction Test: Envido', function () {
    async function deployContract() {
        // Contracts are deployed using the first signer/account by default
        const [player1, player2, invalid_player] = await ethers.getSigners()

        const { match, trucoin, engine, gameStateQueries, bet } =
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
            trucoin,
            player1,
            player2,
            invalid_player,
            gameStateQueries,
        }
    }

    describe('Invalid Moves', function () {
        it('Envido when Envido was already Challenged', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellEnvido()

            await match.connect(player1).acceptChallengeForRaising()
            await expect(match.connect(player1).spellEnvido()).to.be.reverted
        })

        it('Lowering challenge', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellRealEnvido()

            await match.connect(player1).acceptChallengeForRaising()
            await expect(match.connect(player1).spellEnvido()).to.be.reverted
        })

        it('Spelling envido count without accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellEnvido()

            await expect(
                match.connect(player1).spellEnvidoCount(BigNumber.from(33))
            ).to.be.reverted
        })

        it('Spelling envido again after refusal', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).refuseChallenge()

            await expect(match.connect(player2).spellEnvido()).to.be.reverted
        })

        it('Spelling envido after first round of cards were revealed', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).playCard(BigNumber.from(22))
            await match.connect(player1).playCard(BigNumber.from(33))

            await expect(match.connect(player2).spellEnvido()).to.be.reverted
        })

        it('Spelling envido after second round of cards were revealed', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).playCard(BigNumber.from(22))
            await match.connect(player1).playCard(BigNumber.from(33))

            await match.connect(player1).playCard(BigNumber.from(11))
            await match.connect(player2).playCard(BigNumber.from(12))

            await expect(match.connect(player2).spellEnvido()).to.be.reverted
        })

        it('Spelling invalid envido count', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).refuseChallenge()

            await expect(
                match.connect(player1).spellEnvidoCount(BigNumber.from(34))
            ).to.be.reverted
        })

        it('Spelling an envido count that is used internally as "not spelled" indicator', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).refuseChallenge()

            await expect(
                match.connect(player2).spellEnvidoCount(BigNumber.from(99))
            ).to.be.reverted
        })

        it('Spelling refusal after accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()
            await expect(match.connect(player1).refuseChallenge()).to.be
                .reverted
        })

        it('Out of turn Envido Count spelling', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()
            await expect(
                match.connect(player1).spellEnvidoCount(BigNumber.from(33))
            ).to.be.reverted
        })
    })

    describe('Refusals', function () {
        it('Envido from None', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )
            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.None)
            )

            // TRANSACTION: Player 2 is the first to play (mano)
            await expect(match.connect(player2).spellEnvido())
                .to.emit(match, 'TurnSwitch')
                .withArgs(player1.address)

            state = await match.currentMatch()

            // Player 1 should respond
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
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

            // TRANSACTION: Player 1 refuses challenge
            await expect(match.connect(player1).refuseChallenge())
                .to.emit(match, 'TurnSwitch')
                .withArgs(player2.address)

            state = await match.currentMatch()

            // PLayer 2 is mano, so it remains his turn
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
            await match.connect(player2).spellEnvido()

            // TRANSACTION: Player 2 accepts and raises the challenge
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellEnvidoEnvido()

            // TRANSACTION: Player 2 refuses
            await match.connect(player2).refuseChallenge()

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
            await match.connect(player2).spellFaltaEnvido()

            // TRANSACTION: Player 2 accepts and raises the challenge
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
                BigNumber.from(1)
            )
        })

        it('FaltaEnvido from RealEnvido', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player2).spellRealEnvido()

            // TRANSACTION: Player 2 accepts and raises the challenge
            await expect(
                match.connect(player1).acceptChallengeForRaising()
            ).to.not.emit(match, 'TurnSwitch') // turn should not change
            await match.connect(player1).spellFaltaEnvido()

            // TRANSACTION: Player 1 refuses
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

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellRealEnvido()

            // TRANSACTION: Player 1 accepts the challenge
            await match.connect(player1).acceptChallenge()

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

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellRealEnvido()

            // TRANSACTION: Player 1 accepts the challenge
            await match.connect(player1).acceptChallenge()

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
            await match.connect(player2).spellEnvido()

            // TRANSACTION: Player 2 accepts the challenge
            await match.connect(player1).spellEnvidoEnvido()

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

        it('Complete Envido Flow with raising from Envido to RealEnvido', async function () {
            const { match, player1, player2, engine } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellEnvido()

            // TRANSACTION: Player 1 accepts and raises to RealEnvido
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellRealEnvido()

            // TRANSACTION: Player 2 accepts challenge
            await match.connect(player2).acceptChallengeForRaising()

            // TRANSACTION: Player 2 spells envido count (its mano)
            await match.connect(player2).spellEnvidoCount(BigNumber.from(20))

            // TRANSACTION: Player 1 spells envido count and resolves envido
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
            engine.setGameState(state.gameState)
            expect(await engine.getEnvidoWinner()).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )
        })

        it('Complete Envido Flow with raising 2 times: from Envido, to EnvidoEnvido to FaltaEnvido', async function () {
            const { match, player1, player2, engine } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellEnvido()

            // TRANSACTION: Player 1 accepts and raises to RealEnvido
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellEnvidoEnvido()

            // TRANSACTION: Player 2 accepts challenge and raises to FaltaEnvido
            await match.connect(player2).acceptChallengeForRaising()
            await match.connect(player2).spellFaltaEnvido()

            // TRANSACTION: Player 1 accepts and waits for envido count
            await match.connect(player1).acceptChallenge()

            // TRANSACTION: Player 2 spells envido count
            await match.connect(player2).spellEnvidoCount(BigNumber.from(33))

            // TRANSACTION: Player 1 spells envido count
            await match.connect(player1).spellEnvidoCount(BigNumber.from(20))

            let envidoCount = await match.getEnvidoCountPerPlayer()
            let state = await match.currentMatch()

            expect(envidoCount[0]).to.be.equal(BigNumber.from(20))
            expect(envidoCount[1]).to.be.equal(BigNumber.from(33))

            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                state.gameState.pointsToWin
            )
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            engine.setGameState(state.gameState)
            expect(await engine.getEnvidoWinner()).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )
        })
    })
    describe('Corner cases', function () {
        it('Spelling 0 as envido count (should go ok)', async function () {
            const { match, player1, player2, engine } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

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

            engine.setGameState(state.gameState)
            expect(await engine.getEnvidoWinner()).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )
        })
        it('Spelling  envido after truco was accepted (should not go ok)', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallenge()

            await expect(match.connect(player2).spellEnvido()).to.be.reverted
        })

        it('Spelling envido when truco was challenged: Envido in first place!!', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).spellTruco()
            // Envido is in first place, baby! ;)
            await match.connect(player1).spellEnvido()

            let state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Envido)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.true
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ChallengeEnum.None)
            )
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )
        })

        it('Spelling envido when truco was challenged but a card was played by player who should respond', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player2).playCard(BigNumber.from(1))
            await match.connect(player1).spellTruco()

            // Envido can't be spelled if player already played a card
            await expect(match.connect(player2).spellEnvido()).to.be.reverted
        })
    })
    describe('Full State Assertions', function () {
        it('Complete Envido Flow: Spell envido, accept it, spell envido counts for each player', async function () {
            const { match, player1, player2, engine } = await loadFixture(
                deployContract
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            // Envido should not be final at this step
            await engine.setGameState(state.gameState)
            expect(await engine.isEnvidoFinal()).to.be.false

            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.None)
            )

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellEnvido()

            state = await match.currentMatch()

            // Envido should not be final at this step
            await engine.setGameState(state.gameState)
            expect(await engine.isEnvidoFinal()).to.be.false

            // Player 1 should respond
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
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

            // TRANSACTION: Player 1 accepts the challenge
            await match.connect(player1).acceptChallenge()

            state = await match.currentMatch()

            // PLayer 2 is mano, so it should hold the turn to spell envido count
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            // Envido should not be final at this step
            await engine.setGameState(state.gameState)
            expect(await engine.isEnvidoFinal()).to.be.false

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

            // Envido should not be final at this step
            await engine.setGameState(state.gameState)
            expect(await engine.isEnvidoFinal()).to.be.false

            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )

            expect(envidoCount[1]).to.be.equal(BigNumber.from(20))
            // There should be no points rewarded at this stage
            expect(state.gameState.envido.pointsRewarded).to.be.equal(
                BigNumber.from(0)
            )

            // TRANSACTION: Player 1 spells envido count and resolves envido

            await expect(
                match.connect(player1).spellEnvidoCount(BigNumber.from(33))
            )
                .to.emit(match, 'TurnSwitch')
                .withArgs(player2.address) // turn should return to player2

            state = await match.currentMatch()

            // Envido SHOULD BE final at this step
            await engine.setGameState(state.gameState)
            expect(await engine.isEnvidoFinal()).to.be.true
            expect(await engine.getEnvidoWinner()).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )

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
    })
})
