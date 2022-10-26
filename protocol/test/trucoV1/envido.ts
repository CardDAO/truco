import { expect } from "chai"
import { ethers } from "hardhat"

import { CardsStructs } from "../../typechain-types/contracts/trucoV1/Engine"
import { ActionEnum, ChallengeEnum, ResponseEnum } from "./struct-enums"

import MoveStruct = CardsStructs.MoveStruct
import TransactionStruct = CardsStructs.TransactionStruct
import GameStateStruct = CardsStructs.GameStateStruct

import { BigNumber, BigNumberish } from "ethers"

describe("Envido Resolver", function () {

  const currentPlayerIdx = BigNumber.from(0);
  const otherPlayerIdx = BigNumber.from(1);
  
  async function deployContract() {
    // Contracts are deployed using the first signer/account by default
    const [owner] = await ethers.getSigners()

    const Trucoin = await ethers.getContractFactory("Trucoin")
    const truecoin = await Trucoin.deploy()

    const TrucoEngine = await ethers.getContractFactory("EngineTester")
    const sut = await TrucoEngine.deploy(truecoin.address)
    
    return { sut, truecoin, owner }
  }

  function basicGameState(): GameStateStruct {
    return {
      playerTurn: BigNumber.from(currentPlayerIdx),
      playerWhoShuffled: BigNumber.from(currentPlayerIdx),
      pointsToWin: BigNumber.from(0),
      currentChallenge: {
        challenge: BigNumber.from(ChallengeEnum.None),
        challenger: BigNumber.from(currentPlayerIdx),
        pointsAtStake: BigNumber.from(currentPlayerIdx),
        waitingChallengeResponse: false,
        response: BigNumber.from(ResponseEnum.None)
      },
      revealedCardsByPlayer: [
          [BigNumber.from(0), BigNumber.from(0)],
          [BigNumber.from(0), BigNumber.from(0)],
          [BigNumber.from(0), BigNumber.from(0)]

      ],
      envidoCountPerPlayer: [BigNumber.from(0), BigNumber.from(0)],
      teamPoints: [BigNumber.from(0), BigNumber.from(0)],
    }
  }

  describe("Invalid moves", function () {
    it("Invalid move #1: Incorrect challenge type on raising challenge", async function () {
      const { sut } = await deployContract()

      let state: GameStateStruct = basicGameState();

      // Set current state to envido challenge
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
      
      await sut.setGameState(state)
      
      // Set action to a new challenge spell
      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [ChallengeEnum.Truco],
      }

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      }

      await expect(sut.executeTransaction(transaction)).to.be.reverted

      move.parameters = [ChallengeEnum.ReTruco]
      transaction.moves = [move]

      await expect(sut.executeTransaction(transaction)).to.be.reverted
      
      move.parameters = [ChallengeEnum.ValeCuatro]
      transaction.moves = [move]

      await expect(sut.executeTransaction(transaction)).to.be.reverted

      move = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [ChallengeEnum.None],
      }

      transaction.moves = [move]

      await expect(sut.executeTransaction(transaction)).to.be.reverted
    })

    it("Invalid move #2: Spell envido count on invalid situations", async function () {
      const { sut } = await deployContract()
      
      let state: GameStateStruct = basicGameState();

      state.playerTurn = currentPlayerIdx;
      
      // Envido has spelled but not yet accepted
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
      state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx)
      state.currentChallenge.waitingChallengeResponse = true
      state.currentChallenge.response = BigNumber.from(ResponseEnum.None)
      
      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.EnvidoCount),
        parameters: [BigNumber.from(33)],
      }

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      }

      await expect(sut.executeTransaction(transaction)).to.be.reverted
      
      // Envido has spelled but refused
      state.currentChallenge.waitingChallengeResponse = false
      state.currentChallenge.response = BigNumber.from(ResponseEnum.Refuse)
      
      await expect(sut.executeTransaction(transaction)).to.be.reverted
      
      // Envido has spelled and accepted, but other player didn't cast envido count being the one who shuffled
      state.currentChallenge.challenger = BigNumber.from(currentPlayerIdx)
      state.currentChallenge.response = BigNumber.from(ResponseEnum.Accept)
      
      await expect(sut.executeTransaction(transaction)).to.be.reverted

    })
    
    
    })

  describe("No previous challenge", function () {
    it("Spell Envido", async function () {
      const { sut } = await deployContract()

      let state: GameStateStruct = basicGameState();

      let move: MoveStruct = {
        action: BigNumber.from(ChallengeEnum.Envido),
        parameters: [],
      }

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      }

      await sut.executeTransaction(transaction)
    })
  })


  describe("Challenge in place", function () {
    it("Raise Envido", async function () {
      const { sut } = await deployContract()

      let state: GameStateStruct = basicGameState();

      // Envido has spelled by current player and accepted, but cant be raised
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
      state.currentChallenge.challenger = BigNumber.from(currentPlayerIdx)
      state.currentChallenge.waitingChallengeResponse = false
      state.currentChallenge.response = BigNumber.from(ResponseEnum.Accept)
      
      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [BigNumber.from(ChallengeEnum.RealEnvido)],
      }

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      }

      await expect(sut.executeTransaction(transaction)).to.be.reverted

      state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx)

      // Challenge raising should go fine
      await sut.executeTransaction(transaction)
      
    })

    it("Spell envido count being the player who shuffled deck", async function () {
      const { sut } = await deployContract()

      let state: GameStateStruct = basicGameState();

      // Envido has spelled by current player and accepted, but cant be raised
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
      state.currentChallenge.challenger = BigNumber.from(currentPlayerIdx)
      state.currentChallenge.waitingChallengeResponse = false
      state.currentChallenge.response = BigNumber.from(ResponseEnum.Accept)
      
      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.EnvidoCount),
        parameters: [BigNumber.from(33)],
      }

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      }

      // Spell envido count should fail because other player didn't cast their envido count
      await expect(sut.executeTransaction(transaction)).to.be.reverted

      state.envidoCountPerPlayer[otherPlayerIdx.toNumber()] = BigNumber.from(33)

      // Spell envido count should go fine
      await sut.executeTransaction(transaction)

    })

    it("Spell envido count being the player who didn't shuffle deck", async function () {
      const { sut } = await deployContract()

      let state: GameStateStruct = basicGameState();

      // Envido has spelled by current player and accepted, but cant be raised
      state.playerWhoShuffled = otherPlayerIdx;
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido)
      state.currentChallenge.challenger = BigNumber.from(currentPlayerIdx)
      state.currentChallenge.waitingChallengeResponse = false
      state.currentChallenge.response = BigNumber.from(ResponseEnum.Accept)

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.EnvidoCount),
        parameters: [BigNumber.from(33)],
      }

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      }

      // Spell envido count should fail because other player didn't cast their envido count
      await expect(sut.executeTransaction(transaction)).to.be.reverted

      state.envidoCountPerPlayer[otherPlayerIdx.toNumber()] = BigNumber.from(33)

      // Spell envido count should go fine
      await sut.executeTransaction(transaction)

    })
  })
})
