import '@nomiclabs/hardhat-ethers'

export const forceDeployNewMatch = async (_, { ethers }) => {
    const [player1, player2, player3] = await ethers.getSigners()

    console.log(`Deploy match...`)

    //
    //
    const TrucoMatch = await ethers.getContractFactory('TrucoMatch')
    const match = await TrucoMatch.connect(player3).deploy(
        _.engine,
        _.trucoin,
        _.gamestatequeries,
        10000
    )
    await match.deployed()

    console.log(`Match address ${match.address}`)
}
