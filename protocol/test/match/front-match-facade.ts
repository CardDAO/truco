import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployEngineContract } from '../deploy-contracts'
import { BigNumber } from 'ethers'
import { deployFrontMatchFacadeContract } from '../../scripts/helpers/front-match-facade-deploy'

describe('Front Match Facade', function () {
    const tokenAtStake = BigNumber.from(10)

    async function deployContract() {
        // Contracts are deployed using the first signer/account by default
        const [player1, player2, invalid_player] = await ethers.getSigners()

        const { trucoin, engine, gameStateQueries } =
            await deployEngineContract()

        const { frontMatchFacade } = await deployFrontMatchFacadeContract(
            gameStateQueries
        )

        // Transfer trucoins to players
        await trucoin.mint(player1.address, tokenAtStake)
        await trucoin.mint(player2.address, tokenAtStake)

        const TrucoMatch = await ethers.getContractFactory('TrucoMatchTester')
        const match = await TrucoMatch.deploy(
            engine.address,
            trucoin.address,
            gameStateQueries.address,
            tokenAtStake
        )

        // Approve trucoins to be used by the match contract
        await trucoin.connect(player1).approve(match.address, tokenAtStake)
        await trucoin.connect(player2).approve(match.address, tokenAtStake)

        // Owner stakes tokens
        await match.connect(player1).stake(0)

        // Player2 joins the match
        await match.connect(player2).join()

        return {
            frontMatchFacade,
            match,
            engine,
            trucoin,
            player1,
            player2,
            invalid_player,
        }
    }

    describe("Can't spell", function () {
        it('Player1 should not be able spell Envido', async function () {
            const { frontMatchFacade, match, player1 } = await loadFixture(
                deployContract
            )

            // player 1 can't spell envido
            expect(
                await frontMatchFacade
                    .connect(player1)
                    .canSpellEnvido(match.address)
            ).to.be.equal(false)
        })

        it('Invalid player should not be able spell Envido', async function () {
            const { frontMatchFacade, match, invalid_player } =
                await loadFixture(deployContract)

            // invalid player can't spell envido
            await expect(
                frontMatchFacade
                    .connect(invalid_player)
                    .canSpellEnvido(match.address)
            ).to.be.revertedWith('You are not a player in this match')
        })

        it('Player1 should not be able to spell Truco', async function () {
            const { frontMatchFacade, match, player1 } = await loadFixture(
                deployContract
            )

            expect(
                await frontMatchFacade
                    .connect(player1)
                    .canSpellTruco(match.address)
            ).to.be.equal(false)
        })

        it('Player1 should not be able to PlayCard when challenge is Truco', async function () {
            const { frontMatchFacade, match, player1, player2 } =
                await loadFixture(deployContract)

            // player 2 spell truco
            await match.connect(player2).spellTruco()
            // challenge it is truco
            expect(
                await frontMatchFacade
                    .connect(player1)
                    .canPlayCard(match.address)
            ).to.be.equal(false)
        })

        it('Player1 should not be able to response when challenge is None', async function () {
            const { frontMatchFacade, match, player1, player2 } =
                await loadFixture(deployContract)

            expect(
                await frontMatchFacade
                    .connect(player1)
                    .canResponse(match.address)
            ).to.be.equal(false)
        })
    })

    describe('Can spell', function () {
        //it('Send query is game end', async function () {
        //    const { frontMatchFacade, match, player1, player2 } = await loadFixture(
        //        deployContract
        //    )
        //
        //    expect(await frontMatchFacade.isGameEnded(match.address)).to.be.equal(false)
        //    // TODO continue..
        //})

        //it('Send query is game end', async function () {
        //    const { frontMatchFacade, match, player1, player2 } = await loadFixture(
        //        deployContract
        //    )
        //
        //    expect(await frontMatchFacade.isGameEnded(match.address)).to.be.equal(false)
        //})

        it('Envido -> player2', async function () {
            const { frontMatchFacade, match, player2 } = await loadFixture(
                deployContract
            )

            expect(
                await frontMatchFacade
                    .connect(player2)
                    .canSpellEnvido(match.address)
            ).to.be.equal(true)
        })

        it('Truco -> player2', async function () {
            const { frontMatchFacade, match, player2 } = await loadFixture(
                deployContract
            )

            expect(
                await frontMatchFacade
                    .connect(player2)
                    .canSpellTruco(match.address)
            ).to.be.equal(true)
        })

        it('Truco -> player2', async function () {
            const { frontMatchFacade, match, player2 } = await loadFixture(
                deployContract
            )

            expect(
                await frontMatchFacade
                    .connect(player2)
                    .canSpellTruco(match.address)
            ).to.be.equal(true)
        })

        it('Player2 should be able to playcard', async function () {
            const { frontMatchFacade, match, player2 } = await loadFixture(
                deployContract
            )

            expect(
                await frontMatchFacade
                    .connect(player2)
                    .canPlayCard(match.address)
            ).to.be.equal(true)
        })

        it('Player1 should be able to playcard after accept truco', async function () {
            const { frontMatchFacade, match, player1, player2 } =
                await loadFixture(deployContract)

            await match.connect(player2).playCard(BigNumber.from(1))
            await match.connect(player1).spellTruco()
            await match.connect(player2).acceptChallenge()
            expect(
                await frontMatchFacade
                    .connect(player1)
                    .canPlayCard(match.address)
            ).to.be.equal(true)
        })

        it('Player1 should be able to send response when challange is Envido', async function () {
            const { frontMatchFacade, match, player1, player2 } =
                await loadFixture(deployContract)

            await match.connect(player2).spellEnvido()
            expect(
                await frontMatchFacade
                    .connect(player1)
                    .canResponse(match.address)
            ).to.be.equal(true)
        })

        it('Player1 should be able to send response when challange is Truco', async function () {
            const { frontMatchFacade, match, player1, player2 } =
                await loadFixture(deployContract)

            await match.connect(player2).spellTruco()
            expect(
                await frontMatchFacade
                    .connect(player1)
                    .canResponse(match.address)
            ).to.be.equal(true)
        })
    })

    describe('Check EnvidoPoints', function () {
        it('How much quantity do i have for spell envido with all my cards', async function () {
            const { frontMatchFacade, match, player1, player2 } =
                await loadFixture(deployContract)

            let cards = [
                BigNumber.from(18),
                BigNumber.from(28),
                BigNumber.from(5),
            ]

            expect(
                await frontMatchFacade.getEnvidoPointsForCards(cards)
            ).to.be.equal(5)
        })
    })
})
