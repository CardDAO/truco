import { ethers } from "hardhat";

export async function deployTrucoResolverContract() {
    const TrucoResolver = await ethers.getContractFactory('TrucoResolver')
    const trucoResolver = await TrucoResolver.deploy()
    return { trucoResolver }
}
