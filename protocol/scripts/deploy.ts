import { ethers } from "hardhat";
import { deployDeckContract } from "./helpers/deck-deploy"
import { deployEnvidoResolverContract } from "./helpers/envido-resolver-deploy"
import { deployGameStateQueriesContract } from "./helpers/game-state-queries-deploy"
import { deployEngineContract } from "./helpers/truco-engine-deploy"
import { deployTrucoResolverContract } from "./helpers/truco-resolver-deploy"
import { deployTrucoinContract } from "./helpers/trucoin-deploy"

async function main() {
    const { trucoin } = await deployTrucoinContract()
    const { trucoResolver } = await deployTrucoResolverContract()
    const { envidoResolver } = await deployEnvidoResolverContract()
    const { cardsDeck } = await deployDeckContract()
    const { gameStateQueries } = await deployGameStateQueriesContract(cardsDeck, envidoResolver, trucoResolver)
    const { engine } = await deployEngineContract(trucoin, trucoResolver, envidoResolver, gameStateQueries)

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
