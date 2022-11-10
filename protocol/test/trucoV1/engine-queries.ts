import { expect } from 'chai'
import { ethers } from 'hardhat'

import { BigNumber } from 'ethers'

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
        return { sut }
    }

    describe('Envido points calculation', function () {
        it('Invalid cards', async function () {
            const { sut } = await deployContract()

            // One invalid card
            let cards = [BigNumber.from(0)]

            expect(sut.getEnvidoPointsForCards(cards)).to.be.revertedWith(
                'Invalid card'
            )

            // Multiple invalid cards
            cards = [BigNumber.from(0), BigNumber.from(44)]

            expect(sut.getEnvidoPointsForCards(cards)).to.be.revertedWith(
                'Invalid card'
            )

            // Mix invalid with valid cards
            cards = [BigNumber.from(0), BigNumber.from(2), BigNumber.from(3)]

            expect(sut.getEnvidoPointsForCards(cards)).to.be.revertedWith(
                'Invalid card'
            )

            // Mix valid with invalid upper bound
            cards = [BigNumber.from(2), BigNumber.from(3), BigNumber.from(44)]

            expect(sut.getEnvidoPointsForCards(cards)).to.be.revertedWith(
                'Invalid card'
            )
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

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(20)
                    )
                })

                it('One figure and one a number ', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [BigNumber.from(8), BigNumber.from(9)]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(20)
                    )
                })

                it('Two numbers ', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [BigNumber.from(2), BigNumber.from(3)]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(25)
                    )
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

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(20)
                    )
                })

                it('Two numbers same suit, a figure from a different one', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [
                        BigNumber.from(1),
                        BigNumber.from(8),
                        BigNumber.from(21),
                    ]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(21)
                    )
                })

                it('Two figures same suit, a number with a different one', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [
                        BigNumber.from(8),
                        BigNumber.from(9),
                        BigNumber.from(21),
                    ]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(20)
                    )
                })

                it('All three cards same suit, two figures', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [
                        BigNumber.from(1),
                        BigNumber.from(8),
                        BigNumber.from(9),
                    ]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(21)
                    )
                })

                it('All three cards same suit, one figure', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [
                        BigNumber.from(1),
                        BigNumber.from(7),
                        BigNumber.from(8),
                    ]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(28)
                    )
                })

                it('All three cards same suit, no figure', async function () {
                    const { sut } = await deployContract()

                    // Three cards of different suit
                    let cards = [
                        BigNumber.from(5),
                        BigNumber.from(7),
                        BigNumber.from(6),
                    ]

                    expect(await sut.getEnvidoPointsForCards(cards)).to.equal(
                        BigNumber.from(33)
                    )
                })
            })
        })
    })
})
