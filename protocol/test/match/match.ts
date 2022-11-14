import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployMatchContract } from '../deploy-contracts'

import { BigNumber } from 'ethers'
import { ChallengeEnum, ResponseEnum } from '../trucoV1/struct-enums'

describe('Truco Match', function () {
    // Constructor tests
    describe('Constructor', function () {
        it('The owner must be player 1. Player 2 must be address(0)', async function () {
            const { match, owner } = await loadFixture(deployMatchContract)

            await match.getPlayers().then((players) => {
                expect(players[0]).to.equal(owner.address)
                expect(players[1]).to.equal(ethers.constants.AddressZero)
            })
        })
    })

    // Join tests
    describe('Join', function () {
        it('Player 2 must be able to join the match', async function () {
            const { match, trucoin, owner, player2, bet } = await loadFixture(
                deployMatchContract
            )

            // Allow trucoin transfer
            await trucoin.connect(player2).approve(match.address, bet)

            await match.connect(player2).join()

            await match.getPlayers().then((players) => {
                expect(players[0]).to.equal(owner.address)
                expect(players[1]).to.equal(player2.address)
            })
        })

        it('Must not be able to join the match if it is already full', async function () {
            const { match, trucoin, owner, player2, invalid_player, bet } =
                await loadFixture(deployMatchContract)

            // Allow trucoin transfer
            await trucoin.connect(player2).approve(match.address, bet)
            await trucoin.connect(invalid_player).approve(match.address, bet)

            await match.connect(player2).join()
            await expect(
                match.connect(invalid_player).join()
            ).to.be.revertedWith('Match is full')

            await match.getPlayers().then((players) => {
                expect(players[0]).to.equal(owner.address)
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
            const { match, trucoin, owner, bet } = await loadFixture(
                deployMatchContract
            )

            // Allow trucoin transfer
            await trucoin.connect(owner).approve(match.address, bet)

            await expect(match.connect(owner).join()).to.be.revertedWith(
                'Match creator is already joined'
            )
        })

        // Must start the match if both players are joined & tokens are transfered
        it('Must start the match if both players are joined & tokens are transfered', async function () {
            const { match, trucoin, owner, player2, bet } = await loadFixture(
                deployMatchContract
            )

            // Allow trucoin transfer
            await trucoin.connect(owner).approve(match.address, bet)
            await trucoin.connect(player2).approve(match.address, bet)

            // Player 2 joins the match
            expect(await match.connect(player2).join()).to.emit(
                match,
                'MatchStarted'
            )

            await match.getPlayers().then((players) => {
                expect(players[0]).to.equal(owner.address)
                expect(players[1]).to.equal(player2.address)
            })
        })
    })

    // New Deal tests
})
