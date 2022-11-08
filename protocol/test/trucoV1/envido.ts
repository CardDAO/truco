import { expect } from 'chai'

import { IERC3333 } from '../../typechain-types/contracts/trucoV1/interfaces/IERC3333'
import { ActionEnum, ChallengeEnum, ResponseEnum } from './struct-enums'

import MoveStruct = IERC3333.MoveStruct
import TransactionStruct = IERC3333.TransactionStruct
import GameStateStruct = IERC3333.GameStateStruct

import { deployEngineContract } from '../deploy-engine-contract'
import { basicGameState } from '../basic-game-state'

import { BigNumber } from 'ethers'

describe('Envido Resolver', function () {
    const currentPlayerIdx = BigNumber.from(0)
    const otherPlayerIdx = BigNumber.from(1)

    describe('Invalid moves', function () {
        it("Challenging any Truco derivatives while Envido was spelled shouldn't be allowed", async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameState()

            // Set current state to envido challenge
            state.currentChallenge.challenge = BigNumber.from(
                ChallengeEnum.Envido
            )

            await engine.setGameState(state)

            // Set action to a new challenge spell
            let move: MoveStruct = {
                action: BigNumber.from(ActionEnum.Challenge),
                parameters: [ChallengeEnum.Truco],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await expect(engine.executeTransaction(transaction)).to.be.reverted

            move.parameters = [ChallengeEnum.ReTruco]
            transaction.moves = [move]

            await expect(engine.executeTransaction(transaction)).to.be.reverted

            move.parameters = [ChallengeEnum.ValeCuatro]
            transaction.moves = [move]

            await expect(engine.executeTransaction(transaction)).to.be.reverted

            move = {
                action: BigNumber.from(ActionEnum.Challenge),
                parameters: [ChallengeEnum.None],
            }

            transaction.moves = [move]

            await expect(engine.executeTransaction(transaction)).to.be.reverted
        })

        it("Challenging 'None' shouldn't be allowed", async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameState()

            // Set current state to envido challenge
            state.currentChallenge.challenge = BigNumber.from(
                ChallengeEnum.Envido
            )

            await engine.setGameState(state)

            let move = {
                action: BigNumber.from(ActionEnum.Challenge),
                parameters: [ChallengeEnum.None],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await expect(engine.executeTransaction(transaction)).to.be.reverted
        })
    })

    /**
     * Precondition: No challenge in place
     */
    describe('No previous challenge', function () {
        it('Spell Challenge: Envido', async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameState()

            // Point at stake checkpoint
            // @ts-ignore
            const pointAtStake: BigNumber = state.currentChallenge.pointsAtStake

            let move: MoveStruct = {
                action: BigNumber.from(ActionEnum.Challenge),
                parameters: [BigNumber.from(ChallengeEnum.Envido)],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await engine.executeTransaction(transaction)

            let result: GameStateStruct = await engine.gameState()

            // Check resulting state
            expect(result.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.Envido)
            )
            expect(result.currentChallenge.waitingChallengeResponse).to.be.true
            expect(result.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.None)
            )
            // Check that point at stake didn't change on challenge, they should change on acceptance
            expect(result.currentChallenge.pointsAtStake).to.be.equal(
                pointAtStake
            )
            expect(result.currentChallenge.challenger).to.be.equal(
                currentPlayerIdx
            )

            // Check that spell for envido spelled was added
            expect(result.envido.spelled).to.be.true

            // Check that envido points were not rewarded at this point
            expect(result.envido.pointsRewarded).to.be.equal(BigNumber.from(0))
        })

        it('Spell Challenge: FaltaEnvido', async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameState()
            state.pointsToWin = BigNumber.from(30)

            // Point at stake checkpoint
            // @ts-ignore
            const pointAtStake: BigNumber = state.currentChallenge.pointsAtStake

            let move: MoveStruct = {
                action: BigNumber.from(ActionEnum.Challenge),
                parameters: [BigNumber.from(ChallengeEnum.FaltaEnvido)],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await engine.executeTransaction(transaction)

            let result: GameStateStruct = await engine.gameState()

            // Check resulting state
            expect(result.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.FaltaEnvido)
            )
            expect(result.currentChallenge.waitingChallengeResponse).to.be.true
            expect(result.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.None)
            )

            // Check that point at stake didn't change on challenge, they should change on acceptance
            expect(result.currentChallenge.pointsAtStake).to.be.equal(
                pointAtStake
            )
            expect(result.currentChallenge.challenger).to.be.equal(
                currentPlayerIdx
            )

            // Check that spell for envido spelled was added
            expect(result.envido.spelled).to.be.true

            // Check that envido points were not rewarded at this point
            expect(result.envido.pointsRewarded).to.be.equal(BigNumber.from(0))
        })
    })

    /**
     * Precondintion: A challenge is in place and waiting for a response
     */
    describe('Challenge in place: waiting for a response', function () {
        // Envido has spelled by current player and accepted by other party
        function basicGameStateWithEnvidoSpellWaiting(): GameStateStruct {
            let state: GameStateStruct = basicGameState()

            state.pointsToWin = BigNumber.from(30)

            // Envido has spelled by other player and accepted, cant respond anymore
            state.currentChallenge.challenge = BigNumber.from(
                ChallengeEnum.Envido
            )
            state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx)
            state.currentChallenge.waitingChallengeResponse = true
            state.currentChallenge.pointsAtStake = BigNumber.from(1)
            state.currentChallenge.response = BigNumber.from(ResponseEnum.None)

            state.envido.spelled = true

            return state
        }

        it("Invalid response: 'None' is not accepted as a challenge response", async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameStateWithEnvidoSpellWaiting()

            // Envido has spelled by other player but not yet accepted yet
            state.currentChallenge.waitingChallengeResponse = true
            state.currentChallenge.response = BigNumber.from(ResponseEnum.None)

            let move: MoveStruct = {
                action: BigNumber.from(ActionEnum.Response),
                parameters: [BigNumber.from(ResponseEnum.None)],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await expect(engine.executeTransaction(transaction)).to.be.reverted
        })

        it("Spell envido count shouldn't be allowed without a valid response first", async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameStateWithEnvidoSpellWaiting()

            let move: MoveStruct = {
                action: BigNumber.from(ActionEnum.EnvidoCount),
                parameters: [BigNumber.from(33)],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await expect(engine.executeTransaction(transaction)).to.be.reverted
        })

        it("Envido casted by current player and it's not the one who should respond", async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameStateWithEnvidoSpellWaiting()
            state.currentChallenge.challenger = BigNumber.from(currentPlayerIdx)

            let move: MoveStruct = {
                action: BigNumber.from(ActionEnum.Response),
                parameters: [BigNumber.from(ResponseEnum.Accept)],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await expect(engine.executeTransaction(transaction)).to.be.reverted
        })

        it('Refuse challenge', async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameStateWithEnvidoSpellWaiting()

            let move: MoveStruct = {
                action: BigNumber.from(ActionEnum.Response),
                parameters: [BigNumber.from(ResponseEnum.Refuse)],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await engine.executeTransaction(transaction)

            let result: GameStateStruct = await engine.gameState()

            // Check resulting state
            expect(result.currentChallenge.waitingChallengeResponse).to.be.false
            expect(result.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.Refuse)
            )

            const nonAcceptedChallenge: BigNumber = BigNumber.from(1)

            // Points at stake shouldn't change on refusal
            expect(result.currentChallenge.pointsAtStake).to.be.equal(
                nonAcceptedChallenge
            )

            // Check that spell for envido spelled was added
            expect(result.envido.spelled).to.be.true

            // Since it's final state, check that envido were rewarded on refusal
            expect(result.envido.pointsRewarded).to.be.equal(
                nonAcceptedChallenge
            )
        })

        describe('Challenge Accepted: Points at stake changing on acceptance', function () {
            it('No challenge to Envido', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct =
                    basicGameStateWithEnvidoSpellWaiting()

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Response),
                    parameters: [BigNumber.from(ResponseEnum.Accept)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state
                expect(result.currentChallenge.waitingChallengeResponse).to.be
                    .false
                expect(result.currentChallenge.response).to.be.equal(
                    BigNumber.from(ResponseEnum.Accept)
                )
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(2)
                )
                expect(result.currentChallenge.challenger).to.be.equal(
                    otherPlayerIdx
                )

                // Check that spell for envido spelled was added
                expect(result.envido.spelled).to.be.true

                // Points at envido game state shouln't change if no one accepted the challenge
                expect(result.envido.pointsRewarded).to.be.equal(
                    BigNumber.from(0)
                )
            })

            it('No challenge to RealEnvido', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct =
                    basicGameStateWithEnvidoSpellWaiting()

                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.RealEnvido
                )

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Response),
                    parameters: [BigNumber.from(ResponseEnum.Accept)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state
                expect(result.currentChallenge.waitingChallengeResponse).to.be
                    .false
                expect(result.currentChallenge.response).to.be.equal(
                    BigNumber.from(ResponseEnum.Accept)
                )
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(3)
                )
                expect(result.currentChallenge.challenger).to.be.equal(
                    otherPlayerIdx
                )

                // Check that spell for envido spelled was added
                expect(result.envido.spelled).to.be.true

                // Points at envido game state shouln't change if no one accepted the challenge
                expect(result.envido.pointsRewarded).to.be.equal(
                    BigNumber.from(0)
                )
            })

            it('No challenge to FaltaEnvido', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct =
                    basicGameStateWithEnvidoSpellWaiting()

                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.FaltaEnvido
                )

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Response),
                    parameters: [BigNumber.from(ResponseEnum.Accept)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state
                expect(result.currentChallenge.waitingChallengeResponse).to.be
                    .false
                expect(result.currentChallenge.response).to.be.equal(
                    BigNumber.from(ResponseEnum.Accept)
                )
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(30)
                )
                expect(result.currentChallenge.challenger).to.be.equal(
                    otherPlayerIdx
                )

                // Check that spell for envido spelled was added
                expect(result.envido.spelled).to.be.true

                // Points at envido game state shouln't change if no one accepted the challenge
                expect(result.envido.pointsRewarded).to.be.equal(
                    BigNumber.from(0)
                )
            })

            it('RealEnvido from None', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct =
                    basicGameStateWithEnvidoSpellWaiting()

                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.RealEnvido
                )

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Response),
                    parameters: [BigNumber.from(ResponseEnum.Accept)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state
                expect(result.currentChallenge.waitingChallengeResponse).to.be
                    .false
                expect(result.currentChallenge.response).to.be.equal(
                    BigNumber.from(ResponseEnum.Accept)
                )
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(3)
                )
                expect(result.currentChallenge.challenger).to.be.equal(
                    otherPlayerIdx
                )

                // Check that spell for envido spelled was added
                expect(result.envido.spelled).to.be.true

                // Points at envido game state shouln't change if no one accepted the challenge
                expect(result.envido.pointsRewarded).to.be.equal(
                    BigNumber.from(0)
                )
            })

            it('FaltaEnvido from None', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct =
                    basicGameStateWithEnvidoSpellWaiting()

                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.RealEnvido
                )

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Response),
                    parameters: [BigNumber.from(ResponseEnum.Accept)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state
                expect(result.currentChallenge.waitingChallengeResponse).to.be
                    .false
                expect(result.currentChallenge.response).to.be.equal(
                    BigNumber.from(ResponseEnum.Accept)
                )
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(3)
                )
                expect(result.currentChallenge.challenger).to.be.equal(
                    otherPlayerIdx
                )

                // Check that spell for envido spelled was added
                expect(result.envido.spelled).to.be.true

                // Check that envido points were not rewarded at this point
                expect(result.envido.pointsRewarded).to.be.equal(
                    BigNumber.from(0)
                )
            })

            it('RealEnvido from Envido', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct =
                    basicGameStateWithEnvidoSpellWaiting()

                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.RealEnvido
                )
                state.currentChallenge.pointsAtStake = BigNumber.from(2)

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Response),
                    parameters: [BigNumber.from(ResponseEnum.Accept)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state
                expect(result.currentChallenge.waitingChallengeResponse).to.be
                    .false
                expect(result.currentChallenge.response).to.be.equal(
                    BigNumber.from(ResponseEnum.Accept)
                )
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(5)
                )
                expect(result.currentChallenge.challenger).to.be.equal(
                    otherPlayerIdx
                )

                // Check that spell for envido spelled was added
                expect(result.envido.spelled).to.be.true

                // Check that envido points were not rewarded at this point
                expect(result.envido.pointsRewarded).to.be.equal(
                    BigNumber.from(0)
                )
            })

            it('EnvidoEnvido from Envido', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct =
                    basicGameStateWithEnvidoSpellWaiting()

                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.EnvidoEnvido
                )
                state.currentChallenge.pointsAtStake = BigNumber.from(2)

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Response),
                    parameters: [BigNumber.from(ResponseEnum.Accept)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state
                expect(result.currentChallenge.waitingChallengeResponse).to.be
                    .false
                expect(result.currentChallenge.response).to.be.equal(
                    BigNumber.from(ResponseEnum.Accept)
                )
                // Should be the points left to win the game
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(4)
                )
                expect(result.currentChallenge.challenger).to.be.equal(
                    otherPlayerIdx
                )

                // Check that spell for envido spelled was added
                expect(result.envido.spelled).to.be.true

                // Check that envido points were not rewarded at this point
                expect(result.envido.pointsRewarded).to.be.equal(
                    BigNumber.from(0)
                )
            })

            it('FaltaEnvido from Envido', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct =
                    basicGameStateWithEnvidoSpellWaiting()

                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.FaltaEnvido
                )
                state.currentChallenge.pointsAtStake = BigNumber.from(2)

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Response),
                    parameters: [BigNumber.from(ResponseEnum.Accept)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state
                expect(result.currentChallenge.waitingChallengeResponse).to.be
                    .false
                expect(result.currentChallenge.response).to.be.equal(
                    BigNumber.from(ResponseEnum.Accept)
                )
                // Should be the points left to win the game
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(30)
                )
                expect(result.currentChallenge.challenger).to.be.equal(
                    otherPlayerIdx
                )

                // Check that spell for envido spelled was added
                expect(result.envido.spelled).to.be.true

                // Check that envido points were not rewarded at this point
                expect(result.envido.pointsRewarded).to.be.equal(
                    BigNumber.from(0)
                )
            })

            it('RealEnvido from EnvidoEnvido', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct =
                    basicGameStateWithEnvidoSpellWaiting()

                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.RealEnvido
                )
                state.currentChallenge.pointsAtStake = BigNumber.from(4)

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Response),
                    parameters: [BigNumber.from(ResponseEnum.Accept)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state
                expect(result.currentChallenge.waitingChallengeResponse).to.be
                    .false
                expect(result.currentChallenge.response).to.be.equal(
                    BigNumber.from(ResponseEnum.Accept)
                )
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(7)
                )
                expect(result.currentChallenge.challenger).to.be.equal(
                    otherPlayerIdx
                )

                // Check that spell for envido spelled was added
                expect(result.envido.spelled).to.be.true

                // Check that envido points were not rewarded at this point
                expect(result.envido.pointsRewarded).to.be.equal(
                    BigNumber.from(0)
                )
            })
        })
    })

    /**
     * Precondintion: A challenge was REFUSED
     */
    describe('Challenge in place: Refused', function () {
        // Envido has spelled by current player and accepted by other party
        function basicGameStateWithEnvidoSpellRefused(): GameStateStruct {
            let state: GameStateStruct = basicGameState()

            state.currentChallenge.challenge = BigNumber.from(
                ChallengeEnum.Envido
            )
            state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx)
            state.currentChallenge.waitingChallengeResponse = false
            state.currentChallenge.response = BigNumber.from(
                ResponseEnum.Refuse
            )
            state.currentChallenge.pointsAtStake = BigNumber.from(2)

            state.envido.spelled = true

            return state
        }

        it('No envido count should be spelled', async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameStateWithEnvidoSpellRefused()

            state.playerTurn = currentPlayerIdx

            let move: MoveStruct = {
                action: BigNumber.from(ActionEnum.EnvidoCount),
                parameters: [BigNumber.from(33)],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await expect(engine.executeTransaction(transaction)).to.be.reverted
        })

        it('No raising challenge should be spelled', async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameStateWithEnvidoSpellRefused()

            state.playerTurn = currentPlayerIdx

            let move: MoveStruct = {
                action: BigNumber.from(ActionEnum.Challenge),
                parameters: [BigNumber.from(ChallengeEnum.RealEnvido)],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await expect(engine.executeTransaction(transaction)).to.be.reverted

            move.parameters = [BigNumber.from(ChallengeEnum.EnvidoEnvido)]
            await expect(engine.executeTransaction(transaction)).to.be.reverted

            move.parameters = [BigNumber.from(ChallengeEnum.FaltaEnvido)]
            await expect(engine.executeTransaction(transaction)).to.be.reverted
        })

        it('No response should be spelled', async function () {
            const { engine } = await deployEngineContract()

            let state: GameStateStruct = basicGameStateWithEnvidoSpellRefused()

            state.playerTurn = currentPlayerIdx

            let move: MoveStruct = {
                action: BigNumber.from(ActionEnum.Response),
                parameters: [BigNumber.from(ResponseEnum.Accept)],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn,
                moves: [move],
                state: state,
            }

            await expect(engine.executeTransaction(transaction)).to.be.reverted

            move.parameters = [BigNumber.from(ResponseEnum.Refuse)]
            await expect(engine.executeTransaction(transaction)).to.be.reverted

            move.parameters = [BigNumber.from(ResponseEnum.None)]
            await expect(engine.executeTransaction(transaction)).to.be.reverted
        })
    })
    /**
     * Precondintion: A challenge was ACCEPTED
     */
    describe('Challenge in place: Accepted', function () {
        // Envido has spelled by current player and accepted by other party
        function gameStateWithEnvidoSpell(): GameStateStruct {
            let state: GameStateStruct = basicGameState()

            state.playerWhoShuffled = otherPlayerIdx
            state.currentChallenge.challenge = BigNumber.from(
                ChallengeEnum.Envido
            )
            state.currentChallenge.challenger = BigNumber.from(currentPlayerIdx)
            state.currentChallenge.waitingChallengeResponse = false
            state.currentChallenge.response = BigNumber.from(
                ResponseEnum.Accept
            )
            state.currentChallenge.pointsAtStake = BigNumber.from(2)

            state.envido.spelled = true
            return state
        }
        describe('Out of order moves', function () {
            it('Issue a response to an already accepted challenge', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Response),
                    parameters: [BigNumber.from(ResponseEnum.Accept)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted

                move.parameters = [BigNumber.from(ResponseEnum.Refuse)]
                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted
            })
        })

        describe('Raising the challenge', function () {
            it("Raise Envido shouldn't be possible when raiser is the challenger", async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Challenge),
                    parameters: [BigNumber.from(ChallengeEnum.RealEnvido)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted
            })

            it("Raise EnvidoEnvido shouldn't be possible from RealEnvido", async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()
                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.RealEnvido
                )

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Challenge),
                    parameters: [BigNumber.from(ChallengeEnum.EnvidoEnvido)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted
            })

            it("Raise FaltaEnvido shouldn't be possible for any player", async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()

                // FaltaEnvido can't be raised
                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.FaltaEnvido
                )

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Challenge),
                    parameters: [BigNumber.from(ChallengeEnum.RealEnvido)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }
                move.parameters = [BigNumber.from(ChallengeEnum.RealEnvido)]

                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted
            })

            it('Raise Envido going OK', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()

                state.currentChallenge.challenger =
                    BigNumber.from(otherPlayerIdx)

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Challenge),
                    parameters: [BigNumber.from(ChallengeEnum.RealEnvido)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state
                expect(result.currentChallenge.challenge).to.be.equal(
                    BigNumber.from(ChallengeEnum.RealEnvido)
                )
                expect(result.currentChallenge.challenger).to.be.equal(
                    currentPlayerIdx
                )
                // Points should not change on a raise, but on an acceptance
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(2)
                ) // Envido + RealEnvido
                expect(result.currentChallenge.waitingChallengeResponse).to.be
                    .true
                expect(result.currentChallenge.response).to.be.equal(
                    BigNumber.from(ResponseEnum.None)
                )
            })

            it('Raise to Falta envido, check points', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()

                // Envido has spelled by current player and accepted, but cant be raised
                state.currentChallenge.challenge = BigNumber.from(
                    ChallengeEnum.Envido
                )
                state.currentChallenge.challenger =
                    BigNumber.from(otherPlayerIdx)
                state.currentChallenge.waitingChallengeResponse = false
                state.currentChallenge.response = BigNumber.from(
                    ResponseEnum.Accept
                )

                // Set match points
                state.pointsToWin = BigNumber.from(30)
                state.teamPoints[currentPlayerIdx.toNumber()] =
                    BigNumber.from(15)
                state.teamPoints[otherPlayerIdx.toNumber()] = BigNumber.from(10)

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Challenge),
                    parameters: [BigNumber.from(ChallengeEnum.FaltaEnvido)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Points at stake should not be raised either
                expect(result.currentChallenge.pointsAtStake).to.be.equal(
                    BigNumber.from(2)
                )
            })
        })

        describe('Points count stage', function () {
            it('Invalid envido count', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()

                state.playerTurn = otherPlayerIdx

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.EnvidoCount),
                    parameters: [BigNumber.from(34)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                // 33 is the max value for envido count
                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted

                move.parameters = [BigNumber.from(100)]
                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted

                // 0 is a reserved value to indicate that the player didn't spell envido count
                move.parameters = [BigNumber.from(0)]
                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted
            })

            it('Spell envido count being the player who shuffled deck - OK', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()

                state.envido.playerCount[otherPlayerIdx.toNumber()] =
                    BigNumber.from(33)

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.EnvidoCount),
                    parameters: [BigNumber.from(33)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                // Spell envido count should go fine
                await engine.executeTransaction(transaction)

                let result: GameStateStruct = await engine.gameState()

                // Check resulting state from current points being spelled
                expect(result.envido.spelled).to.be.true

                //Check that points rewarded are correct
                expect(result.envido.pointsRewarded).to.be.equal(
                    result.currentChallenge.pointsAtStake
                )
            })

            it("Spell envido count being the player who shuffled the deck - Not OK", async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()

                state.playerWhoShuffled = state.playerTurn

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.EnvidoCount),
                    parameters: [BigNumber.from(33)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                // Spell envido count should fail because other player didn't cast their envido count
                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted
            })

            it("Spell envido count beign 'mano'", async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()

                state.playerTurn = otherPlayerIdx

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.EnvidoCount),
                    parameters: [BigNumber.from(15)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                // Spell envido count should go fine
                await engine.executeTransaction(transaction)

                let result: BigNumber[] = await engine.gameState()

                expect(result.envido.spelled).to.be.true

                // Check resulting state from current points being spelled
                expect(
                    result.envido.playerCount[otherPlayerIdx.toNumber()]
                ).to.be.equal(move.parameters[0])

                // Check counterparty envido points
                expect(
                    result.envido.playerCount[currentPlayerIdx.toNumber()]
                ).to.be.equal(BigNumber.from(0))

                // No points rewarded yet, since envido count from other player is yet to be spelled
                expect(result.envido.pointsRewarded).to.be.equal(
                    BigNumber.from(0)
                )
            })

            it('Spell envido count being who shuffle the deck', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpell()

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.EnvidoCount),
                    parameters: [BigNumber.from(15)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                state.envido.playerCount[otherPlayerIdx.toNumber()] =
                    BigNumber.from(33)

                // Spell envido count should go fine
                await engine.executeTransaction(transaction)

                let result: BigNumber[] = await engine.gameState()

                expect(result.envido.spelled).to.be.true

                // Check resulting state from current points being spelled
                expect(
                    result.envido.playerCount[currentPlayerIdx.toNumber()]
                ).to.be.equal(move.parameters[0])

                // Points should be rewarded since envido count from other player is already spelled
                expect(result.envido.pointsRewarded).to.be.equal(
                    result.currentChallenge.pointsAtStake
                )
            })
        })
    })
    /**
     * Precondition: A challenge is finished (all players have cast their envido count)
     */
    describe('Challenge is finished', function () {
        // Envido has spelled by current player and accepted by other party
        function gameStateWithEnvidoSpellFinished(): GameStateStruct {
            let state: GameStateStruct = basicGameState()

            // Envido has spelled by other player and accepted, cant respond anymore
            state.currentChallenge.challenge = BigNumber.from(
                ChallengeEnum.Envido
            )
            state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx)
            state.currentChallenge.waitingChallengeResponse = false
            state.currentChallenge.pointsAtStake = BigNumber.from(2)
            state.currentChallenge.response = BigNumber.from(
                ResponseEnum.Accept
            )

            state.envido.spelled = true
            state.envido.pointsRewarded = state.currentChallenge.pointsAtStake
            state.envido.playerCount[currentPlayerIdx.toNumber()] =
                BigNumber.from(10)
            state.envido.playerCount[otherPlayerIdx.toNumber()] =
                BigNumber.from(20)

            return state
        }

        describe('Invalid moves', function () {
            it('Spell a new envido type challenge when challenge is in final state', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpellFinished()

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.Challenge),
                    parameters: [BigNumber.from(ChallengeEnum.Envido)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                // Spell a new envido challenge should fail because game is at a final state
                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted

                move.parameters = [BigNumber.from(ChallengeEnum.EnvidoEnvido)]
                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted

                move.parameters = [BigNumber.from(ChallengeEnum.RealEnvido)]
                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted

                move.parameters = [BigNumber.from(ChallengeEnum.FaltaEnvido)]
                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted
            })

            it('Spell an EnvidoCount on final state', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpellFinished()

                let move: MoveStruct = {
                    action: BigNumber.from(ActionEnum.EnvidoCount),
                    parameters: [BigNumber.from(11)],
                }

                let transaction: TransactionStruct = {
                    playerIdx: state.playerTurn,
                    moves: [move],
                    state: state,
                }

                // Spell envido count should fail because game is at a final state
                await expect(engine.executeTransaction(transaction)).to.be
                    .reverted
            })
        })

        describe('Compute the winner', function () {
            it('Envido refused, challenger is the winner', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpellFinished()

                state.currentChallenge.response = BigNumber.from(
                    ResponseEnum.Refuse
                )
                state.currentChallenge.challenger = otherPlayerIdx

                engine.setGameState(state)

                let result: BigNumber = await engine.getEnvidoWinner()

                // Check resulting state
                expect(result).to.be.equal(otherPlayerIdx)

                state.currentChallenge.challenger = currentPlayerIdx

                engine.setGameState(state)

                result = await engine.getEnvidoWinner()

                // Check resulting state
                expect(result).to.be.equal(currentPlayerIdx)
            })

            it('Both player have same envido count, current player shuffled', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpellFinished()

                state.envido.playerCount[currentPlayerIdx.toNumber()] =
                    BigNumber.from(33)
                state.envido.playerCount[otherPlayerIdx.toNumber()] =
                    BigNumber.from(33)

                state.playerWhoShuffled = currentPlayerIdx

                engine.setGameState(state)

                let result: BigNumber = await engine.getEnvidoWinner()

                // Check resulting state
                expect(result).to.be.equal(otherPlayerIdx)
            })

            it('Both player have same envido count, other player shuffled', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpellFinished()

                state.envido.playerCount[currentPlayerIdx.toNumber()] =
                    BigNumber.from(33)
                state.envido.playerCount[otherPlayerIdx.toNumber()] =
                    BigNumber.from(33)

                state.playerWhoShuffled = otherPlayerIdx

                engine.setGameState(state)

                let result: BigNumber = await engine.getEnvidoWinner()

                // Check resulting state
                expect(result).to.be.equal(currentPlayerIdx)
            })

            it('One player has more points than other and vice-versa', async function () {
                const { engine } = await deployEngineContract()

                let state: GameStateStruct = gameStateWithEnvidoSpellFinished()

                state.envido.playerCount[currentPlayerIdx.toNumber()] =
                    BigNumber.from(30)
                state.envido.playerCount[otherPlayerIdx.toNumber()] =
                    BigNumber.from(20)

                state.playerWhoShuffled = otherPlayerIdx

                engine.setGameState(state)

                let result: BigNumber = await engine.getEnvidoWinner()

                // Check resulting state
                expect(result).to.be.equal(currentPlayerIdx)

                state.envido.playerCount[currentPlayerIdx.toNumber()] =
                    BigNumber.from(20)
                state.envido.playerCount[otherPlayerIdx.toNumber()] =
                    BigNumber.from(30)

                state.playerWhoShuffled = otherPlayerIdx

                engine.setGameState(state)

                result = await engine.getEnvidoWinner()

                // Check resulting state
                expect(result).to.be.equal(otherPlayerIdx)
            })
        })
    })
})
