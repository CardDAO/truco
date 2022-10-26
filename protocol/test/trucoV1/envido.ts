import { expect } from "chai";
import { ethers } from "hardhat";

import { CardsStructs } from "../../typechain-types/contracts/trucoV1/Engine";
import { ActionEnum, ChallengeEnum, ResponseEnum } from "./struct-enums";

import MoveStruct = CardsStructs.MoveStruct;
import TransactionStruct = CardsStructs.TransactionStruct;
import GameStateStruct = CardsStructs.GameStateStruct;

import { BigNumber, BigNumberish } from "ethers";

describe("Envido Resolver", function () {
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

  describe("Invalid moves", function () {
    it("Invalid move #1: Incorrect challenge type on raising challenge", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameState();

      // Set current state to envido challenge
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido);

      await sut.setGameState(state);

      // Set action to a new challenge spell
      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [ChallengeEnum.Truco],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;

      move.parameters = [ChallengeEnum.ReTruco];
      transaction.moves = [move];

      await expect(sut.executeTransaction(transaction)).to.be.reverted;

      move.parameters = [ChallengeEnum.ValeCuatro];
      transaction.moves = [move];

      await expect(sut.executeTransaction(transaction)).to.be.reverted;

      move = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [ChallengeEnum.None],
      };

      transaction.moves = [move];

      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });

    it("Invalid move #2: Spell envido count on invalid situations", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameState();

      state.playerTurn = currentPlayerIdx;

      // Envido has spelled but not yet accepted
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido);
      state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx);
      state.currentChallenge.waitingChallengeResponse = true;
      state.currentChallenge.response = BigNumber.from(ResponseEnum.None);

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.EnvidoCount),
        parameters: [BigNumber.from(33)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await expect(sut.executeTransaction(transaction)).to.be.reverted;

      // Envido has spelled but refused
      state.currentChallenge.waitingChallengeResponse = false;
      state.currentChallenge.response = BigNumber.from(ResponseEnum.Refuse);

      await expect(sut.executeTransaction(transaction)).to.be.reverted;

      // Envido has spelled and accepted, but other player didn't cast envido count being the one who shuffled
      state.currentChallenge.challenger = BigNumber.from(currentPlayerIdx);
      state.currentChallenge.response = BigNumber.from(ResponseEnum.Accept);

      await expect(sut.executeTransaction(transaction)).to.be.reverted;
    });
  });

  /**
   * Precondintion: A challenge is in place but is not yet accepted (or raised)
   */
  describe("No previous challenge", function () {
    
    it("Spell Challenge: Envido", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameState();

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [BigNumber.from(ChallengeEnum.Envido)],
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
          BigNumber.from(ChallengeEnum.Envido)
      );
      expect(result.currentChallenge.waitingChallengeResponse).to.be.true;
      expect(result.currentChallenge.response).to.be.equal(
          BigNumber.from(ResponseEnum.None)
      );
      expect(result.currentChallenge.pointsAtStake).to.be.equal(
          BigNumber.from(2)
      );
      expect(result.currentChallenge.challenger).to.be.equal(
          currentPlayerIdx
      );
    });

    it("Spell Challenge: FaltaEnvido", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameState();
      state.pointsToWin = BigNumber.from(30);
      
      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Challenge),
        parameters: [BigNumber.from(ChallengeEnum.FaltaEnvido)],
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
          BigNumber.from(ChallengeEnum.FaltaEnvido)
      );
      expect(result.currentChallenge.waitingChallengeResponse).to.be.true;
      expect(result.currentChallenge.response).to.be.equal(
          BigNumber.from(ResponseEnum.None)
      );
      expect(result.currentChallenge.pointsAtStake).to.be.equal(
          BigNumber.from(30)
      );
      expect(result.currentChallenge.challenger).to.be.equal(
          currentPlayerIdx
      );
    });
    
    
  });

  /**
   * Precondintion: A challenge is in place but is not yet accepted (or raised)
   */
  describe("Challenge in place: Response waiting", function () {
    // Envido has spelled by current player and accepted by other party
    function basicGameStateWithEnvidoSpellWaiting(): GameStateStruct {
      let state: GameStateStruct = basicGameState();

      // Envido has spelled by other player and accepted, cant respond anymore
      state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido);
      state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx);
      state.currentChallenge.waitingChallengeResponse = true;
      state.currentChallenge.pointsAtStake = BigNumber.from(2);
      state.currentChallenge.response = BigNumber.from(ResponseEnum.None);

      return state;
    }
    
    it("Invalid response: 'None'is not accepted as a challenge response", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameStateWithEnvidoSpellWaiting();

      // Envido has spelled by other player but not yet accepted yet
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

    it(" Envido casted by current player and it's not the one who should respond", async function () {
      const { sut } = await deployContract();

      let state: GameStateStruct = basicGameStateWithEnvidoSpellWaiting();
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
      const {sut} = await deployContract();

      let state: GameStateStruct = basicGameStateWithEnvidoSpellWaiting();

      let move: MoveStruct = {
        action: BigNumber.from(ActionEnum.Response),
        parameters: [BigNumber.from(ResponseEnum.Refuse)],
      };

      let transaction: TransactionStruct = {
        playerIdx: state.playerTurn,
        moves: [move],
        state: state,
      };

      await sut.executeTransaction(transaction)

      let result: GameStateStruct = await sut.gameState();

      // Check resulting state
      expect(result.currentChallenge.waitingChallengeResponse).to.be.false;
      expect(result.currentChallenge.response).to.be.equal(
          BigNumber.from(ResponseEnum.Refuse)
      );
      expect(result.currentChallenge.pointsAtStake).to.be.equal(
          BigNumber.from(2)
      );
    })

      it("Accept challenge", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameStateWithEnvidoSpellWaiting();

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.Response),
          parameters: [BigNumber.from(ResponseEnum.Accept)],
        };

        let transaction: TransactionStruct = {
          playerIdx: state.playerTurn,
          moves: [move],
          state: state,
        };

        await sut.executeTransaction(transaction)

        let result: GameStateStruct = await sut.gameState();

        // Check resulting state
        expect(result.currentChallenge.waitingChallengeResponse).to.be.false;
        expect(result.currentChallenge.response).to.be.equal(
            BigNumber.from(ResponseEnum.Accept)
        );
        expect(result.currentChallenge.pointsAtStake).to.be.equal(
            BigNumber.from(2)
        );
        expect(result.currentChallenge.challenger).to.be.equal(
            otherPlayerIdx
        );
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
    it("Issue a Response an accept on an already accepted challenge", async function () {
      const { sut } = await deployContract();
      
      let state: GameStateStruct = basicGameStateWithEnvidoSpell();
      
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
    
    describe("Raising the challenge", function () {
      it("Raise Envido shouldn't be possible when raiser is the challenger", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameStateWithEnvidoSpell();

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.Challenge),
          parameters: [BigNumber.from(ChallengeEnum.RealEnvido)],
        };

        let transaction: TransactionStruct = {
          playerIdx: state.playerTurn,
          moves: [move],
          state: state,
        };

        await expect(sut.executeTransaction(transaction)).to.be.reverted;
      });

      it("Raise FaltaEnvido shouldn't be possible for any player", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameStateWithEnvidoSpell();

        // FaltaEnvido can't be raised
        state.currentChallenge.challenge = BigNumber.from(
          ChallengeEnum.FaltaEnvido
        );

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.Challenge),
          parameters: [BigNumber.from(ChallengeEnum.RealEnvido)],
        };

        let transaction: TransactionStruct = {
          playerIdx: state.playerTurn,
          moves: [move],
          state: state,
        };
        move.parameters = [BigNumber.from(ChallengeEnum.RealEnvido)];

        await expect(sut.executeTransaction(transaction)).to.be.reverted;
      });

      it("Raise Envido going OK", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameStateWithEnvidoSpell();

        state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx);

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.Challenge),
          parameters: [BigNumber.from(ChallengeEnum.RealEnvido)],
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
          BigNumber.from(ChallengeEnum.RealEnvido)
        );
        expect(result.currentChallenge.challenger).to.be.equal(
          currentPlayerIdx
        );
        expect(result.currentChallenge.pointsAtStake).to.be.equal(
          BigNumber.from(5)
        ); // Envido + RealEnvido
        expect(result.currentChallenge.waitingChallengeResponse).to.be.true;
        expect(result.currentChallenge.response).to.be.equal(
          BigNumber.from(ResponseEnum.None)
        );
      });

      it("Raise to Falta envido, check points", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameState();

        // Envido has spelled by current player and accepted, but cant be raised
        state.currentChallenge.challenge = BigNumber.from(ChallengeEnum.Envido);
        state.currentChallenge.challenger = BigNumber.from(otherPlayerIdx);
        state.currentChallenge.waitingChallengeResponse = false;
        state.currentChallenge.response = BigNumber.from(ResponseEnum.Accept);

        // Set match points
        state.pointsToWin = BigNumber.from(30);
        state.teamPoints[currentPlayerIdx.toNumber()] = BigNumber.from(15);
        state.teamPoints[otherPlayerIdx.toNumber()] = BigNumber.from(10);

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.Challenge),
          parameters: [BigNumber.from(ChallengeEnum.FaltaEnvido)],
        };

        let transaction: TransactionStruct = {
          playerIdx: state.playerTurn,
          moves: [move],
          state: state,
        };

        await sut.executeTransaction(transaction);

        let result: GameStateStruct = await sut.gameState();

        // Points at stake should be the remainder of the match points for the player that is winning
        expect(result.currentChallenge.pointsAtStake).to.be.equal(
          BigNumber.from(15)
        );
      });
    });

    describe("Points count stage", function () {
      it("Spell envido count being the player who shuffled deck, but other player didn't cast it's envido count first", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameStateWithEnvidoSpell();

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.EnvidoCount),
          parameters: [BigNumber.from(33)],
        };

        let transaction: TransactionStruct = {
          playerIdx: state.playerTurn,
          moves: [move],
          state: state,
        };

        // Spell envido count should fail because other player didn't cast their envido count
        await expect(sut.executeTransaction(transaction)).to.be.reverted;
      });

      it("Spell envido count being the player who shuffled deck - OK", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameStateWithEnvidoSpell();

        state.envidoCountPerPlayer[otherPlayerIdx.toNumber()] =
          BigNumber.from(33);

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.EnvidoCount),
          parameters: [BigNumber.from(33)],
        };

        let transaction: TransactionStruct = {
          playerIdx: state.playerTurn,
          moves: [move],
          state: state,
        };

        // Spell envido count should go fine
        await sut.executeTransaction(transaction);
      });

      it("Spell envido count being the player who didn't shuffle deck", async function () {
        const { sut } = await deployContract();

        let state: GameStateStruct = basicGameStateWithEnvidoSpell();

        let move: MoveStruct = {
          action: BigNumber.from(ActionEnum.EnvidoCount),
          parameters: [BigNumber.from(33)],
        };

        let transaction: TransactionStruct = {
          playerIdx: state.playerTurn,
          moves: [move],
          state: state,
        };

        // Spell envido count should fail because other player didn't cast their envido count
        await expect(sut.executeTransaction(transaction)).to.be.reverted;
      });


    });
  });
});