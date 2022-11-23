import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployMatchContract } from '../deploy-contracts'
import { deployMatchContractReadyToPlay } from './deploy-match-ready-to-play'

import { MatchStateEnum } from './struct-enums'
import { BigNumber } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TrucoMatchTester } from '../../typechain-types'
import { deployTrucoChampionsTokenContract } from '../../scripts/helpers/truco-champions-token-deploy'

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

            await match.connect(player2).playCard(BigNumber.from(1), [])

            let matchState = await match.matchState()

            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_PLAY)
            expect(matchState.dealNonce).to.equal(BigNumber.from(1))
        })

        it('Game reached final state, new shuffling is needed. Check for event emit', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            let originalMatchState = await match.matchState()

            await match.connect(player2).playCard(BigNumber.from(1), [])
            await match.connect(player1).playCard(BigNumber.from(4), [])

            await match.connect(player2).playCard(BigNumber.from(2), [])
            await expect(match.connect(player1).playCard(BigNumber.from(5), []))
                .to.emit(match, 'NewDealRequired')
                .withArgs(
                    player2.address,
                    BigNumber.from(originalMatchState.dealNonce).add(1)
                )

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
            await match
                .connect(player2)
                .spellEnvidoCount(BigNumber.from(23), [])
            await match
                .connect(player1)
                .spellEnvidoCount(BigNumber.from(27), [])

            await match.connect(player2).playCard(BigNumber.from(1), [])
            await match.connect(player1).playCard(BigNumber.from(4), [])

            await match.connect(player2).playCard(BigNumber.from(2), [])
            await match.connect(player1).playCard(BigNumber.from(14), [])

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

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).spellEnvido()
            await match.connect(player2).refuseChallenge()

            await match.connect(player1).playCard(1, []) // 1 of Coins

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

            await match.connect(player2).spellEnvidoCount(22, [])
            await match.connect(player1).spellEnvidoCount(0, [])

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).playCard(1, []) // 1 of Coins

            await match.connect(player2).playCard(8, []) // 10 of Coins
            await match.connect(player1).playCard(4, []) // 4 of Coins

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

            await match.connect(player2).spellEnvidoCount(25, [])
            await match.connect(player1).spellEnvidoCount(0, [])

            await match.connect(player2).playCard(1, []) // 1 of Coins
            await match.connect(player1).playCard(2, []) // 2 of Coins

            await match.connect(player1).playCard(8, []) // 10 of Coins
            await match.connect(player2).playCard(4, []) // 4 of Coins

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

            await match.connect(player2).spellEnvidoCount(22, [])
            await match.connect(player1).spellEnvidoCount(0, [])

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).playCard(1, []) // 1 of Coins

            await match.connect(player2).playCard(8, []) // 10 of Coins
            await match.connect(player1).playCard(4, []) // 4 of Coins

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

            await match.connect(player2).spellEnvidoCount(22, [])
            await match.connect(player1).spellEnvidoCount(0, [])

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).playCard(3, []) // 3 of Coins

            await match.connect(player1).playCard(22, []) // 2 of Swords
            await match.connect(player2).playCard(8, []) // 10 of Coins

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

            await match.connect(player2).spellEnvidoCount(22, [])
            await match.connect(player1).spellEnvidoCount(0, [])

            await match.connect(player2).spellTruco()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).playCard(1, []) // 1 of Coins

            await match.connect(player2).playCard(8, []) // 10 of Coins
            await match.connect(player1).playCard(4, []) // 4 of Coins

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

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).playCard(1, []) // 1 of Coins

            await match.connect(player2).playCard(8, []) // 10 of Coins
            await match.connect(player1).playCard(4, []) // 4 of Coins

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

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).playCard(1, []) // 1 of Coins

            await match.connect(player2).playCard(8, []) // 10 of Coins
            await match.connect(player1).playCard(4, []) // 4 of Coins

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

            await match.connect(player2).spellEnvidoCount(22, [])
            await match.connect(player1).spellEnvidoCount(0, [])

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).playCard(1, []) // 1 of Coins

            await match.connect(player2).playCard(8, []) // 10 of Coins
            await match.connect(player1).playCard(4, []) // 4 of Coins

            let currentMatch = await match.currentMatch()
            let matchState = await match.matchState()

            expect(currentMatch.gameState.teamPoints[0]).to.equal(
                BigNumber.from(0)
            )
            expect(currentMatch.gameState.teamPoints[1]).to.equal(
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

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).spellEnvido()
            await match.connect(player2).refuseChallenge()

            await match.connect(player1).playCard(1, []) // 1 of Coins

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

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).playCard(1, []) // 1 of Coins

            await match.connect(player2).playCard(8, []) // 10 of Coins
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

            await match.connect(player2).spellEnvidoCount(22, [])
            await match.connect(player1).spellEnvidoCount(0, [])

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).playCard(1, []) // 1 of Coins

            await match.connect(player2).playCard(8, []) // 10 of Coins
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

            await match.connect(player2).spellEnvidoCount(22, [])
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

            await match.connect(player2).spellEnvidoCount(22, [])
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

            await match.connect(player2).spellEnvidoCount(22, [])
            await match.connect(player1).spellEnvidoCount(0, [])

            await match.connect(player2).playCard(2, []) // 2 of Coins
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

            await match.connect(player2).spellEnvidoCount(22, [])
            await match.connect(player1).spellEnvidoCount(0, [])

            await match.connect(player2).playCard(2, []) // 2 of Coins

            await match.connect(player1).spellTruco()
            await match.connect(player2).acceptChallenge()

            await match.connect(player1).playCard(3, []) // 3 of Coins

            await match.connect(player1).playCard(8, []) // 10 of Coins
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

    describe('Match finished', function () {
        async function reachPointsToWin(
            _match: TrucoMatchTester,
            _winner: SignerWithAddress,
            _loser: SignerWithAddress
        ) {
            let loserIdx: BigNumber = await _match
                .connect(_loser)
                .currentPlayerIdx()
            let winnerIdx: BigNumber = await _match
                .connect(_winner)
                .currentPlayerIdx()

            let currentMatch = await _match.currentMatch()

            // End game
            await _match.setTeamPoints(
                winnerIdx,
                currentMatch.gameState.pointsToWin
            )
            await _match.setTeamPoints(loserIdx, BigNumber.from(0))
        }

        // Transfer trucoins to winner
        it('Transfer trucoins to winner', async function () {
            const { match, player1, player2, trucoin } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            const matchBalanceBefore = await trucoin.balanceOf(match.address)

            await reachPointsToWin(match, player2, player1)

            // 4 of Coins
            await expect(
                match.connect(player2).resign()
            ).to.changeTokenBalances(
                trucoin,
                [match.address, player2.address],
                [matchBalanceBefore.mul(-1), matchBalanceBefore]
            )
        })

        it('Game reached final state', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await reachPointsToWin(match, player2, player1)

            await match.connect(player2).resign()

            let matchState = await match.matchState()

            expect(matchState.state).to.equal(MatchStateEnum.FINISHED)
            expect(matchState.dealNonce).to.equal(BigNumber.from(1))
        })

        // Assign Truco Champions Token
        it('Assign Truco Champions Token', async function () {
            const { match, player1, player2, trucoChampionsToken } =
                await loadFixture(deployMatchContractReadyToPlay)

            await reachPointsToWin(match, player2, player1)

            await match.connect(player2).resign()

            const trophy = await trucoChampionsToken.getTrophyByMatch(
                match.address
            )

            let currentMatch = await match.currentMatch()

            expect(trophy.winner).to.equal(player2.address)
            expect(trophy.winnerScore).to.equal(
                BigNumber.from(currentMatch.gameState.pointsToWin)
            )
            expect(trophy.loser).to.equal(player1.address)
            expect(trophy.loserScore).to.equal(BigNumber.from(1))
        })

        // Emit Event
        it('Emit event', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            await reachPointsToWin(match, player2, player1)

            let currentMatch = await match.currentMatch()

            await expect(match.connect(player2).resign())
                .to.emit(match, 'MatchFinished')
                .withArgs(
                    player2.address,
                    currentMatch.gameState.pointsToWin,
                    player1.address,
                    BigNumber.from(1),
                    currentMatch.bet
                )
        })
    })

    describe('Cards Reveal', function () {
        it('Reveal incorrect number of cards', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            // Not in reveal state
            await expect(match.connect(player2).revealCards([], [])).to.be
                .reverted

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).resign()

            let matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)

            let tooMuchCardsToReveal = [
                BigNumber.from(1),
                BigNumber.from(2),
                BigNumber.from(3),
                BigNumber.from(4),
            ]
            await expect(
                match.connect(player2).revealCards(tooMuchCardsToReveal, [])
            ).to.be.reverted
        })

        it('Reveal incorrect envido sum cards', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            // Not in reveal state
            await expect(match.connect(player2).revealCards([], [])).to.be
                .reverted

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).resign()

            let matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)

            let cardsThatDoesNotSumEnvidoCountSpelledInMatch = [
                BigNumber.from(1),
                BigNumber.from(2),
            ]
            await expect(
                match
                    .connect(player2)
                    .revealCards(
                        cardsThatDoesNotSumEnvidoCountSpelledInMatch,
                        []
                    )
            ).to.be.revertedWith('Envido count from cards does not match')
        })

        it('Reveal ok - Match not ended after reveal', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            // Not in reveal state
            await expect(match.connect(player2).revealCards([], [])).to.be
                .reverted

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).resign()

            let matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)

            // 2 of Coins and 10 of Coins should sum 22
            let cardsThatSumEnvidoSpelledOk = [
                BigNumber.from(2),
                BigNumber.from(8),
            ]
            await match
                .connect(player2)
                .revealCards(cardsThatSumEnvidoSpelledOk, [])

            matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_DEAL)
        })

        it('Reveal ok - Match ended after reveal', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            await match.setTeamPoints(
                player2Idx,
                currentMatch.gameState.pointsToWin - 2
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).playCard(21, []) // 1 of Swords

            await match.connect(player1).playCard(3, []) // 3 of Coins
            await match.connect(player2).playCard(4, []) // 4 of Coins

            let matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)

            // 2 of Coins and 10 of Coins should sum 22
            let cardsThatSumEnvidoSpelledOk = [
                BigNumber.from(2),
                BigNumber.from(8),
            ]
            await match
                .connect(player2)
                .revealCards(cardsThatSumEnvidoSpelledOk, [])

            matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.FINISHED)
        })

        it('Reveal ok - Match ended after with a resignation after reveal', async function () {
            const { match, player1, player2 } = await loadFixture(
                deployMatchContractReadyToPlay
            )

            const { trucoChampionsToken } =
                await deployTrucoChampionsTokenContract()

            // Since game will end we Prepare SBT NFT for winner in order to logic goes through
            await trucoChampionsToken.mint(match.address)

            // Change SBT contract address to the one deployed in this test
            await match.setTrucoChampionsTokenContractAddress(
                trucoChampionsToken.address
            )

            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            await match.setTeamPoints(
                player2Idx,
                currentMatch.gameState.pointsToWin - 2
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22, [])
            await match.connect(player1).spellEnvidoCount(0, [])

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).resign()

            let matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)

            // 2 of Coins and 10 of Coins should sum 22
            let cardsThatSumEnvidoSpelledOk = [
                BigNumber.from(2),
                BigNumber.from(8),
            ]
            await match
                .connect(player2)
                .revealCards(cardsThatSumEnvidoSpelledOk, [])

            matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.FINISHED)
        })
    })
    describe('IV Signature', function () {
        // Returns encoded message to be signed following common template
        // IV template:
        // revealedCards:<player_address>:<match_address>:<shuffling_nonce>:<card1>:<card2>:... etc
        async function getCardsEncodedForSig(
            player: SignerWithAddress,
            match: TrucoMatchTester,
            cards: BigNumber[]
        ) {
            const matchState = await match.matchState()

            let packedBytes = ethers.utils.solidityPack(
                ['string', 'address', 'string', 'address', 'string', 'uint8'],
                [
                    'revealedCards:',
                    player.address,
                    ':',
                    match.address,
                    ':',
                    matchState.dealNonce,
                ]
            )

            cards.map((card) => {
                packedBytes = ethers.utils.solidityPack(
                    ['bytes', 'string', 'uint8'],
                    [packedBytes, ':', card]
                )
            })

            return packedBytes
        }

        it('Check template generation for 1 card', async function () {
            const { match, player1 } = await loadFixture(
                deployMatchContract
            )
            const card = BigNumber.from(1)

            let packed = await getCardsEncodedForSig(player1, match, [card])
            expect(
                await match
                    .connect(player1)
                    .getCardsString(player1.address, [card])
            ).to.equal(packed)
        })

        it('Check template generation for 2 cards', async function () {
            const { match, player1 } = await loadFixture(
                deployMatchContract
            )

            const cards = [BigNumber.from(1), BigNumber.from(2)]

            let packed = await getCardsEncodedForSig(player1, match, cards)
            expect(
                await match
                    .connect(player1)
                    .getCardsString(player1.address, cards)
            ).to.equal(packed)
        })

        it('Signature hash generation for invalid number of cards', async function () {
            const { match, player1 } = await loadFixture(
                deployMatchContract
            )

            // Empty cards
            await expect(
                match
                    .connect(player1)
                    .getCardProofToForSigning(player1.address, [])
            ).to.be.revertedWith('Invalid number of cards')

            let tooMuchCards = [
                BigNumber.from(1),
                BigNumber.from(2),
                BigNumber.from(3),
                BigNumber.from(4),
            ]

            // More than 3 cards
            await expect(
                match
                    .connect(player1)
                    .getCardProofToForSigning(player1.address, tooMuchCards)
            ).to.be.revertedWith('Invalid number of cards')
        })

        it('Signature hash generation for plater not involved in match', async function () {
            const { match, invalid_player } = await loadFixture(
                deployMatchContract
            )

            await expect(
                match
                    .connect(invalid_player)
                    .getCardProofToForSigning(invalid_player.address, [
                        BigNumber.from(1),
                    ])
            ).to.be.revertedWith('Address is not a player in this match')
        })

        it('Check correct hash for signature generation', async function () {
            const { match, player1 } = await loadFixture(
                deployMatchContract
            )

            const cards = [BigNumber.from(1), BigNumber.from(2)]

            const packedCardsWithTemplate = await getCardsEncodedForSig(
                player1,
                match,
                cards
            )

            let hash = ethers.utils.keccak256(packedCardsWithTemplate)

            expect(
                await match
                    .connect(player1)
                    .getCardProofToForSigning(player1.address, cards)
            ).to.equal(hash)
        })

        it('Play a card', async function () {
            const { match, player1 } = await loadFixture(
                deployMatchContract
            )

            const cards = [BigNumber.from(1), BigNumber.from(2)]

            const packedCardsWithTemplate = await getCardsEncodedForSig(
                player1,
                match,
                cards
            )

            let hash = ethers.utils.keccak256(packedCardsWithTemplate)

            expect(
                await match
                    .connect(player1)
                    .getCardProofToForSigning(player1.address, cards)
            ).to.equal(hash)
        })

        it('Play a card with signature check', async function () {
            const { match, player2 } = await deployMatchContractReadyToPlay()

            const cardToPlay: BigNumber = BigNumber.from(1) // 1 of Coins

            const proofToSign = await match.getCardProofToForSigning(
                player2.address,
                [cardToPlay]
            )

            // Convert DataHexString representation obtained from getCardProofToForSigning to Uint8Array
            // This is because ethers.utils.signMessage checks for argument type, and if it's not `Bytes` it will treat
            // it as if it's a string a do a toUtf8Bytes() conversion, which is not what we want
            // See important note in doc
            // @see https://docs.ethers.io/v5/api/signer/#Signer-signMessage
            let arrayed = ethers.utils.arrayify(proofToSign)

            const signedProof = await player2.signMessage(arrayed)

            await match.connect(player2).playCard(cardToPlay, signedProof)

            let playedCards = await match.getRevealedCards()

            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(playedCards[player2Idx][0]).to.equal(cardToPlay)
        })

        it('Play a card with signature for a differnt card', async function () {
            const { match, player2 } = await deployMatchContractReadyToPlay()

            const cardToPlay: BigNumber = BigNumber.from(1) // 1 of Coins
            const cardSigned: BigNumber = BigNumber.from(2) // 2 of Coins

            const proofToSign = await match.getCardProofToForSigning(
                player2.address,
                [cardSigned]
            )
            let arrayed = ethers.utils.arrayify(proofToSign)
            const signedProof = await player2.signMessage(arrayed)

            await expect(
                match.connect(player2).playCard(cardToPlay, signedProof)
            ).to.be.revertedWith('Invalid signature')
        })

        it('Play a card with signature from different player, who is acting as IV', async function () {
            const { match, player1, player2 } =
                await deployMatchContractReadyToPlay()

            const cardToPlay: BigNumber = BigNumber.from(1) // 1 of Coins

            const proofToSign = await match.getCardProofToForSigning(
                player2.address,
                [cardToPlay]
            )

            let arrayed = ethers.utils.arrayify(proofToSign)

            // Different player signs
            const signedProof = await player1.signMessage(arrayed)

            await match.connect(player2).playCard(cardToPlay, signedProof)

            let playedCards = await match.getRevealedCards()

            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(playedCards[player2Idx][0]).to.equal(cardToPlay)
        })

        it('Play a card with signature check signed from address which is not part of the match', async function () {
            const { match, invalid_player, player2 } =
                await deployMatchContractReadyToPlay()

            const cardToPlay: BigNumber = BigNumber.from(1) // 1 of Coins

            const proofToSign = await match.getCardProofToForSigning(
                player2.address,
                [cardToPlay]
            )

            let arrayed = ethers.utils.arrayify(proofToSign)

            const signedProof = await invalid_player.signMessage(arrayed)

            await expect(
                match.connect(player2).playCard(cardToPlay, signedProof)
            ).to.be.revertedWith('Invalid signature')

            let playedCards = await match.getRevealedCards()

            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            expect(playedCards[player2Idx][0]).to.not.equal(cardToPlay)
        })

        it('Reveal envido cards', async function () {
            const { match, player1, player2 } =
                await deployMatchContractReadyToPlay()

            let player2Idx: BigNumber = await match
                .connect(player2)
                .currentPlayerIdx()

            let currentMatch = await match.currentMatch()
            await match.setTeamPoints(
                player2Idx,
                currentMatch.gameState.pointsToWin - 2
            )

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(22)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).resign()

            // Check that match is in reveal card state
            let matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)

            // 2 of Coins and 10 of Coins should sum 22
            let cardsThatSumEnvidoSpelledOk = [
                BigNumber.from(2),
                BigNumber.from(8),
            ]

            const revealCardsProofToSign = await match.getCardProofToForSigning(
                player2.address,
                cardsThatSumEnvidoSpelledOk
            )
            const arrayed = ethers.utils.arrayify(revealCardsProofToSign)
            const signedProof = await player2.signMessage(arrayed)

            await match
                .connect(player2)
                .revealCards(cardsThatSumEnvidoSpelledOk, signedProof)

            // Check that match is finished after reveal
            matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.FINISHED)
        })

        it('Reveal different cards that do not count for spelled envido count', async function () {
            const { match, player1, player2 } =
                await deployMatchContractReadyToPlay()

            await match.connect(player2).spellEnvido()
            await match.connect(player1).acceptChallenge()

            await match.connect(player2).spellEnvidoCount(33)
            await match.connect(player1).spellEnvidoCount(0)

            await match.connect(player2).playCard(2, []) // 2 of Coins
            await match.connect(player1).resign()

            let matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)

            // 7 of Coins and 10 of Coins should sum 27 and do not match
            let cardsThatDoNotCountForEnvido = [
                BigNumber.from(7),
                BigNumber.from(8),
            ]

            const revealCardsProofToSign = await match.getCardProofToForSigning(
                player2.address,
                cardsThatDoNotCountForEnvido
            )
            const arrayed = ethers.utils.arrayify(revealCardsProofToSign)
            const signedProof = await player2.signMessage(arrayed)

            await expect(
                match
                    .connect(player2)
                    .revealCards(cardsThatDoNotCountForEnvido, signedProof)
            ).to.be.revertedWith('Envido count from cards does not match')

            matchState = await match.matchState()
            expect(matchState.state).to.equal(MatchStateEnum.WAITING_FOR_REVEAL)
        })
    })
})
