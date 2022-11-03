import { expect } from "chai";

import { CardsStructs } from "../../typechain-types/contracts/trucoV1/Engine";
import { ChallengeEnum } from "./struct-enums";
import { deployEngineContract } from "../deploy-engine-contract";

import MoveStruct = CardsStructs.MoveStruct;
import TransactionStruct = CardsStructs.TransactionStruct;

import { BigNumber } from "ethers";

describe("Engine Main Logic", function () {

  describe("Turn handling", function () {
    it("Incorrect turn", async function () {
      const { engine } = await deployEngineContract();

      let state = await engine.initialGameState();

      let move: MoveStruct = {
        action: BigNumber.from(ChallengeEnum.None),
        parameters: [],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn + 1,
        moves: [move],
        state: state,
      };

      await expect(engine.executeTransaction(transaction)).to.be.revertedWith(
        "Incorrect player turn"
      );
    });
  });
});
