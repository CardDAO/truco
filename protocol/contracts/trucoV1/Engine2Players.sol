// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './interfaces/IERC3333.sol';
import './interfaces/IChallengeResolver.sol';
import './interfaces/ICardsDeck.sol';
import './GameStateQueries.sol';

contract Engine2Players is IERC3333, Ownable {
    IERC20 internal trucoin;
    IChallengeResolver internal envidoResolver;
    IChallengeResolver internal trucoResolver;
    GameStateQueries internal gameStateQueries;

    uint8 internal constant POINTS_NO_CHALLENGE = 1;
    uint8 internal constant ENVIDO_NOT_SPELLED_OOB = 99;

    constructor(
        IERC20 _trucoin,
        IChallengeResolver _trucoResolver,
        IChallengeResolver _envidoResolver,
        GameStateQueries _gameStateQueries
    ) {
        trucoin = _trucoin;
        envidoResolver = _envidoResolver;
        trucoResolver = _trucoResolver;
        gameStateQueries = _gameStateQueries;
    }

    function startGame() external returns (IERC3333.GameState memory) {
        // Check that consumer contract has not already payed for game

        // If not, transfer 1% of caller contract balance on Trucoins

        // Init game state
        return this.initialGameState();
    }

    // Returns an initial Game State with default values
    function initialGameState()
        external
        pure
        returns (IERC3333.GameState memory _gameState)
    {
        _gameState.currentChallenge.challenge = IERC3333.Challenge.None;
        _gameState.currentChallenge.pointsAtStake = POINTS_NO_CHALLENGE;
        _gameState.currentChallenge.response = IERC3333.Response.None;

        // Init team points
        _gameState.teamPoints = new uint8[](2);

        // Turn should be the opponent of shuffler
        _gameState.playerTurn = _gameState.playerWhoShuffled ^1;

        // Init envido count
        _gameState.envido.playerCount = new uint8[](2);
        // Set to an invalid envido count to signal that envido was not spelled with an out of bonds value
        _gameState.envido.playerCount[0] = ENVIDO_NOT_SPELLED_OOB;
        _gameState.envido.playerCount[1] = ENVIDO_NOT_SPELLED_OOB;
    }

    function transact(IERC3333.Transaction calldata transaction)
        external
        returns (IERC3333.GameState memory gameState)
    {
        // check if game is started for current call

        // Check correct turn
        require(
            transaction.state.playerTurn == transaction.playerIdx,
            'Incorrect player turn'
        );

        gameState = transaction.state;

        // Loops betweeen moves
        for (uint256 i = 0; i < transaction.moves.length; i++) {
            gameState = resolveMove(gameState, transaction.moves[i]);
        }

        return gameState;
    }

    function resolveMove(
        IERC3333.GameState memory _gameState,
        IERC3333.Move memory _move
    ) internal view returns (IERC3333.GameState memory) {
        // Verify if it's a valid move
        require(
            gameStateQueries.isMoveValid(_gameState, _move),
            'Move is invalid'
        );

        if (_move.action == IERC3333.Action.Resign) {
            // Resign
        }

        if (_gameState.currentChallenge.challenge == IERC3333.Challenge.None) {
            if (_move.action == IERC3333.Action.PlayCard) {
                return trucoResolver.resolve(_gameState, _move);
            }
        }

        if (
            envidoResolver.canResolve(_gameState.currentChallenge.challenge) ||
            gameStateQueries.isMoveAChallengeForEnvido(_move)
        ) {
            return envidoResolver.resolve(_gameState, _move);
        }

        if (
            trucoResolver.canResolve(_gameState.currentChallenge.challenge) ||
            gameStateQueries.isMoveAChallengeForTruco(_move)
        ) {
            return trucoResolver.resolve(_gameState, _move);
        }

        revert('Invalid move for given game state');
    }

    // [Owner] Transfer gained fees to an arbitrary address
    function transferFeesTo(address _recipient, uint256 _amount)
        public
        onlyOwner
    {
        trucoin.transfer(_recipient, _amount);
    }

    function isGameEnded(IERC3333.GameState memory gameState)
        external
        view
        returns (bool)
    {
        return gameStateQueries.isGameEnded(gameState);
    }
}
