import { ethers, upgrades } from 'hardhat'

export async function deployEnvidoResolverContract() {
    const EnvidoResolver = await ethers.getContractFactory('EnvidoResolver')
    const envidoResolver = await upgrades.deployProxy(EnvidoResolver, [])
    await envidoResolver.deployed()

    return { envidoResolver }
}
