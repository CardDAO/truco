// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Structs.sol";

import "./resolvers/EnvidoResolver.sol";
import "./resolvers/TrucoResolver.sol";
import "./IERC3333.sol";

contract Engine is IERC3333, Ownable {
    IERC20 trucoin;

    uint8 internal constant POINTS_NO_CHALLENGE = 1;

    uint8 public constant CARD_NOT_REVEALED_RESERVED_IDX = 0;

    constructor(IERC20 _trucoin) {
        trucoin = _trucoin;
    }

    function startGame() external pure returns (CardsStructs.GameState memory) {
        // Check that consumer contract has not already payed for game

        // If not, transfer 1% of caller contract balance on Truecoins

        // Init game state
        return initialGameState();
    }

    // Returns an initial Game State with default values
    function initialGameState()
        internal
        pure
        returns (CardsStructs.GameState memory _gameState)
    {
        _gameState.currentChallenge.challenge = CardsStructs.Challenge.None;
        _gameState.currentChallenge.pointsAtStake = POINTS_NO_CHALLENGE;
        _gameState.currentChallenge.response = CardsStructs.Response.None;
    }

    function transact(CardsStructs.Transaction calldata transaction)
        external
        returns (CardsStructs.GameState memory gameState)
    {
        // check if game is started for current call

        // Check correct turn
        require(
            transaction.state.playerTurn == transaction.playerIdx,
            "Incorrect player turn"
        );

        gameState = transaction.state;

        // Loops betweeen moves
        for (uint256 i = 0; i < transaction.moves.length; i++) {
            gameState = resolveMove(gameState, transaction.moves[i]);
        }

        // Player switch before returning state
        if (gameState.playerTurn == 0) {
            gameState.playerTurn = 1;
        } else {
            gameState.playerTurn = 0;
        }

        return gameState;
    }

    function resolveMove(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) internal returns (CardsStructs.GameState memory) {
        // Verify if it's a valid move
        require(isMoveValid(_gameState, _move), "Move is invalid");

        if (_move.action == CardsStructs.Action.Resign) {
            // Resign
        }

        if (
            _gameState.currentChallenge.challenge == CardsStructs.Challenge.None
        ) {
            if (_move.action == CardsStructs.Action.PlayCard) {
                return TrucoResolver.resolve(_gameState, _move);
            }
        }

        if (
            EnvidoResolver.canResolve(_gameState.currentChallenge.challenge) ||
            isMoveAChallengeForEnvido(_move)
        ) {
            return EnvidoResolver.resolve(_gameState, _move);
        }

        if (
            TrucoResolver.canResolve(_gameState.currentChallenge.challenge) ||
            isMoveAChallengeForTruco(_move)
        ) {
            return TrucoResolver.resolve(_gameState, _move);
        }

        revert("Invalid move for given game state");
    }

    function isMoveAChallengeForEnvido(CardsStructs.Move memory _move)
        internal
        pure
        returns (bool)
    {
        if (_move.action != CardsStructs.Action.Challenge) {
            return false;
        }
        return
            EnvidoResolver.canResolve(
                CardsStructs.Challenge(_move.parameters[0])
            );
    }

    function isMoveAChallengeForTruco(CardsStructs.Move memory _move)
        internal
        pure
        returns (bool)
    {
        if (_move.action != CardsStructs.Action.Challenge) {
            return false;
        }
        return
            TrucoResolver.canResolve(
                CardsStructs.Challenge(_move.parameters[0])
            );
    }

    function processMoveNoActiveChallenge(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) internal returns (CardsStructs.GameState memory) {


    }

    // [Owner] Transfer gained fees to an arbitrary address
    function transferFeesTo(address _recipient, uint256 _amount)
        public
        onlyOwner
    {
        trucoin.transfer(_recipient, _amount);
    }

    function isGameEnded(CardsStructs.GameState memory gameState)
        external
        returns (bool)
    {}

    // Check if envido can be spelled at rhis game 
    function canEnvidoBeSpelled(CardsStructs.GameState memory gameState)
        internal
        returns (bool)
    {
        return 
            ! EnvidoResolver.isFinal(gameState) && 
            TrucoResolver.roundAtPlay(gameState) == 0;
    }

    function isMoveValid(
        CardsStructs.GameState memory gameState,
        CardsStructs.Move memory move
    ) internal returns (bool) {
        CardsStructs.Challenge challenge = gameState.currentChallenge.challenge;

        // Poors man Finite State Machine (FSM) on Solidity times...
        if (move.action == CardsStructs.Action.Resign) {
            //Any player can resign at any time
            return true;
        }

        if (challenge == CardsStructs.Challenge.None) {
            return
                move.action == CardsStructs.Action.PlayCard ||
                move.action == CardsStructs.Action.Challenge;
        }

        if (
            challenge == CardsStructs.Challenge.Truco ||
            challenge == CardsStructs.Challenge.ReTruco ||
            challenge == CardsStructs.Challenge.ValeCuatro
        ) {
            // Current player is not challenger, check if there's a response to enforce
            if (gameState.currentChallenge.waitingChallengeResponse) {
                if (canEnvidoBeSpelled(gameState)) {
                    // Check if envido can be spelled
                }
                return
                    move.action == CardsStructs.Action.Challenge ||
                    move.action == CardsStructs.Action.Response;
            }

            return
                move.action == CardsStructs.Action.Response ||
                move.action == CardsStructs.Action.PlayCard ||
                move.action == CardsStructs.Action.Challenge;
        }

        if (
            challenge == CardsStructs.Challenge.Envido ||
            challenge == CardsStructs.Challenge.RealEnvido ||
            challenge == CardsStructs.Challenge.EnvidoEnvido
        ) {
            return
                move.action == CardsStructs.Action.Response ||
                move.action == CardsStructs.Action.Challenge ||
                move.action == CardsStructs.Action.EnvidoCount;
        }

        if (challenge == CardsStructs.Challenge.FaltaEnvido) {
            return
                move.action == CardsStructs.Action.Response ||
                move.action == CardsStructs.Action.EnvidoCount;
        }

        return false;
    }
}
