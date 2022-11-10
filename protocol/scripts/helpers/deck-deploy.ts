import { ethers } from "hardhat";

export async function deployDeckContract() {
    const CardsDeck = await ethers.getContractFactory('CastillianDeck')
    const cardsDeck = await CardsDeck.deploy()

    return { cardsDeck }
}
