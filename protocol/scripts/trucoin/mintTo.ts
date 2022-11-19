import '@nomiclabs/hardhat-ethers'

export const mint = async (_, { ethers }) => {
    const beneficiaryAddress = _.beneficiary
    const Trucoin = await ethers.getContractFactory('Trucoin')
    const trucoin = await Trucoin.attach(_.contract)
    const amount = _.amount

    const tx = await trucoin.mint(beneficiaryAddress, amount)
    const { events } = await tx.wait()
    console.log('events', events)
    const event = events.find(
        (e: { event: string }) => e.event === 'Transfer'
    )
    if (event) {
        console.log(
            `Mint ${ethers.utils.formatEther(
                amount
            )} Trucoins to address: ${beneficiaryAddress}`
        )
    } else {
        throw Error(`No minted tokens`)
    }
}
