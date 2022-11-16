import '@nomiclabs/hardhat-ethers'

export const forceDeployNewMatch = async (_, { ethers }) => {
    const [player1] = await ethers.getSigners()

    console.log(`Deploy match...`)

    const TrucoMatch = await ethers.getContractFactory('TrucoMatch')
    const match = await TrucoMatch.connect(player1).deploy(
        _.engine,
        _.trucoin,
        _.gamestatequeries,
        player1,
        10000
    )
    await match.deployed()

    console.log(`Match address ${match.address}`)
}
