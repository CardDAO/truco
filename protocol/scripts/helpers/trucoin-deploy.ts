import { ethers } from "hardhat";

export async function deployTrucoinContract() {
    const Trucoin = await ethers.getContractFactory('Trucoin')
    const trucoin = await Trucoin.deploy()
}
