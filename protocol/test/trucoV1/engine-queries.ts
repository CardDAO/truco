import { expect } from 'chai'
import { ethers } from 'hardhat'

import { BigNumber } from 'ethers'
import {basicGameState} from "../basic-game-state";
import { ChallengeEnum, ResponseEnum } from './struct-enums'

import { IERC3333 } from '../../typechain-types/contracts/trucoV1/interfaces/IERC3333'
import GameStateStruct = IERC3333.GameStateStruct

describe('Engine Queries', function () {
    async function deployContract() {
        const TrucoResolver = await ethers.getContractFactory('TrucoResolver')
        const trucoResolver = await TrucoResolver.deploy()

        const EnvidoResolver = await ethers.getContractFactory('EnvidoResolver')
        const envidoResolver = await EnvidoResolver.deploy()

        const CardsDeck = await ethers.getContractFactory('CastillianDeck')
        const cardsDeck = await CardsDeck.deploy()

        const GameStateQueries = await ethers.getContractFactory(
            'GameStateQueries'
        )
        const sut = await GameStateQueries.deploy(
            trucoResolver.address,
            envidoResolver.address,
            cardsDeck.address
        )
        return { sut, cardsDeck }
    }

    describe('Envido', function () {
        describe('Envido Winner Revealing Cards Enforcement', function () {
            it('Envido was not played', async function () {
                const { sut } = await deployContract()

                let state: GameStateStruct = basicGameState()

                expect(await sut.cardsShouldBeRevealedForEnvido(state)).to.be.false
            })

            it('Envido is pending acceptance', async function () {
                const { sut } = await deployContract()

                let state: GameStateStruct = basicGameState()

                state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
                state.envido.spelled = true
                state.currentChallenge.waitingChallengeResponse = true

                expect(await sut.cardsShouldBeRevealedForEnvido(state)).to.be.false
            })

            it('Envido accepted, no point count spelled', async function () {
                const { sut } = await deployContract()

                let state: GameStateStruct = basicGameState()

                state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
                state.envido.spelled = true
                state.currentChallenge.waitingChallengeResponse = false
                state.currentChallenge.response = BigNumber.from(ResponseEnum.Accept)

                expect(await sut.cardsShouldBeRevealedForEnvido(state)).to.be.false
            })


            it('Envido refused', async function () {
                const { sut } = await deployContract()

                let state: GameStateStruct = basicGameState()

                state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
                state.envido.spelled = true
                state.currentChallenge.waitingChallengeResponse = false
                state.currentChallenge.response = BigNumber.from(ResponseEnum.Refuse)

                expect(await sut.cardsShouldBeRevealedForEnvido(state)).to.be.false
            })

            it('Envido accepted, points partially spelled', async function () {
                const { sut } = await deployContract()

                let state: GameStateStruct = basicGameState()

                state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
                state.envido.spelled = true
                state.currentChallenge.waitingChallengeResponse = true

                state.envido.playerCount[0] = BigNumber.from(23)

                expect(await sut.cardsShouldBeRevealedForEnvido(state)).to.be.false
            })

            it('Envido finished, no cards were played by winner', async function () {
                const { sut } = await deployContract()

                let state: GameStateStruct = basicGameState()

                state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
                state.envido.spelled = true
                state.currentChallenge.waitingChallengeResponse = false
                state.envido.pointsRewarded = 2

                state.envido.playerCount[0] = BigNumber.from(23)
                state.envido.playerCount[1] = BigNumber.from(20)

                expect(await sut.cardsShouldBeRevealedForEnvido(state)).to.be.true
            })


            it('Envido finished, not involved cards that sum envido were played', async function () {
                const { sut, cardsDeck } = await deployContract()

                let state: GameStateStruct = basicGameState()

                state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
                state.currentChallenge.waitingChallengeResponse = false

                state.envido.spelled = true
                state.envido.pointsRewarded = 2
                state.envido.playerCount[0] = BigNumber.from(23)
                state.envido.playerCount[1] = BigNumber.from(20)

                // Player 0 played 1 card, which is unrelated to the envido points count he/she spelled
                state.revealedCardsByPlayer[0] = [BigNumber.from(1), await cardsDeck.maskedCardId(), await cardsDeck.maskedCardId()]

                expect(await sut.cardsShouldBeRevealedForEnvido(state)).to.be.true
            })

            it('Envido finished, some cards that sum envido were played', async function () {
                const { sut, cardsDeck } = await deployContract()

                let state: GameStateStruct = basicGameState()

                state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
                state.currentChallenge.waitingChallengeResponse = false

                state.envido.spelled = true
                state.envido.pointsRewarded = 2
                state.envido.playerCount[0] = BigNumber.from(23)
                state.envido.playerCount[1] = BigNumber.from(20)

                // Player 0 played 2 card, one is related to the envido (3 of Coins)
                state.revealedCardsByPlayer[0] = [BigNumber.from(1), BigNumber.from(3), await cardsDeck.maskedCardId()]

                expect(await sut.cardsShouldBeRevealedForEnvido(state)).to.be.true
            })

            it('Envido finished, all cards that sum envido were played', async function () {
                const { sut, cardsDeck } = await deployContract()

                let state: GameStateStruct = basicGameState()

                state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
                state.currentChallenge.waitingChallengeResponse = false

                state.envido.spelled = true
                state.envido.pointsRewarded = 2
                state.envido.playerCount[0] = BigNumber.from(23)
                state.envido.playerCount[1] = BigNumber.from(20)

                // Player 0 played 2 cards witch sum envido
                state.revealedCardsByPlayer[0] = [BigNumber.from(3), BigNumber.from(8), await cardsDeck.maskedCardId()]

                // console.log(state)
                expect(await sut.cardsShouldBeRevealedForEnvido(state)).to.be.false
            })

        })

        describe('Points calculation', function () {
            it('Invalid cards', async function () {
                const { sut } = await deployContract()

                // One invalid card
                let cards = [BigNumber.from(0)]

                await expect(
                    sut.getEnvidoPointsForCards(cards)
                ).to.be.revertedWith('Invalid card')

                // Multiple invalid cards
                cards = [BigNumber.from(0), BigNumber.from(44)]

                await expect(
                    sut.getEnvidoPointsForCards(cards)
                ).to.be.revertedWith('Invalid card')

                // Mix invalid with valid cards
                cards = [
                    BigNumber.from(0),
                    BigNumber.from(2),
                    BigNumber.from(3),
                ]

                await expect(
                    sut.getEnvidoPointsForCards(cards)
                ).to.be.revertedWith('Invalid card')

                // Mix valid with invalid upper bound
                cards = [
                    BigNumber.from(2),
                    BigNumber.from(3),
                    BigNumber.from(44),
                ]

                await expect(
                    sut.getEnvidoPointsForCards(cards)
                ).to.be.revertedWith('Invalid card')
            })

            describe('No suit match', function () {
                it('One card only', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [BigNumber.from(11)]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(1)
                    )
                })

                it('One card only wich is a figure', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [BigNumber.from(10)]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(0)
                    )
                })

                it('Two cards, just figures', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [BigNumber.from(9), BigNumber.from(28)]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(0)
                    )
                })

                it('Two cards, one figure', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [BigNumber.from(1), BigNumber.from(19)]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(1)
                    )
                })

                it('One number and two figures', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [
                        BigNumber.from(1),
                        BigNumber.from(11),
                        BigNumber.from(21),
                    ]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(1)
                    )
                })

                it('Two numbers and one figure', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [
                        BigNumber.from(1),
                        BigNumber.from(18),
                        BigNumber.from(28),
                    ]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(1)
                    )
                })

                it('Two numbers and one figure, different order', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [
                        BigNumber.from(18),
                        BigNumber.from(28),
                        BigNumber.from(5),
                    ]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(5)
                    )
                })

                it('Three numbers', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [
                        BigNumber.from(1),
                        BigNumber.from(23),
                        BigNumber.from(34),
                    ]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(4)
                    )
                })
            })

            describe('Suit match', function () {
                describe('Two cards query', function () {
                    it('Both figures same suit', async function () {
                        const { sut } = await deployContract()

                        // Three cards of different suit
                        let cards = [BigNumber.from(8), BigNumber.from(9)]

                        expect(
                            await sut.getEnvidoPointsForCards(cards)
                        ).to.equal(BigNumber.from(20))
                    })

                    it('One figure and one a number ', async function () {
                        const { sut } = await deployContract()

                        // Three cards of different suit
                        let cards = [BigNumber.from(8), BigNumber.from(9)]

                        expect(
                            await sut.getEnvidoPointsForCards(cards)
                        ).to.equal(BigNumber.from(20))
                    })

                    it('Two numbers ', async function () {
                        const { sut } = await deployContract()

                        // Three cards of different suit
                        let cards = [BigNumber.from(2), BigNumber.from(3)]

                        expect(
                            await sut.getEnvidoPointsForCards(cards)
                        ).to.equal(BigNumber.from(25))
                    })
                })

                describe('Three cards query', function () {
                    it('Two figures same suit, other not', async function () {
                        const { sut } = await deployContract()

                        // Three cards of different suit
                        let cards = [
                            BigNumber.from(8),
                            BigNumber.from(9),
                            BigNumber.from(21),
                        ]

                        expect(
                            await sut.getEnvidoPointsForCards(cards)
                        ).to.equal(BigNumber.from(20))
                    })

                    it('Two numbers same suit, a figure from a different one', async function () {
                        const { sut } = await deployContract()

                        // Three cards of different suit
                        let cards = [
                            BigNumber.from(1),
                            BigNumber.from(8),
                            BigNumber.from(21),
                        ]

                        expect(
                            await sut.getEnvidoPointsForCards(cards)
                        ).to.equal(BigNumber.from(21))
                    })

                    it('Two figures same suit, a number with a different one', async function () {
                        const { sut } = await deployContract()

                        // Three cards of different suit
                        let cards = [
                            BigNumber.from(8),
                            BigNumber.from(9),
                            BigNumber.from(21),
                        ]

                        expect(
                            await sut.getEnvidoPointsForCards(cards)
                        ).to.equal(BigNumber.from(20))
                    })

                    it('All three cards same suit, two figures', async function () {
                        const { sut } = await deployContract()

                        // Three cards of different suit
                        let cards = [
                            BigNumber.from(1),
                            BigNumber.from(8),
                            BigNumber.from(9),
                        ]

                        expect(
                            await sut.getEnvidoPointsForCards(cards)
                        ).to.equal(BigNumber.from(21))
                    })

                    it('All three cards same suit, one figure', async function () {
                        const { sut } = await deployContract()

                        // Three cards of different suit
                        let cards = [
                            BigNumber.from(1),
                            BigNumber.from(7),
                            BigNumber.from(8),
                        ]

                        expect(
                            await sut.getEnvidoPointsForCards(cards)
                        ).to.equal(BigNumber.from(28))
                    })

                    it('All three cards same suit, no figure', async function () {
                        const { sut } = await deployContract()

                        // Three cards of different suit
                        let cards = [
                            BigNumber.from(5),
                            BigNumber.from(7),
                            BigNumber.from(6),
                        ]

                        expect(
                            await sut.getEnvidoPointsForCards(cards)
                        ).to.equal(BigNumber.from(33))
                    })
                })
            })
        })
    })
})
