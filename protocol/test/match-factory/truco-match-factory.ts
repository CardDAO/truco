import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'

import { deployFactoryContract } from '../deploy-contracts'

describe('Truco Match Factory', function () {
    // New Match tests
    describe('New Match', function () {
        it('Should create a new match and emit an Event', async function () {
            const { factory, trucoin, min_bet } = await loadFixture(
                deployFactoryContract
            )

            const [player1, player2] = await ethers.getSigners()

            // Mint trucoins to player1
            trucoin.mint(player1.address, min_bet)

            // Approve trucoins to be used by the match contract
            await trucoin.connect(player1).approve(factory.address, min_bet)

            // Create a new match
            expect(await factory.connect(player1).newMatch(min_bet))
                .to.emit(
                    factory,
                    'TrucoMatchCreated'
                )
        })

        it('Should transfer the bet to the match contract', async function () {
            const { factory, trucoin, min_bet } = await loadFixture(
                deployFactoryContract
            )
            const [player1, player2] = await ethers.getSigners()

            // Mint trucoins to player1
            trucoin.mint(player1.address, min_bet)

            // Approve trucoins to be used by the match contract
            await trucoin.connect(player1).approve(factory.address, min_bet)

            // Create a new match and get the address
            const tx = await factory.connect(player1).newMatch(min_bet)

            const { events } = await tx.wait()
            const event = events.find(
                (e: { event: string }) => e.event === 'TrucoMatchCreated'
            )
            const match_address = event.args['match_address']
            // Check if the bet was transfered to the match contract
            expect(await trucoin.balanceOf(match_address)).to.equal(min_bet)
        })
    })
})
