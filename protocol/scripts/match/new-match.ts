
import "@nomiclabs/hardhat-ethers";

export const deployNewMatch = async (_, { ethers }) => {
    const MatchFactory = await ethers.getContractFactory("TrucoMatchFactory") 
    const matchFactory = await MatchFactory.attach(_.factory) 
    // TODO use param
    const [player1, player2, player3] = await ethers.getSigners()

    const Trucoin = await ethers.getContractFactory("Trucoin") 
    const trucoin = await Trucoin.attach(_.trucoin) 
    const amount = _.amount

    console.log(`Approve Trucoin amount ${amount} from ${player3.address} to TrucoMatchFactory...`)
    await trucoin.connect(player3).approve(_.factory, amount)

    console.log(`Deploy match...`)
    const tx = await matchFactory.connect(player3).newMatch(amount)
    const { events } = await tx.wait()
    const event = events.find(
        (e: { event: string }) => e.event === 'TrucoMatchCreated'
    )
    const match_address = event.args['match_address']

    console.log(`Deployed success. Match address: ${match_address}`)
}
