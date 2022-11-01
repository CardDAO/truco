import { expect } from "chai";
import { ethers } from "hardhat";

import { CardsStructs } from "../../typechain-types/contracts/trucoV1/Engine";
import { ChallengeEnum } from "./struct-enums";

import MoveStruct = CardsStructs.MoveStruct;
import TransactionStruct = CardsStructs.TransactionStruct;

import { BigNumber } from "ethers";

describe("Engine Main Logic", function () {
  async function deployContract() {
    // Contracts are deployed using the first signer/account by default
    const [owner] = await ethers.getSigners();

    const Trucoin = await ethers.getContractFactory("Trucoin");
    const trucoin = await Trucoin.deploy();

    const TrucoResolver = await ethers.getContractFactory("TrucoResolver");
    const trucoResolver = await TrucoResolver.deploy();

    const EnvidoResolver = await ethers.getContractFactory("EnvidoResolver");
    const envidoResolver = await EnvidoResolver.deploy();

    const TrucoEngine = await ethers.getContractFactory("EngineTester");
    const sut = await TrucoEngine.deploy(
      trucoin.address,
      trucoResolver.address,
      envidoResolver.address
    );

    return { sut, trucoin, owner };
  }

  describe("Turn handling", function () {
    it("Incorrect turn", async function () {
      const { sut } = await deployContract();

      let state = await sut.initialGameState()

      let move: MoveStruct = {
        action: BigNumber.from(ChallengeEnum.None),
        parameters: [],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn + 1,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.revertedWith(
        "Incorrect player turn"
      );
    });
  });
});
