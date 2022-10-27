// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../Structs.sol";

/**
 * TrucoResolver:
 * Solidity can't apply interfaces on libraries, but all resolvers should follow the following interface:
 *
 *    function resolve(
 *       CardsStructs.GameState memory _gameState,
 *        CardsStructs.Move memory _move
 *    ) internal returns (CardsStructs.GameState memory);
 *
 *    function canResolve(
 *        CardsStructs.Challenge _challenge
 *    ) internal pure returns (bool);
 *
 *    function isFinal(CardsStructs.GameState memory _gameState) internal pure returns (bool)
 *
 *    function getWinner(CardsStructs.GameState memory _gameState) internal pure returns (uint8)
 *
 * Attention: Only internal functions should be used in this library
 */
library TrucoResolver {
    function resolve(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) internal returns (CardsStructs.GameState memory) {
        // Valid moves up to this point are enforced before any logic
        require(
            _move.action == CardsStructs.Action.Challenge ||
                _move.action == CardsStructs.Action.Response ||
                _move.action == CardsStructs.Action.PlayCard
        );

        // When current challenge is at a refusal state, no new moves can be processed
        if (
            _gameState.currentChallenge.challenge !=
            CardsStructs.Challenge.None &&
            _gameState.currentChallenge.response == CardsStructs.Response.Refuse
        ) {
            revert(
                "No new moves can be processed while current challenge is at refusal state"
            );
        }

        // Check whether the game is at a final state and should not accept any new moves
        if (isFinal(_gameState)) {
            revert("Game is in final state");
        }

        // ---------------------------------------------------------------------------------------------------------
        // Main Logic:
        // 3 possible cases are handled:

        // 2) Check if action is an envido acceptance or refusal
        if (_move.action == CardsStructs.Action.Response) {
            // Preconditions:
            // - Challenge should have no response
            // - Can't be the challenger
            // - Should be a valid response
            require(
                _gameState.currentChallenge.response ==
                    CardsStructs.Response.None
            );

            CardsStructs.Response response = CardsStructs.Response(
                _move.parameters[0]
            );

            require(
                response == CardsStructs.Response.Accept ||
                    response == CardsStructs.Response.Refuse
            );

            require(
                _gameState.playerTurn != _gameState.currentChallenge.challenger
            );

            _gameState.currentChallenge.waitingChallengeResponse = false;
            _gameState.currentChallenge.response = response;

            // If response is a refusal, game ends
            if (response == CardsStructs.Response.Refuse) {
                return _gameState;
            }

            // If it's an acceptance, points are overriden with the challenge points
            _gameState.currentChallenge.pointsAtStake = pointsPerChallenge(
                _gameState.currentChallenge.challenge,
                _gameState
            );

            return _gameState;
        }

        // If we reach this point, it means that the move is not valid
        revert("Invalid Move");
    }

    function canResolve(CardsStructs.Challenge _challenge)
        internal
        pure
        returns (bool)
    {
        if (
            _challenge == CardsStructs.Challenge.None ||
            _challenge == CardsStructs.Challenge.Truco ||
            _challenge == CardsStructs.Challenge.ReTruco ||
            _challenge == CardsStructs.Challenge.ValeCuatro
        ) {
            return true;
        }

        return false;
    }

    function isFinal(CardsStructs.GameState memory _gameState)
        internal
        pure
        returns (bool)
    {
        // TODO: Implement this
        return false;
    }

    function getWinner(CardsStructs.GameState memory _gameState)
        internal
        pure
        returns (uint8)
    {
        // TODO: Implement this
        return _gameState.playerTurn;
    }

    // Return points that should be at stake for a given challenge
    function pointsPerChallenge(
        CardsStructs.Challenge challenge,
        CardsStructs.GameState memory _gameState
    ) internal pure returns (uint8) {
        if (challenge == CardsStructs.Challenge.Truco) {
            return 2;
        }

        if (challenge == CardsStructs.Challenge.ReTruco) {
            return 3;
        }

        if (challenge == CardsStructs.Challenge.ValeCuatro) {
            return 4;
        }

        revert("Invalid challenge");
    }
}
