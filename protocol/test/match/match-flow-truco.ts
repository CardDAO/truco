import { expect } from 'chai'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployMatchContractReadyToPlay } from './deploy-match-ready-to-play'

import { BigNumber } from 'ethers'

import { TrucoMatch } from '../../typechain-types/contracts/TrucoMatch'
import { ChallengeEnum, ResponseEnum } from '../trucoV1/struct-enums'

describe('Multi Transaction Test: Truco', function () {
    describe('Invalid Moves', function () {
        it('Spell Truco when Truco was already Challenged', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()

            await match.connect(player1).acceptChallengeForRaising()
            await expect(match.connect(player1).spellTruco()).to.be.reverted
        })

        it('Raising without accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()

            await expect(match.connect(player1).spellReTruco()).to.be.reverted
        })

        it('Spelling ReTruco without any previous challenge', async function () {
            const { match, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await expect(match.connect(player2).spellReTruco()).to.be.reverted
        })

        it('Spelling same challenge', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()

            await match.connect(player1).acceptChallengeForRaising()
            await expect(match.connect(player1).spellTruco()).to.be.reverted
        })

        it('Play card without accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()

            await expect(match.connect(player1).playCard(BigNumber.from(1), [])).to
                .be.reverted
        })

        it('Playing an invalid card', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallenge()

            await expect(match.connect(player1).playCard(BigNumber.from(41), [])).to
                .be.reverted
        })

        it('PLaying a card id that is used internally as a masked card indicator', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallenge()

            await expect(match.connect(player1).playCard(BigNumber.from(0), [])).to
                .be.reverted
        })

        it('Spelling refusal after accepting', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallenge()
            await expect(match.connect(player1).refuseChallenge()).to.be
                .reverted
        })

        it('Out of turn Truco Count spelling', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallenge()
            await expect(match.connect(player1).playCard(BigNumber.from(1), [])).to
                .be.reverted
        })
    })

    describe('Turn Handling', function () {
        it('Spelling Truco out of turn', async function () {
            const { match, player1 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            // TRANSACTION: Player 1 should be the first to play
            await expect(match.connect(player1).spellTruco()).to.be.reverted
        })

        it('Raising out of turn', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.setPlayerTurn(
                await match.connect(player2).currentPlayerIdx()
            )

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            // TRANSACTION: Player 2 accepts the challenge but not for rising
            await match.connect(player1).acceptChallenge()
            await expect(match.connect(player1).spellReTruco()).to.be.reverted
        })

        it('Playing card out of turn: after round 1', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.setPlayerTurn(
                await match.connect(player2).currentPlayerIdx()
            )

            // Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            // Player 2 accepts the challenge but not for rising
            await match.connect(player1).acceptChallenge()

            // First round of cards wins player 1
            await match.connect(player2).playCard(BigNumber.from(2), []) // 2 of Coins
            await match.connect(player1).playCard(BigNumber.from(3), []) // 3 of Coins

            // Player 1 won first round, so it's player1 turn
            await expect(match.connect(player2).playCard(BigNumber.from(5), [])).to
                .be.reverted
        })

        it('Playing card out of turn: after round 2', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.setPlayerTurn(
                await match.connect(player2).currentPlayerIdx()
            )

            // Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            // Player 2 accepts the challenge but not for rising
            await match.connect(player1).acceptChallenge()

            // Round 1
            await match.connect(player2).playCard(BigNumber.from(2), []) // 2 of Coins
            await match.connect(player1).playCard(BigNumber.from(3), []) // 3 of Coins

            // Round 2: Player 1 won first round, so it's player1 turn
            await match.connect(player1).playCard(BigNumber.from(14), [])
            await match.connect(player2).playCard(BigNumber.from(5), [])

            // Player 2 won round 2, so it's player 2 turn
            await expect(match.connect(player1).playCard(BigNumber.from(7), [])).to
                .be.reverted
        })

        it('No truco spelled, but playing cards', async function () {
            const { match, player1, player2, engine } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.setPlayerTurn(
                await match.connect(player2).currentPlayerIdx()
            )

            // Round 1
            await match.connect(player2).playCard(BigNumber.from(2), []) // 2 of Coins
            await match.connect(player1).playCard(BigNumber.from(3), []) // 3 of Coins

            // Round 2: Player 1 won first round, so it's player1 turn
            await match.connect(player1).playCard(BigNumber.from(14), []) // 4 of Cups
            await match.connect(player2).playCard(BigNumber.from(5), []) // 5 of Coins

            // Player 2 won round 2, so it's player 2 turn
            await match.connect(player2).playCard(BigNumber.from(13), []) // 3 of Cups
            await match.connect(player1).playCard(BigNumber.from(22), []) // 2 of Swords

            let state = await match.currentMatch()

            await engine.setGameState(state.gameState)

            expect(await engine.isTrucoFinal()).to.be.true
            expect(await engine.getTrucoWinner()).to.equal(
                await match.connect(player2).currentPlayerIdx()
            )
            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(1)
            )
        })

        it('No truco spelled, but playing cards, draw on first round', async function () {
            const { match, player1, player2, engine } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.setPlayerTurn(
                await match.connect(player2).currentPlayerIdx()
            )

            // Round 1
            await match.connect(player2).playCard(BigNumber.from(2), []) // 2 of Coins
            await match.connect(player1).playCard(BigNumber.from(12), []) // 2 of Cups

            // Previous round was a draw, mano should play next
            await expect(match.connect(player1).playCard(BigNumber.from(14), [])).to
                .be.reverted
        })

        it('No truco spelled, but playing cards, draw on first round', async function () {
            const { match, player1, player2, engine } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.setPlayerTurn(
                await match.connect(player2).currentPlayerIdx()
            )

            // Round 1
            await match.connect(player2).playCard(BigNumber.from(2), []) // 2 of Coins
            await match.connect(player1).playCard(BigNumber.from(12), []) // 2 of Cups

            // Round 2
            await match.connect(player2).playCard(BigNumber.from(3), []) // 3 of Coins
            await match.connect(player1).playCard(BigNumber.from(15), []) // 5 of Cups

            // Match finalized at round 2
            let state = await match.currentMatch()

            await engine.setGameState(state.gameState)

            expect(await engine.isTrucoFinal()).to.be.true
            expect(await engine.getTrucoWinner()).to.equal(
                await match.connect(player2).currentPlayerIdx()
            )
            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(1)
            )
        })

        it('No truco spelled, draw on 1st and 2nd round ', async function () {
            const { match, player1, player2, engine } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.setPlayerTurn(
                await match.connect(player2).currentPlayerIdx()
            )

            // Round 1
            await match.connect(player2).playCard(BigNumber.from(2), []) // 2 of Coins
            await match.connect(player1).playCard(BigNumber.from(22), []) // 3 of Coins

            // Round 2 - (Draw on round 1)
            await match.connect(player2).playCard(BigNumber.from(3), []) // 4 of Cups
            await match.connect(player1).playCard(BigNumber.from(23), []) // 5 of Coins

            // Previous round was a draw, mano should play next
            await expect(match.connect(player1).playCard(BigNumber.from(14), [])).to
                .be.reverted
        })

        it('No truco spelled, draw on 1st and 2nd round and 3rd round, mano should win', async function () {
            const { match, player1, player2, engine } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.setPlayerTurn(
                await match.connect(player2).currentPlayerIdx()
            )

            // Round 1
            await expect(match.connect(player2).playCard(BigNumber.from(2), []))
                .to.emit(match, 'TurnSwitch')
                .withArgs(player1.address) // 2 of Coins
            await expect(match.connect(player1).playCard(BigNumber.from(22), []))
                .to.emit(match, 'TurnSwitch')
                .withArgs(player2.address) // 3 of Coins

            // Round 2: Player 1 won first round, so it's player1 turn
            await match.connect(player2).playCard(BigNumber.from(3), []) // 4 of Cups
            await match.connect(player1).playCard(BigNumber.from(23), []) // 5 of Coins

            // Player 2 won round 2, so it's player 2 turn
            await match.connect(player2).playCard(BigNumber.from(4), []) // 3 of Cups
            await expect(
                await match.connect(player1).playCard(BigNumber.from(14), [])
            ).to.not.emit(match, 'TurnSwitch') // 2 of Swords  (turn shouldn't switch because it's final)

            let state = await match.currentMatch()

            await engine.setGameState(state.gameState)

            expect(await engine.isTrucoFinal()).to.be.true
            expect(await engine.getTrucoWinner()).to.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(1)
            )
        })

        it('Spelling Truco after an Envido refused', async function () {
            const { match, player1, player2, engine } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.setPlayerTurn(
                await match.connect(player2).currentPlayerIdx()
            )

            await match.connect(player2).spellTruco()

            await match.connect(player1).spellEnvido()
            await match.connect(player2).refuseChallenge()

            let state = await match.currentMatch()

            await engine.setGameState(state.gameState)

            expect(await engine.isEnvidoFinal()).to.be.true
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.false
            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Envido)
            )
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Refuse)
            )

            // After envido refusal, player 2 plays a card
            await match.connect(player2).playCard(BigNumber.from(2), []) // 2 of Coins

            // After card was played Envido state should be resetEnvido
            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.None)
            )
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.None)
            )
        })

        it('Spelling Truco after an Envido refused, and spell it again', async function () {
            const { match, player1, player2, gameStateQueries } =
                await loadFixture(deployMatchContractReadyToPlay)

            await match.setPlayerTurn(
                await match.connect(player2).currentPlayerIdx()
            )

            // Spell truco and check turn event emitted
            await expect(match.connect(player2).spellTruco())
                .to.emit(match, 'TurnSwitch')
                .withArgs(player1.address)

            // Spell envido and check turn event emitted
            await expect(match.connect(player1).spellEnvido())
                .to.emit(match, 'TurnSwitch')
                .withArgs(player2.address)

            // After refusal, player 2 keeps turn
            await expect(match.connect(player2).refuseChallenge()).to.not.emit(
                match,
                'TurnSwitch'
            )

            let state = await match.currentMatch()
            expect(await gameStateQueries.isEnvidoEnded(state.gameState)).to.be
                .true

            // After envido refusal, player 2 plays a card
            await match.connect(player2).spellTruco()

            // After card was played Envido state should be resetEnvido
            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Truco)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.true
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.None)
            )
        })
    })
    describe('Refusals', function () {
        it('Truco from None', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            // TRANSACTION: Player 1 refuses
            await expect(match.connect(player1).refuseChallenge()).to.not.emit(
                match,
                'TurnSwitch'
            ) // turn should not switch because after truco refusal it needs a new deal to switch turns

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
                deployMatchContractReadyToPlay
            )

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            let state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Truco)
            )

            // TRANSACTION: Player 1 accepts the challenge and raises to Retruco
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellReTruco()

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.ReTruco)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.true
            expect(state.gameState.currentChallenge.pointsAtStake).to.be.equal(
                BigNumber.from(2)
            )

            // TRANSACTION: Player 2 refuses
            await match.connect(player2).refuseChallenge()

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
                deployMatchContractReadyToPlay
            )

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            // TRANSACTION: Player 1 accepts the challenge and raises to Retruco
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellReTruco()

            // TRANSACTION: Player 2 accepts and raises to Vale4
            await match.connect(player2).acceptChallengeForRaising()
            await match.connect(player2).spellValeCuatro()

            // TRANSACTION: Player 1 refuses
            await match.connect(player1).refuseChallenge()

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
                deployMatchContractReadyToPlay
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            // TRANSACTION: Player 1 accepts the challenge
            await match.connect(player1).acceptChallenge()

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
                deployMatchContractReadyToPlay
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            // TRANSACTION: Player 1 accepts the challenge
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellReTruco()

            // TRANSACTION: Player 2 accepts and raises to Vale4
            await match.connect(player2).acceptChallenge()

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
                deployMatchContractReadyToPlay
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            // TRANSACTION: Player 1 accepts the challenge
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellReTruco()

            // TRANSACTION: Player 2 accepts and raises to Vale4
            await match.connect(player2).acceptChallengeForRaising()
            await match.connect(player2).spellValeCuatro()

            // TRANSACTION: Player 1 accepts
            await match.connect(player1).acceptChallenge()

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
                deployMatchContractReadyToPlay
            )

            let state: TrucoMatch.Match = await match.currentMatch()

            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.None)
            )

            // TRANSACTION: Player 2 is the first to play (mano)
            await match.connect(player2).spellTruco()

            state = await match.currentMatch()

            // Player 1 should respond
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
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

            // TRANSACTION: Player 1 accepts the challenge
            await match.connect(player1).acceptChallenge()

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
            await match.connect(player2).playCard(BigNumber.from(3), []) // 3 of Coins

            state = await match.currentMatch()

            // Now it's player 2 turn
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player1).currentPlayerIdx()
            )

            let revealedCards = await match.getRevealedCards()
            expect(
                revealedCards[
                    await match.connect(player2).currentPlayerIdx()
                ][0]
            ).to.be.equal(BigNumber.from(3)) // Masked
            expect(
                revealedCards[
                    await match.connect(player1).currentPlayerIdx()
                ][0]
            ).to.be.equal(BigNumber.from(0)) // Just played

            // TRANSACTION
            await match.connect(player1).playCard(BigNumber.from(2), []) // 2 of Coins

            state = await match.currentMatch()

            // Now it's player 2 turn
            expect(state.gameState.playerTurn).to.be.equal(
                await match.connect(player2).currentPlayerIdx()
            )

            revealedCards = await match.getRevealedCards()
            expect(
                revealedCards[
                    await match.connect(player2).currentPlayerIdx()
                ][0]
            ).to.be.equal(BigNumber.from(3)) // Masked
            expect(
                revealedCards[
                    await match.connect(player1).currentPlayerIdx()
                ][0]
            ).to.be.equal(BigNumber.from(2)) // Just played

            // FIRST ROUND COMPLETE: Player 2 wins the round -----------------------------------------------------------

            // Truco should not be final at this step
            await engine.setGameState(state.gameState)
            expect(await engine.isTrucoFinal()).to.be.false

            // TRANSACTION
            await match.connect(player2).playCard(BigNumber.from(4), []) // 4 of Coins

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
            await match.connect(player1).playCard(BigNumber.from(5), []) // 5 of Coins

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
            await match.connect(player1).playCard(BigNumber.from(1), []) // 1 of Cups

            state = await match.currentMatch()

            // Now it's player 2 turn
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
            ).to.be.equal(BigNumber.from(0)) // Just played

            // TRANSACTION
            await match.connect(player2).playCard(BigNumber.from(12), []) // 2 of Cups

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
