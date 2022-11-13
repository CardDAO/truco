import "@nomiclabs/hardhat-ethers";

export const mint = async (_, { ethers }) => {
    const beneficiaryAddress = _.beneficiary
    const Trucoin = await ethers.getContractFactory("Trucoin") 
    const trucoin = await Trucoin.attach(_.contract) 
    const amount = _.amount

    trucoin.mint(beneficiaryAddress, amount)

    console.log(`Mint ${ethers.utils.formatEther(amount)} Trucoins to address: ${beneficiaryAddress}`)
}
