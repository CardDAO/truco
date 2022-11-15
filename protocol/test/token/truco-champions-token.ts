import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'

import { deployTrucoChampionsTokenContract } from '../../scripts/helpers/truco-champions-token-deploy'
import { TrucoChampionsToken__factory } from '../../typechain-types'

async function assignTokens() {
    const { trucoChampionsToken } = await loadFixture(
        deployTrucoChampionsTokenContract
    )
    const [match_factory, match, winner, loser] = await ethers.getSigners()

    // Mint the trophy token to the match contract
    const tx = await trucoChampionsToken
        .connect(match_factory)
        .mint(match.address)

    const { events } = await tx.wait()

    const event = events?.find((e) => e.event === 'TrucoTrophyMinted')
    const match_address = event?.args!['trucoMatch']
    const trophy_id = event?.args!['trophyId']

    const winnerScore = BigNumber.from(30)
    const loserScore = BigNumber.from(20)

    // Assign game result
    await trucoChampionsToken
        .connect(match)
        .assign(
            winner.address,
            winnerScore,
            loser.address,
            loserScore,
            trophy_id
        )

    return {
        trucoChampionsToken,
        match,
        winner,
        winnerScore,
        loser,
        loserScore,
        trophy_id,
    }
}

describe('Truco Champions Token', function () {
    describe('Minting', function () {
        // Should not allow to mint two tokens to the same match
        it('Should not allow to mint two tokens to the same match', async function () {
            const { trucoChampionsToken } = await loadFixture(
                deployTrucoChampionsTokenContract
            )
            const [match_factory, match] = await ethers.getSigners()
            await trucoChampionsToken.connect(match_factory).mint(match.address)
            await expect(
                trucoChampionsToken.connect(match_factory).mint(match.address)
            ).to.be.revertedWith('TrucoChampionsToken: Trophy already minted')
        })
    })

    describe('Assign tokens', function () {
        it('Should assign trophy to winner', async function () {
            const { trucoChampionsToken, winner, trophy_id } =
                await assignTokens()

            // Check if the trophy was assigned to the winner
            expect(await trucoChampionsToken.getWinner(trophy_id)).to.equal(
                winner.address
            )
        })

        it('Should assign players to trophy', async function () {
            const { trucoChampionsToken, winner, loser, trophy_id } =
                await assignTokens()

            // Check if the players are the same
            await trucoChampionsToken.getPlayers(trophy_id).then((players) => {
                expect(players[0]).to.equal(winner.address)
                expect(players[1]).to.equal(loser.address)
            })
        })

        it('Should set match to trophy', async function () {
            const { trucoChampionsToken, match, trophy_id } =
                await assignTokens()

            // Check if the match is the same
            await trucoChampionsToken
                .getTrophyByMatch(match.address)
                .then((trophy) => {
                    expect(trophy.tokenId).to.equal(trophy_id)
                })
        })

        // Should not allow non-match contract to assign tokens to players
        it('Should not allow non-match contract to assign tokens to players', async function () {
            const { trucoChampionsToken, winner, loser, trophy_id } =
                await assignTokens()
            const [non_match] = await ethers.getSigners()

            // Try to assign game result
            await expect(
                trucoChampionsToken
                    .connect(non_match)
                    .assign(winner.address, 30, loser.address, 20, trophy_id)
            ).to.be.revertedWith(
                'TrucoChampionsToken: Only the match contract can assign tokens'
            )
        })

        // Should show the matches that the player has played
        it('Should show the matches that the player has played', async function () {
            const { trucoChampionsToken, match, winner, loser } =
                await assignTokens()

            await trucoChampionsToken
                .matchesOf(loser.address)
                .then((matches) => {
                    expect(matches[0].trucoMatch).to.equal(match.address)
                })
        })

        // Should show the matches that the player has won
        it('Should show the matches that the player has won', async function () {
            const { trucoChampionsToken, match, winner } = await assignTokens()

            await trucoChampionsToken
                .trophiesOf(winner.address)
                .then((matches) => {
                    expect(matches[0].trucoMatch).to.equal(match.address)
                })
        })
    })
})
