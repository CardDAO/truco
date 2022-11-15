import { ethers } from "hardhat";

export async function deployTrucoChampionsTokenContract() {
    const TrucoChampionsToken = await ethers.getContractFactory('TrucoChampionsToken')
    const trucoChampionsToken = await TrucoChampionsToken.deploy()
    return { trucoChampionsToken }
}
