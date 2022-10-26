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

    const TrucoEngine = await ethers.getContractFactory("EngineTester");
    const sut = await TrucoEngine.deploy(truecoin.address);

    return { sut, truecoin, owner };
  }

  describe("Invalid moves", function () {
    it("Invalid move #1: Incorrect challenge type", async function () {
      const {sut} = await deployContract();

      let state = await sut.startGame();

      let move: MoveStruct = {
        action: BigNumber.from(ChallengeEnum.Truco),
        parameters: [],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;

      move = {
        action: BigNumber.from(ChallengeEnum.ReTruco),
        parameters: [],
      };
      
      transaction.moves = [move];

      await expect(sut.executeTransaction(transaction)).to.be.reverted;


      move = {
        action: BigNumber.from(ChallengeEnum.ValeCuatro),
        parameters: [],
      };

      transaction.moves = [move];

      await expect(sut.executeTransaction(transaction)).to.be.reverted;

    });


  });
    
  describe("No previous challenge", function () {
    it("Spell Envido", async function () {
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

    });
  });
});
