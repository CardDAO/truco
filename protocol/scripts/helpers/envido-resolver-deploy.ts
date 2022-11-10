import { ethers } from "hardhat";

export async function deployTrucoinContract() {
    const EnvidoResolver = await ethers.getContractFactory('EnvidoResolver')
    const envidoResolver = await EnvidoResolver.deploy()

    return { envidoResolver }
}
