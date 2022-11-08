import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployEngineContract } from '../deploy-engine-contract'

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

    describe('Refusals', function () {})
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

            state = await match.currentMatch()

            expect(state.gameState.currentChallenge.challenge).to.be.equal(
                BigNumber.from(ChallengeEnum.ReTruco)
            )
            expect(state.gameState.currentChallenge.waitingChallengeResponse).to
                .be.true
            expect(state.gameState.currentChallenge.response).to.be.equal(
                BigNumber.from(ResponseEnum.None)
            )
        })
    })
    describe('Corner cases', function () {})
    describe('Full State Assertions', function () {})
})
