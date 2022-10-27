// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../Structs.sol";

/**
 * EnvidoResolver:
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
library EnvidoResolver {
    function resolve(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) internal returns (CardsStructs.GameState memory) {
        // Valid moves up to this point are enforced before any logic
        require(
            _move.action == CardsStructs.Action.Challenge ||
                _move.action == CardsStructs.Action.Response ||
                _move.action == CardsStructs.Action.EnvidoCount
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

        // 1) Check if action is a challenge  "rising" (i.e: Envido -> Real Envido! / Envido -> Falta Envido!) or challenge mismatch
        if (_move.action == CardsStructs.Action.Challenge) {
            // Preconditions:
            // - Previous challenge was accepted
            // - Player is not the challenger
            // - No points were previously spoken
            // - Haven't reach maximum challenges spelled
            require(
                _gameState.currentChallenge.waitingChallengeResponse == false
            );

            // Check challenger only if it comes from a non non challenge
            if (
                _gameState.currentChallenge.challenge !=
                CardsStructs.Challenge.None
            ) {
                require(
                    _gameState.playerTurn !=
                        _gameState.currentChallenge.challenger
                );
            }
            require(
                _gameState.envidoCountPerPlayer[_gameState.playerTurn] == 0 &&
                    _gameState.envidoCountPerPlayer[
                        reversePlayer(_gameState.playerTurn)
                    ] ==
                    0
            );

            require(
                _gameState.currentChallenge.challenge !=
                    CardsStructs.Challenge.FaltaEnvido,
                "FaltaEnvido can't be rised"
            );

            CardsStructs.Challenge newChallenge = CardsStructs.Challenge(
                _move.parameters[0]
            );

            require(
                newChallenge > _gameState.currentChallenge.challenge,
                "Can't rise a challenge with a lower value"
            );

            _gameState.currentChallenge.challenge = newChallenge;
            _gameState.currentChallenge.response = CardsStructs.Response.None;
            _gameState.currentChallenge.waitingChallengeResponse = true;
            _gameState.currentChallenge.challenger = _gameState.playerTurn;

            return _gameState;
        }

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
            
            _gameState.currentChallenge.response = response;
            _gameState.currentChallenge.waitingChallengeResponse = false;
            
            // If response is a refusal, the challenge is over 
            if (response == CardsStructs.Response.Refuse) {
                return _gameState;
            }
            
            // At this point we assume response is an acceptance 


            // If current points at stake is equal to 1, it means that no previous challenge was accepted. In this case
            // we should override the points at stake with the new challenge points
            // Also, when playing "FaltaEnvido" points at stake are equal to challenge derived points. All other points should
            // be overridden
            if (
                _gameState.currentChallenge.pointsAtStake == 1 ||
                _gameState.currentChallenge.challenge == CardsStructs.Challenge.FaltaEnvido 
            
            ) {
                _gameState.currentChallenge.pointsAtStake = pointsPerChallenge(
                    _gameState.currentChallenge.challenge,
                    _gameState
                );
                
                return _gameState;
            } 
            
            // Previous challenge was accepted, so we should add the new challenge points to the current points at stake
            _gameState.currentChallenge.pointsAtStake += pointsPerChallenge(
                    _gameState.currentChallenge.challenge,
                    _gameState
            );
            
            return _gameState;
        }

        // 3) Envido point spell:
        if (_move.action == CardsStructs.Action.EnvidoCount) {
            // Preconditions:
            // - Challenge should have been accepted by other party
            // - Check if i'm in place for spelling my points (i am "mano") or by contrary it's other players turn
            require(
                _gameState.currentChallenge.waitingChallengeResponse == false
            );

            require(
                _gameState.currentChallenge.response ==
                    CardsStructs.Response.Accept
            );

            if (
                _gameState.playerTurn == _gameState.currentChallenge.challenger
            ) {
                // Current player challenged envido, so we must ensure other player already cast it's envido count
                require(
                    _gameState.envidoCountPerPlayer[
                        reversePlayer(_gameState.playerTurn)
                    ] != 0
                );
                require(
                    _gameState.envidoCountPerPlayer[_gameState.playerTurn] == 0
                );
            }

            // Check envido count is valid
            require(
                _move.parameters[0] > 0 && _move.parameters[0] <= 33,
                "Invalid envido count"
            );

            //Do envido count
            uint8 envidoCount = _move.parameters[0];
            _gameState.envidoCountPerPlayer[
                _gameState.playerTurn
            ] = envidoCount;
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
            _challenge == CardsStructs.Challenge.Envido ||
            _challenge == CardsStructs.Challenge.RealEnvido ||
            _challenge == CardsStructs.Challenge.EnvidoEnvido ||
            _challenge == CardsStructs.Challenge.FaltaEnvido
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
        // Check if it's waiting for a response
        if (_gameState.currentChallenge.waitingChallengeResponse == true) {
            return false;
        }

        // Check challenge for refusal
        if (
            _gameState.currentChallenge.response == CardsStructs.Response.Refuse
        ) {
            return true;
        }

        // At this point we can assume challenge was accepted

        // Check if any of the players remain to spell their envido count
        if (
            _gameState.envidoCountPerPlayer[_gameState.playerTurn] == 0 ||
            _gameState.envidoCountPerPlayer[
                reversePlayer(_gameState.playerTurn)
            ] ==
            0
        ) {
            return false;
        }

        // All other cases are final
        return true;
    }

    function getWinner(CardsStructs.GameState memory _gameState)
        internal
        pure
        returns (uint8)
    {
        require(isFinal(_gameState));

        // If challenge was refused, the challenger won
        if (
            _gameState.currentChallenge.response == CardsStructs.Response.Refuse
        ) {
            return _gameState.currentChallenge.challenger;
        }

        // At this point we can assume challenge was accepted

        // If the same points for envido were spoken by all players, "mano" won (the opponent of the deck shuffler)
        if (
            _gameState.envidoCountPerPlayer[_gameState.playerTurn] ==
            _gameState.envidoCountPerPlayer[
                reversePlayer(_gameState.playerTurn)
            ]
        ) {
            return reversePlayer(_gameState.playerWhoShuffled);
        }

        // Last but not least: the player with the highest envido count wins
        if (
            _gameState.envidoCountPerPlayer[_gameState.playerTurn] >
            _gameState.envidoCountPerPlayer[
                reversePlayer(_gameState.playerTurn)
            ]
        ) {
            return _gameState.playerTurn;
        }

        return reversePlayer(_gameState.playerTurn);
    }

    function reversePlayer(uint8 _player) internal pure returns (uint8) {
        if (_player == 0) {
            return 1;
        }

        return 0;
    }

    // Return points that should be at stake for a given challenge
    function pointsPerChallenge(
        CardsStructs.Challenge challenge,
        CardsStructs.GameState memory _gameState
    ) internal pure returns (uint8) {
        if (
            challenge == CardsStructs.Challenge.Envido ||
            challenge == CardsStructs.Challenge.EnvidoEnvido
        ) {
            return 2;
        }

        if (challenge == CardsStructs.Challenge.RealEnvido) {
            return 3;
        }

        if (challenge == CardsStructs.Challenge.FaltaEnvido) {
            
            if (_gameState.teamPoints[0] >= _gameState.teamPoints[1]) {
                return _gameState.pointsToWin - _gameState.teamPoints[0];
            }

            return _gameState.pointsToWin - _gameState.teamPoints[1];
        }

        revert("Invalid challenge");
    }
}
