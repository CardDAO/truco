import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import {
    deployMatchContract,
    deployMatchFromFactory,
} from '../deploy-contracts'
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

        it('Assign points for refused truco and refused envido different winners', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).playCard(2) // 2 of Coins
            await match.connect(player1).spellEnvido()
            await match.connect(player2).refuseChallenge()

            await match.connect(player1).playCard(1) // 1 of Coins

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
                BigNumber.from(1)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(1)
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

        it('Assign points for envido accepted and no truco spelled (envido cards reveled at play) - different winners', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(25)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(1) // 1 of Coins
            await match.connect(player1).playCard(2) // 2 of Coins

            await match.connect(player1).playCard(8) // 10 of Coins
            await match.connect(player2).playCard(4) // 4 of Coins

            let currentMatch = await match.currentMatch()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(1)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(2)
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

        it('Assign points for envido and truco accepted, different winners (envido cards reveled at play)', async function () {
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
            await match.connect(player1).playCard(3) // 3 of Coins

            await match.connect(player1).playCard(22) // 2 of Swords
            await match.connect(player2).playCard(8) // 10 of Coins

            let currentMatch = await match.currentMatch()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(2)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(2)
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

        it('Assign points for re truco accepted  (no envido spelled)', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellReTruco()
            await match.connect(player2).acceptChallenge()

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

        it('Assign points for re truco rejected  (no envido spelled)', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallengeForRaising()
            await match.connect(player1).spellReTruco()
            await match.connect(player2).refuseChallenge()

            let currentMatch = await match.currentMatch()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(2)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(0)
            )
        })

        it('Assign points for vale4 rejected  (no envido spelled)', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallengeForRaising()

            await match.connect(player1).spellReTruco()
            await match.connect(player2).acceptChallengeForRaising()

            await match.connect(player2).spellValeCuatro()
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
                BigNumber.from(3)
            )
        })

        it('Assign points for vale4 accepted (no envido spelled)', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallengeForRaising()

            await match.connect(player1).spellReTruco()
            await match.connect(player2).acceptChallengeForRaising()

            await match.connect(player2).spellValeCuatro()
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

        it('Assign points for falta envido accepted (cards revealed at play)', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellFaltaEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(2) // 2 of Coins
            await match.connect(player1).playCard(1) // 1 of Coins

            await match.connect(player2).playCard(8) // 10 of Coins
            await match.connect(player1).playCard(4) // 4 of Coins

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

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
                BigNumber.from(currentMatch.gameState.pointsToWin)
            )
            expect(matchState.state).to.equal(MatchStateEnum.FINISHED)
        })
    })

    describe('Resign', function () {
        it('Resign on none challenge', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).resign()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(1)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
        })

        it('Resign on envido challenge', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()

            await match.connect(player1).resign()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(2)
            )
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
        })

        it('Resign on envido raising challenge', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallengeForRaising()

            await match.connect(player1).spellFaltaEnvido()

            await match.connect(player2).resign()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(3)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
        })

        it('Resign on truco spelling challenge (previous envido was refused)', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).playCard(2) // 2 of Coins
            await match.connect(player1).spellEnvido()
            await match.connect(player2).refuseChallenge()

            await match.connect(player1).playCard(1) // 1 of Coins

            await match.connect(player2).spellTruco()
            await match.connect(player1).resign()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(1)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(1)
            )
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
        })

        it('Resign on vale4, no envido was spelled', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallengeForRaising()

            await match.connect(player1).spellReTruco()
            await match.connect(player2).acceptChallengeForRaising()

            await match.connect(player2).spellValeCuatro()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).playCard(2) // 2 of Coins
            await match.connect(player1).playCard(1) // 1 of Coins

            await match.connect(player2).playCard(8) // 10 of Coins
            await match.connect(player1).resign()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(4)
            )
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
        })

        it('Resign after envido was played, no truco was spelled', async function () {
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
            await match.connect(player1).resign()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(3)
            )
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
        })

        it('Resign after envido accepting envido', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).resign()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(3)
            )
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
        })

        it('Resign after envido accepting envido, no cards needs to be revealed', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).resign()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(3)
            )
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
        })

        it('Resign after after paying envido, no envido cards were revealed', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(2) // 2 of Coins
            await match.connect(player1).resign() // 1 of Coins

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(3)
            )
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)
        })

        it('Envido was spelled. Different player resigns at truco', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(2) // 2 of Coins

            await match.connect(player1).spellTruco()
            await match.connect(player2).acceptChallenge()

            await match.connect(player1).playCard(3) // 3 of Coins

            await match.connect(player1).playCard(8) // 10 of Coins
            await match.connect(player2).resign()

            let player1Idx: BigNumber = await match
                .connect(player1)
                .currentPlayerIdx()
            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[player1Idx]).to.equal(
                BigNumber.from(2)
            )
            expect(currentMatch.gameState.teamPoints[player2Idx]).to.equal(
                BigNumber.from(2)
            )
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)
        })
    })
    describe('Game finished', function () {
        async function reachPointstoWin(_match, _winner, _loser) {
            await _match.connect(_winner).spellFaltaEnvido()
            await _match.connect(_loser).acceptChallenge()

            await _match.connect(_winner).spellEnvidoCount(22)
            await _match.connect(_loser).spellEnvidoCount(0)

            await _match.connect(_winner).playCard(2) // 2 of Coins
            await _match.connect(_loser).playCard(1) // 1 of Coins

            await _match.connect(_winner).playCard(8) // 10 of Coins
        }

        // Transfer trucoins to winner
        it('Transfer trucoins to winner', async function () {
            const { match, player1, player2, trucoin, trucoChampionsToken } =
                await loadFixture(deployMatchFromFactory)

            const matchBalanceBefore = await trucoin.balanceOf(match.address)

            await reachPointstoWin(match, player2, player1)
            // 4 of Coins
            await expect(
                match.connect(player1).playCard(4)
            ).to.changeTokenBalances(
                trucoin,
                [match.address, player2.address],
                [matchBalanceBefore.mul(-1), matchBalanceBefore]
            )
        })

        it('Game reached final state', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchFromFactory
            )

            await reachPointstoWin(match, player2, player1)

            await match.connect(player1).playCard(BigNumber.from(4))

            let matchState = await match.matchState()

            expect(matchState.state).to.equal(MatchStateEnum.FINISHED)
            expect(matchState.dealNonce).to.equal(BigNumber.from(1))
        })

        // Assign Truco Champions Token

        // Emit Event
    })
})
