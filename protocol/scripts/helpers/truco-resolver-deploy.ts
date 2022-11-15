import { ethers, upgrades } from 'hardhat'

export async function deployTrucoResolverContract() {
    const TrucoResolver = await ethers.getContractFactory('TrucoResolver')
    const trucoResolver = await upgrades.deployProxy(TrucoResolver)
    await trucoResolver.deployed()
    return { trucoResolver }
}
