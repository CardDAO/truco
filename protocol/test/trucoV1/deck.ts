import { expect } from 'chai'
import { ethers } from 'hardhat'

import { BigNumber } from 'ethers'

describe('Deck logic', function () {
    async function deployContract() {
        const CardsDeck = await ethers.getContractFactory('CastillianDeck')
        const sut = await CardsDeck.deploy()

        return { sut }
    }

    it('Resolve correct suit', async function () {
        const { sut } = await deployContract()

        expect(await sut.suitName(BigNumber.from(1))).to.equal('Coins')

        expect(await sut.suitName(BigNumber.from(11))).to.equal('Cups')

        expect(await sut.suitName(BigNumber.from(21))).to.equal('Swords')
    })

    it('Decode invalid card', async function () {
        const { sut } = await deployContract()

        // Card reserved
        expect(sut.decodeCard(BigNumber.from(0))).to.be.reverted

        // Out of bonds but right on upper limit
        expect(sut.decodeCard(BigNumber.from(41))).to.be.reverted

        // Out of bonds by far
        expect(sut.decodeCard(BigNumber.from(100))).to.be.reverted

        // Our of bond lower limit
        expect(sut.decodeCard(BigNumber.from(-1))).to.be.reverted
    })

    it('Check suits from cards', async function () {
        const { sut } = await deployContract()

        // Different suit (adyacent)
        expect(await sut.areSameSuit(BigNumber.from(1), BigNumber.from(11))).to
            .be.false

        // Different suit (not adyacent)
        expect(await sut.areSameSuit(BigNumber.from(1), BigNumber.from(31))).to
            .be.false

        // Same suit
        expect(await sut.areSameSuit(BigNumber.from(1), BigNumber.from(5))).to
            .be.true

        // Same suit upper limit
        expect(await sut.areSameSuit(BigNumber.from(1), BigNumber.from(10))).to
            .be.true

        // Invalid card
        expect(await sut.areSameSuit(BigNumber.from(1), BigNumber.from(41))).to
            .be.reverted
    })
})
