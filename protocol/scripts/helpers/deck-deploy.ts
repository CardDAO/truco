import { ethers } from 'hardhat'

export async function deployDeckContract() {
    const CardsDeck = await ethers.getContractFactory('CastilianDeck')
    const cardsDeck = await CardsDeck.deploy()

    return { cardsDeck }
}
