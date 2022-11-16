import '@nomiclabs/hardhat-ethers'

export const newMatchDeployTask = async (_, { ethers }) => {
    const MatchFactory = await ethers.getContractFactory('TrucoMatchFactory')
    const matchFactory = await MatchFactory.attach(_.factory)

    const Trucoin = await ethers.getContractFactory('Trucoin')
    const trucoin = await Trucoin.attach(_.trucoin)
    const amount = _.amount

    console.log(
        `Approve Trucoin amount ${amount} from ${_.player} to TrucoMatchFactory...`
    )

    await trucoin.connect(_.player).approve(_.factory, amount)

    console.log(`Deploy match...`)
    const tx = await matchFactory.connect(_.player).newMatch(amount)
    const { events } = await tx.wait()
    const event = events.find(
        (e: { event: string }) => e.event === 'TrucoMatchCreated'
    )
    if (event) {
        const match_address = event.args['match_address']
        console.log(`Deployed success. Match address: ${match_address}`)

        const TrucoMatch = await ethers.getContractFactory('TrucoMatch')
        const match = await TrucoMatch.attach(match_address)
        const currentMatch = await match.getPlayers()
        console.log(`Address - Player deployer: ${currentMatch}`)
    } else {
        console.log(`Deploy failed, event not found`)
    }
}
