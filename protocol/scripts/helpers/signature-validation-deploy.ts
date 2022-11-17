import { ethers } from 'hardhat'

export async function deploySignatureValidation() {
    const SignatureValidation = await ethers.getContractFactory(
        'SignatureValidation'
    )
    const signatureValidation = await SignatureValidation.deploy()
    await signatureValidation.deployed()

    return { signatureValidation }
}
