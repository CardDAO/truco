import { expect } from "chai";
import { ethers } from "hardhat";

import { CardsStructs } from "../../typechain-types/contracts/trucoV1/Engine";
import { ActionEnum, ChallengeEnum, ResponseEnum } from "./struct-enums";

import MoveStruct = CardsStructs.MoveStruct;
import TransactionStruct = CardsStructs.TransactionStruct;
import GameStateStruct = CardsStructs.GameStateStruct;

import { BigNumber } from "ethers";

describe("Truco Resolver", function () {
  const currentPlayerIdx = BigNumber.from(0);
  const otherPlayerIdx = BigNumber.from(1);

  async function deployContract() {
    // Contracts are deployed using the first signer/account by default
    const [owner] = await ethers.getSigners();

    const Trucoin = await ethers.getContractFactory("Trucoin");
    const truecoin = await Trucoin.deploy();

    const TrucoEngine = await ethers.getContractFactory("EngineTester");
    const sut = await TrucoEngine.deploy(truecoin.address);

    return { sut, truecoin, owner };
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
        response: BigNumber.from(ResponseEnum.None),
      },
      revealedCardsByPlayer: [
        [BigNumber.from(0), BigNumber.from(0)],
        [BigNumber.from(0), BigNumber.from(0)],
        [BigNumber.from(0), BigNumber.from(0)],
      ],
      envidoCountPerPlayer: [BigNumber.from(0), BigNumber.from(0)],
      teamPoints: [BigNumber.from(0), BigNumber.from(0)],
    };
  }

  describe("Invalid moves", function () {});

  /**
   * Precondition: No challenge in place
   */
  describe("No previous challenge", function () {
    it("Spell Challenge: Truco", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameState();

      state.playerTurn = currentPlayerIdx;

      // Point at stake checkpoint
      const pointAtStake: BigNumber = state.currentChallenge.pointsAtStake;

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [BigNumber.from(ChallengeEnum.Truco)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await sut.executeTransaction(transaction);

      let result: GameStateStruct = await sut.gameState();

      // Check resulting state
      expect(result.currentChallenge.challenge).to.be.equal(
        BigNumber.from(ChallengeEnum.Truco)
      );
      expect(result.currentChallenge.waitingChallengeResponse).to.be.true;
      expect(result.currentChallenge.response).to.be.equal(
        BigNumber.from(ResponseEnum.None)
      );
      // Check that point at stake didn't change on challenge, they should change on acceptance
      expect(result.currentChallenge.pointsAtStake).to.be.equal(pointAtStake);
      expect(result.currentChallenge.challenger).to.be.equal(currentPlayerIdx);
    });

    it("Spell Challenge: Retruco when no Truco was spelled", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameState();

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [BigNumber.from(ChallengeEnum.ReTruco)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });

    it("Spell Challenge: ValeCuatro when no Truco was spelled", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameState();

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [BigNumber.from(ChallengeEnum.ValeCuatro)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });
  });

  /**
   * Precondintion: A challenge is in place but is not yet accepted (or raised)
   */
  describe("Challenge in place: waiting for a response", function () {
    // Envido has spelled by current player and accepted by other party
    function basicGameStateWithTrucoSpellWaiting(): GameStateStruct {
      let state: GameStateStruct = basicGameState();

      // Envido has spelled by other player and accepted, cant respond anymore
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Truco);
      state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx);
      state.currentChallenge.waitingChallengeResponse = true;
      state.currentChallenge.pointsAtStake = BigNumber.from(1);
      state.currentChallenge.response = BigNumber.from(ResponseEnum.None);

      return state;
    }

    it("Invalid response: 'None' is not accepted as a challenge response", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameStateWithTrucoSpellWaiting();

      // Truco has spelled by other player but not yet accepted yet
      state.currentChallenge.waitingChallengeResponse = true;
      state.currentChallenge.response = BigNumber.from(ResponseEnum.None);

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Response),
        parameters: [BigNumber.from(ResponseEnum.None)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });

    it("Raising challenge shouldn't be allowed without a valid response first", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameStateWithTrucoSpellWaiting();

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [BigNumber.from(ChallengeEnum.ReTruco)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });

    it("PlayCard shouldn't be allowed without a valid response first", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameStateWithTrucoSpellWaiting();

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.PlayCard),
        parameters: [BigNumber.from(1)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });

    it("Truco casted by current player and it's not the one who should respond", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameStateWithTrucoSpellWaiting();
      state.currentChallenge.challenger = BigNumber.from(currentPlayerIdx);

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Response),
        parameters: [BigNumber.from(ResponseEnum.Accept)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });

    it("Refuse challenge", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameStateWithTrucoSpellWaiting();

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Response),
        parameters: [BigNumber.from(ResponseEnum.Refuse)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await sut.executeTransaction(transaction);

      let result: GameStateStruct = await sut.gameState();

      // Check resulting state
      expect(result.currentChallenge.waitingChallengeResponse).to.be.false;
      expect(result.currentChallenge.response).to.be.equal(
        BigNumber.from(ResponseEnum.Refuse)
      );
      expect(result.currentChallenge.pointsAtStake).to.be.equal(
        BigNumber.from(1)
      );
    });

    describe("Challenge Accepted: Points at stake changing on acceptance", function () {
      it("No challenge to Truco", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameStateWithTrucoSpellWaiting();

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.Response),
          parameters: [BigNumber.from(ResponseEnum.Accept)],
        };

        let transaction: TransactionStruct = {
          playerIdx: state.playerTurn,
          moves: [move],
          state: state,
        };

        await sut.executeTransaction(transaction);

        let result: GameStateStruct = await sut.gameState();

        // Check resulting state
        expect(result.currentChallenge.waitingChallengeResponse).to.be.false;
        expect(result.currentChallenge.response).to.be.equal(
          BigNumber.from(ResponseEnum.Accept)
        );
        expect(result.currentChallenge.pointsAtStake).to.be.equal(
          BigNumber.from(2)
        );
        expect(result.currentChallenge.challenger).to.be.equal(otherPlayerIdx);
      });

      it("Truco to ReTruco", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameStateWithTrucoSpellWaiting();

        state.currentChallenge.challenge = BigNumber.from(
          ChallengeEnum.ReTruco
        );
        state.currentChallenge.pointsAtStake = BigNumber.from(2);

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.Response),
          parameters: [BigNumber.from(ResponseEnum.Accept)],
        };

        let transaction: TransactionStruct = {
          playerIdx: state.playerTurn,
          moves: [move],
          state: state,
        };

        await sut.executeTransaction(transaction);

        let result: GameStateStruct = await sut.gameState();

        // Check resulting state
        expect(result.currentChallenge.waitingChallengeResponse).to.be.false;
        expect(result.currentChallenge.response).to.be.equal(
          BigNumber.from(ResponseEnum.Accept)
        );
        expect(result.currentChallenge.pointsAtStake).to.be.equal(
          BigNumber.from(3)
        );
        expect(result.currentChallenge.challenger).to.be.equal(otherPlayerIdx);
      });

      it("Truco to ValeCuatro", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameStateWithTrucoSpellWaiting();

        state.currentChallenge.challenge = BigNumber.from(
          ChallengeEnum.ValeCuatro
        );
        state.currentChallenge.pointsAtStake = BigNumber.from(3);

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.Response),
          parameters: [BigNumber.from(ResponseEnum.Accept)],
        };

        let transaction: TransactionStruct = {
          playerIdx: state.playerTurn,
          moves: [move],
          state: state,
        };

        await sut.executeTransaction(transaction);

        let result: GameStateStruct = await sut.gameState();

        // Check resulting state
        expect(result.currentChallenge.waitingChallengeResponse).to.be.false;
        expect(result.currentChallenge.response).to.be.equal(
          BigNumber.from(ResponseEnum.Accept)
        );
        expect(result.currentChallenge.pointsAtStake).to.be.equal(
          BigNumber.from(4)
        );
        expect(result.currentChallenge.challenger).to.be.equal(otherPlayerIdx);
      });
    });
  });

  /**
   * Precondintion: A challenge was REFUSED
   */
  describe("Challenge in place: Refused", function () {
    // Envido has spelled by current player and accepted by other party
    function basicGameStateWithEnvidoSpellRefused(): GameStateStruct {
      let state: GameStateStruct = basicGameState();

      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Truco);
      state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx);
      state.currentChallenge.waitingChallengeResponse = false;
      state.currentChallenge.response = BigNumber.from(ResponseEnum.Refuse);
      state.currentChallenge.pointsAtStake = BigNumber.from(1);

      return state;
    }
    it("No PlayCard  should be spelled", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameStateWithEnvidoSpellRefused();

      state.playerTurn = currentPlayerIdx;

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.PlayCard),
        parameters: [BigNumber.from(0)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });

    it("No raising challenge should be spelled", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameStateWithEnvidoSpellRefused();

      state.playerTurn = currentPlayerIdx;

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [BigNumber.from(ChallengeEnum.ReTruco)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;

      move.parameters = [BigNumber.from(ChallengeEnum.ValeCuatro)];
      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });

    it("No response should be spelled", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameStateWithEnvidoSpellRefused();

      state.playerTurn = currentPlayerIdx;

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Response),
        parameters: [BigNumber.from(ResponseEnum.Accept)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;

      move.parameters = [BigNumber.from(ResponseEnum.Refuse)];
      await expect(sut.executeTransaction(transaction)).to.be.reverted;

      move.parameters = [BigNumber.from(ResponseEnum.None)];
      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });
  });
  /**
   * Precondintion: A challenge was ACCEPTED
   */
  describe("Challenge in place: Accepted", function () {
    // Envido has spelled by current player and accepted by other party
    function basicGameStateWithEnvidoSpell(): GameStateStruct {
      let state: GameStateStruct = basicGameState();

      state.playerWhoShuffled = otherPlayerIdx;
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido);
      state.currentChallenge.challenger = BigNumber.from(currentPlayerIdx);
      state.currentChallenge.waitingChallengeResponse = false;
      state.currentChallenge.response = BigNumber.from(ResponseEnum.Accept);
      state.currentChallenge.pointsAtStake = BigNumber.from(2);

      return state;
    }
    describe("Out of order moves", function () {});

    describe("Raising the challenge", function () {});

    describe("Points count stage", function () {});
  });
  /**
   * Precondition: A challenge is finished (all players have cast their envido count)
   */
  describe("Challenge is finished", function () {
    // Envido has spelled by current player and accepted by other party
    function basicGameStateWithEnvidoSpellFinished(): GameStateStruct {
      let state: GameStateStruct = basicGameState();

      // Envido has spelled by other player and accepted, cant respond anymore
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido);
      state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx);
      state.currentChallenge.waitingChallengeResponse = false;
      state.currentChallenge.pointsAtStake = BigNumber.from(2);
      state.currentChallenge.response = BigNumber.from(ResponseEnum.Accept);

      return state;
    }

    describe("Compute the winner", function () {});
  });
});
