import { ethers } from "hardhat";
import { deployDeckContract } from "./helpers/deck-deploy"
import { deployEnvidoResolverContract } from "./helpers/envido-resolver-deploy"
import { deployFrontMatchFacadeContract } from "./helpers/front-match-facade-deploy"
import { deployGameStateQueriesContract } from "./helpers/game-state-queries-deploy"
import { deployMatchFactoryContract } from "./helpers/match-factory-contract"
import { deployEngineContract } from "./helpers/truco-engine-deploy"
import { deployTrucoResolverContract } from "./helpers/truco-resolver-deploy"
import { deployTrucoinContract } from "./helpers/trucoin-deploy"

async function main() {
    const { trucoin } = await deployTrucoinContract()
    console.log(`Trucoin deployed in address: ${trucoin.address}`)

    const { trucoResolver } = await deployTrucoResolverContract()
    console.log(`TrucoResolver deployed in address: ${trucoResolver.address}`)

    const { envidoResolver } = await deployEnvidoResolverContract()
    console.log(`EnvidoResolver deployed in address: ${envidoResolver.address}`)

    const { cardsDeck } = await deployDeckContract()
    console.log(`Deck deployed in address: ${cardsDeck.address}`)

    const { gameStateQueries } = await deployGameStateQueriesContract(cardsDeck, envidoResolver, trucoResolver)
    console.log(`GameStateQueries deployed in address: ${gameStateQueries.address}`)

    const { frontMatchFacade } = await deployFrontMatchFacadeContract(gameStateQueries)
    console.log(`FrontMatchFacade deployed in address: ${frontMatchFacade.address}`)

    const { engine } = await deployEngineContract(trucoin, trucoResolver, envidoResolver, gameStateQueries)
    console.log(`Engine deployed in address: ${engine.address}`)

    // Minimum bet is the engine minimum fee divided by 2 players plus some extra
    const min_bet = (await engine.MINIMUM_FEE()).div(2).add(1000)

    const { factory } = await deployMatchFactoryContract(engine, trucoin, gameStateQueries, min_bet)
    console.log(`MatchFactory deployed in address: ${factory.address}`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
