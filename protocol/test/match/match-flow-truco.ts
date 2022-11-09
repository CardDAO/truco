import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployEngineContract } from '../deploy-contracts'

import { BigNumber } from 'ethers'

import { TrucoMatch } from '../../typechain-types/contracts/TrucoMatch'
import { ChallengeEnum, ResponseEnum } from '../trucoV1/struct-enums'

describe('Multi Transaction Test: Truco', function () {
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
        it('Spell Truco when Truco was already Challenged', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellTruco()

            await match.connect(player2).acceptChallengeForRaising()
            expect(match.connect(player2).spellTruco()).to.be.reverted
        })

        it('Raising without accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellTruco()

            expect(match.connect(player2).spellReTruco()).to.be.reverted
        })

        it('Spelling ReTruco without any previous challenge', async function () {
            const { match, player1 } = await loadFixture(deployContract)

            expect(match.connect(player1).spellReTruco()).to.be.reverted
        })

        it('Spelling same challenge', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellTruco()

            await match.connect(player2).acceptChallengeForRaising()
            expect(match.connect(player2).spellTruco()).to.be.reverted
        })

        it('Play card without accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellTruco()

            expect(match.connect(player2).playCard(BigNumber.from(1))).to.be
                .reverted
        })

        it('Playing an invalid card', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellTruco()
            await match.connect(player2).acceptChallenge()

            expect(match.connect(player2).playCard(BigNumber.from(41))).to.be
                .reverted
        })

        it('PLaying a card id that is used internally as a masked card indicator', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellTruco()
            await match.connect(player2).acceptChallenge()

            expect(match.connect(player2).playCard(BigNumber.from(0))).to.be
                .reverted
        })

        it('Spelling refusal after accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellTruco()
            await match.connect(player2).acceptChallenge()
            expect(match.connect(player2).refuseChallenge()).to.be.reverted
        })

        it('Out of turn Truco Count spelling', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.connect(player1).spellTruco()
            await match.connect(player2).acceptChallenge()
            expect(match.connect(player1).playCard(BigNumber.from(1))).to.be
                .reverted
        })
    })

    describe('Turn Handling', function () {
        it('Spelling Truco out of turn', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 1 should be the first to play
            expect(match.connect(player2).spellTruco()).to.be.reverted
        })

        it('Raising out of turn', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            await match.setPlayerTurn(BigNumber.from(1))

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            // TRANSACTION: Player 2 accepts the challenge but not for rising
            await match.connect(player1).acceptChallenge()
            expect(match.connect(player2).spellReTruco()).to.be.reverted
        })
    })
    describe('Refusals', function () {
        it('Truco from None', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellTruco()

            // TRANSACTION: Player 2 refuses
            await match.connect(player2).refuseChallenge()

            let state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Truco)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Refuse)
            )
            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(1)
            )
        })

        it('Retruco declined', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellTruco()

            let state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Truco)
            )

            // TRANSACTION: Player 2 accepts the challenge and raises to Retruco
            await match.connect(player2).acceptChallenge()
            await match.connect(player2).spellReTruco()

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.ReTruco)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.true
            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(2)
            )

            // TRANSACTION: Player 1 refuses
            await match.connect(player1).refuseChallenge()

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.ReTruco)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Refuse)
            )
            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(2)
            )
        })

        it('Vale4 declined', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellTruco()

            // TRANSACTION: Player 2 accepts the challenge and raises to Retruco
            await match.connect(player2).acceptChallengeForRaising()
            await match.connect(player2).spellReTruco()

            // TRANSACTION: Player 1 accepts and raises to Vale4
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellValeCuatro()

            // TRANSACTION: Player 2 refuses
            await match.connect(player2).refuseChallenge()

            let state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.ValeCuatro)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Refuse)
            )
            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(3)
            )
        })
    })
    describe('Acceptances', function () {
        it('Spell Truco with an acceptance', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellTruco()

            // TRANSACTION: Player 2 accepts the challenge
            await match.connect(player2).acceptChallenge()

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Truco)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Accept)
            )
            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(2)
            )
        })

        it('Truco raising to ReTruco', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellTruco()

            // TRANSACTION: Player 2 accepts the challenge
            await match.connect(player2).acceptChallenge()
            await match.connect(player2).spellReTruco()

            // TRANSACTION: Player 1 accepts and raises to Vale4
            await match.connect(player1).acceptChallenge()

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.ReTruco)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Accept)
            )
            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(3)
            )
        })

        it('Retruco raising to Vale4', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployContract
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            // TRANSACTION: Player 1 is the first to play (mano)
            await match.connect(player1).spellTruco()

            // TRANSACTION: Player 2 accepts the challenge
            await match.connect(player2).acceptChallengeForRaising()
            await match.connect(player2).spellReTruco()

            // TRANSACTION: Player 1 accepts and raises to Vale4
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellValeCuatro()

            // TRANSACTION: Player 2 accepts
            await match.connect(player2).acceptChallenge()

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.ValeCuatro)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Accept)
            )
            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(4)
            )
        })
    })
    describe('Corner cases', function () {})
    describe('Full State Assertions', function () {
        it('Complete Truco Flow: Spell truco, accept it, play rounds of cards till truco ends', async function () {
            const { match, player1, player2, engine } = await loadFixture(
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
            await match.connect(player1).spellTruco()

            state = await match.currentMatch()

            // Player 2 should respond
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            // State should be as follows
            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Truco)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.true
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.None)
            )

            // TRANSACTION: Player 2 accepts the challenge
            await match.connect(player2).acceptChallenge()

            state = await match.currentMatch()

            // PLayer 2 is mano, so it should hold the turn to play a card
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Truco)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Accept)
            )

            // TRANSACTION
            await match.connect(player2).playCard(BigNumber.from(3)) // 3 of Coins

            state = await match.currentMatch()

            // Now it's player 1 turn
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )

            let revealedCards = await match.getRevealedCards()
            expect(
                revealedCards[
                    await match.connect(player1).currentPlayerIdx()
                ][0]
            ).to.be.equal(BigNumber.from(0)) // Masked
            expect(
                revealedCards[
                    await match.connect(player2).currentPlayerIdx()
                ][0]
            ).to.be.equal(BigNumber.from(3)) // Just played

            // TRANSACTION
            await match.connect(player1).playCard(BigNumber.from(2)) // 2 of Coins

            state = await match.currentMatch()

            // Now it's player 1 turn
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            revealedCards = await match.getRevealedCards()
            expect(
                revealedCards[
                    await match.connect(player1).currentPlayerIdx()
                ][0]
            ).to.be.equal(BigNumber.from(2)) // Masked
            expect(
                revealedCards[
                    await match.connect(player2).currentPlayerIdx()
                ][0]
            ).to.be.equal(BigNumber.from(3)) // Just played

            // FIRST ROUND COMPLETE: Player 2 wins the round -----------------------------------------------------------

            // Truco should not be final at this step
            await engine.setGameState(state.gameState)
            expect(await engine.isTrucoFinal()).to.be.false

            // TRANSACTION
            await match.connect(player2).playCard(BigNumber.from(4)) // 4 of Coins

            state = await match.currentMatch()

            // Now it's player 1 turn
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )

            revealedCards = await match.getRevealedCards()
            expect(
                revealedCards[
                    await match.connect(player1).currentPlayerIdx()
                ][1]
            ).to.be.equal(BigNumber.from(0)) // Masked
            expect(
                revealedCards[
                    await match.connect(player2).currentPlayerIdx()
                ][1]
            ).to.be.equal(BigNumber.from(4)) // Just played

            // TRANSACTION
            await match.connect(player1).playCard(BigNumber.from(5)) // 5 of Coins

            state = await match.currentMatch()

            // Now it's player 1 turn
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            revealedCards = await match.getRevealedCards()
            expect(
                revealedCards[
                    await match.connect(player1).currentPlayerIdx()
                ][1]
            ).to.be.equal(BigNumber.from(5)) // Masked
            expect(
                revealedCards[
                    await match.connect(player2).currentPlayerIdx()
                ][1]
            ).to.be.equal(BigNumber.from(4)) // Just played

            // SECOND ROUND COMPLETE: Player 1 wins the round -----------------------------------------------------------

            // Truco should not be final at this step
            await engine.setGameState(state.gameState)
            expect(await engine.isTrucoFinal()).to.be.false

            // TRANSACTION
            await match.connect(player2).playCard(BigNumber.from(12)) // 2 of Cups

            state = await match.currentMatch()

            // Now it's player 1 turn
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )

            revealedCards = await match.getRevealedCards()
            expect(
                revealedCards[
                    await match.connect(player1).currentPlayerIdx()
                ][2]
            ).to.be.equal(BigNumber.from(0)) // Masked
            expect(
                revealedCards[
                    await match.connect(player2).currentPlayerIdx()
                ][2]
            ).to.be.equal(BigNumber.from(12)) // Just played

            // TRANSACTION
            await match.connect(player1).playCard(BigNumber.from(1)) // 1 of Cups

            state = await match.currentMatch()

            // Now it's player 1 turn
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            revealedCards = await match.getRevealedCards()
            expect(
                revealedCards[
                    await match.connect(player1).currentPlayerIdx()
                ][2]
            ).to.be.equal(BigNumber.from(1)) // Masked
            expect(
                revealedCards[
                    await match.connect(player2).currentPlayerIdx()
                ][2]
            ).to.be.equal(BigNumber.from(12)) // Just played

            await engine.setGameState(state.gameState)

            expect(await engine.isTrucoFinal()).to.be.true
        })
    })
})
