import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployMatchContract } from '../deploy-contracts'
import { deployMatchContractReadyToPlay } from './deploy-match-ready-to-play'

import { MatchStateEnum } from './struct-enums'
import { BigNumber } from 'ethers'

describe('Truco Match', function () {
    // Constructor tests
    describe('Constructor', function () {
        it('The player1 must be player 1. Player 2 must be address(0)', async function () {
            const { match, player1 } = await loadFixture(deployMatchContract)

            await match.getPlayers().then((players) => {
                expect(players[0]).to.equal(player1.address)
                expect(players[1]).to.equal(ethers.constants.AddressZero)
            })
        })
    })

    // Join tests
    describe('Join', function () {
        it('Player 2 must be able to join the match', async function () {
            const { match, trucoin, player1, player2, bet } = await loadFixture(
                deployMatchContract
            )

            // Allow trucoin transfer
            await trucoin.connect(player2).approve(match.address, bet)

            await match.connect(player2).join()

            await match.getPlayers().then((players) => {
                expect(players[0]).to.equal(player1.address)
                expect(players[1]).to.equal(player2.address)
            })
        })

        it('Must not be able to join the match if it is already full', async function () {
            const { match, trucoin, player1, player2, invalid_player, bet } =
                await loadFixture(deployMatchContract)

            // Allow trucoin transfer
            await trucoin.connect(player2).approve(match.address, bet)
            await trucoin.connect(invalid_player).approve(match.address, bet)

            await match.connect(player2).join()
            await expect(
                match.connect(invalid_player).join()
            ).to.be.revertedWith('Match is full')

            await match.getPlayers().then((players) => {
                expect(players[0]).to.equal(player1.address)
                expect(players[1]).to.equal(player2.address)
            })
        })

        // Must revert if not enough tokens are approved
        it('Must revert if not enough tokens are approved', async function () {
            const { match, trucoin, player2, bet } = await loadFixture(
                deployMatchContract
            )

            // Allow trucoin transfer
            await trucoin.connect(player2).approve(match.address, bet.sub(1))

            await expect(match.connect(player2).join()).to.be.revertedWith(
                'ERC20: insufficient allowance'
            )
        })

        // Owner must not be able to join the match
        it('Owner must not be able to join the match', async function () {
            const { match, trucoin, player1, bet } = await loadFixture(
                deployMatchContract
            )

            // Allow trucoin transfer
            await trucoin.connect(player1).approve(match.address, bet)

            await expect(match.connect(player1).join()).to.be.revertedWith(
                'Match creator is already joined'
            )
        })

        // Must start the match if both players are joined & tokens are transfered
        it('Must start the match if both players are joined & tokens are transfered', async function () {
            const { match, trucoin, player1, player2, bet } = await loadFixture(
                deployMatchContract
            )

            // Allow trucoin transfer
            await trucoin.connect(player1).approve(match.address, bet)
            await trucoin.connect(player2).approve(match.address, bet)

            // Player 2 joins the match
            expect(await match.connect(player2).join()).to.emit(
                match,
                'MatchStarted'
            )

            await match.getPlayers().then((players) => {
                expect(players[0]).to.equal(player1.address)
                expect(players[1]).to.equal(player2.address)
            })
        })
    })

    describe('State Switching', function () {
        it('Match created but no player has joined', async function () {
            const { match, trucoin, player1, player2, bet } = await loadFixture(
                deployMatchContract
            )

            let matchState = await match.matchState()

            expect(matchState.state).to.equal(
                MatchStateEnum.WAITING_FOR_PLAYERS
            )
            expect(matchState.dealNonce).to.equal(BigNumber.from(0))
        })

        it('Player joined', async function () {
            const { match, trucoin, player1, player2, bet } = await loadFixture(
                deployMatchContract
            )

            // Allow trucoin transfer
            await trucoin.connect(player2).approve(match.address, bet)

            await match.connect(player2).join()

            let matchState = await match.matchState()

            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
            expect(matchState.dealNonce).to.equal(BigNumber.from(0))
        })

        it('Player joined, first shuffling', async function () {
            const { match } = await loadFixture(deployMatchContractReadyToPlay)

            let matchState = await match.matchState()

            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_PLAY)
            expect(matchState.dealNonce).to.equal(BigNumber.from(1))
        })

        it('Game ongoing, no final state reached', async function () {
            const { match, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).playCard(BigNumber.from(1))

            let matchState = await match.matchState()

            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_PLAY)
            expect(matchState.dealNonce).to.equal(BigNumber.from(1))
        })

        it('Game reached final state, new shuffling is needed', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).playCard(BigNumber.from(1))
            await match.connect(player1).playCard(BigNumber.from(4))

            await match.connect(player2).playCard(BigNumber.from(2))
            await match.connect(player1).playCard(BigNumber.from(5))

            let matchState = await match.matchState()

            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
            expect(matchState.dealNonce).to.equal(BigNumber.from(1))
        })

        it('Game reached a state were envido reveal is needed', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            // Player 1 wins envido
            await match.connect(player2).spellEnvidoCount(BigNumber.from(23))
            await match.connect(player1).spellEnvidoCount(BigNumber.from(27))

            await match.connect(player2).playCard(BigNumber.from(1))
            await match.connect(player1).playCard(BigNumber.from(4))

            await match.connect(player2).playCard(BigNumber.from(2))
            await match.connect(player1).playCard(BigNumber.from(14))

            let matchState = await match.matchState()

            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)
            expect(matchState.dealNonce).to.equal(BigNumber.from(1))
        })

        it('Game reached final state', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            let gameState = (await match.currentMatch()).gameState

            await match.setTeamPoints(
                await match.connect(player1).currentPlayerIdx(),
                gameState.pointsToWin
            )

            await match.connect(player2).playCard(BigNumber.from(2))

            let matchState = await match.matchState()

            expect(matchState.state).to.equal(MatchStateEnum.FINISHED)
            expect(matchState.dealNonce).to.equal(BigNumber.from(1))
        })
    })

    describe('Card Deal', function () {
        it('Game is waiting for play, not shuffling', async function () {
            const { match, player1 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await expect(match.connect(player1).newDeal()).to.be.reverted
        })
    })

    describe('Points Assigment', function () {
        it("No points should be assigned since round it's not over", async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()

            let currentMatch = await match.currentMatch()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(0)
            )
        })

        it('Assign points for refused truco, no envido', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).refuseChallenge()

            let currentMatch = await match.currentMatch()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(1)
            )
        })

        it('Assign points for refused truco and refused envido', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).refuseChallenge()

            await match.connect(player2).spellTruco()
            await match.connect(player1).refuseChallenge()

            let currentMatch = await match.currentMatch()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(2)
            )
        })

        it('Assign points for envido accepted and  no truco spelled (envido cards reveled at play)', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(2) // 2 of Coins
            await match.connect(player1).playCard(1) // 1 of Coins

            await match.connect(player2).playCard(8) // 10 of Coins
            await match.connect(player1).playCard(4) // 4 of Coins

            let currentMatch = await match.currentMatch()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(3)
            )
        })

        it('Assign points for envido and truco accepted  (envido cards reveled at play)', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).playCard(2) // 2 of Coins
            await match.connect(player1).playCard(1) // 1 of Coins

            await match.connect(player2).playCard(8) // 10 of Coins
            await match.connect(player1).playCard(4) // 4 of Coins

            let currentMatch = await match.currentMatch()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(4)
            )
        })

        it('Assign points for real envido and truco accepted  (envido cards reveled at play)', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()

            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellRealEnvido()

            await match.connect(player2).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).playCard(2) // 2 of Coins
            await match.connect(player1).playCard(1) // 1 of Coins

            await match.connect(player2).playCard(8) // 10 of Coins
            await match.connect(player1).playCard(4) // 4 of Coins

            let currentMatch = await match.currentMatch()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(7)
            )
        })
    })
})
