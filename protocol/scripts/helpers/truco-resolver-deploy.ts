import { ethers } from "hardhat";

export async function deployTrucoinContract() {
    const TrucoResolver = await ethers.getContractFactory('TrucoResolver')
    const trucoResolver = await TrucoResolver.deploy()
    return { trucoResolver }
}
