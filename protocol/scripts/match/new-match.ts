
import "@nomiclabs/hardhat-ethers";

export const deployNewMatch = async (_, { ethers }) => {
    const MatchFactory = await ethers.getContractFactory("TrucoMatchFactory") 
    const matchFactory = await MatchFactory.attach(_.factory) 
    const [player1, player2, player3] = await ethers.getSigners()

    const Trucoin = await ethers.getContractFactory("Trucoin") 
    const trucoin = await Trucoin.attach(_.trucoin) 
    const amount = _.amount

    await trucoin.connect(player3).approve(_.factory.address, amount)

    await matchFactory.connect(player3).newMatch(amount)

   console.log(`Deployed match...`)
   // TODO no deploya aún
}
