import { expect } from "chai";
import { ethers } from "hardhat";

import { CardsStructs } from "../../typechain-types/contracts/trucoV1/Engine";
import { ActionEnum, ChallengeEnum, ResponseEnum } from "./struct-enums";

import MoveStruct = CardsStructs.MoveStruct;
import TransactionStruct = CardsStructs.TransactionStruct;

import { BigNumber } from "ethers";

describe("Envido Resolver", function () {
  async function deployContract() {
    // Contracts are deployed using the first signer/account by default
    const [owner] = await ethers.getSigners();

    const Trucoin = await ethers.getContractFactory("Trucoin");
    const truecoin = await Trucoin.deploy();

    const TrucoEngine = await ethers.getContractFactory("EngineMock");
    const sut = await TrucoEngine.deploy(truecoin.address);

    return { sut, truecoin, owner };
  }

  describe("Envido Challenge: Spell Envido / No previous challenge", function () {
    it("Encrypt a Deck", async function () {
      const { sut } = await deployContract();

      let state = await sut.startGame();

      let move: MoveStruct = {
        action: BigNumber.from(ChallengeEnum.Envido),
        parameters: [],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await sut.executeTransaction(transaction);

      console.log(await sut.gameState());
    });
  });
});
