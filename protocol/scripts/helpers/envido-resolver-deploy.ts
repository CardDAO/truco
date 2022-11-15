import { ethers } from 'hardhat'

export async function deployEnvidoResolverContract() {
    const EnvidoResolver = await ethers.getContractFactory('EnvidoResolver')
    const envidoResolver = await EnvidoResolver.deploy()

    return { envidoResolver }
}
