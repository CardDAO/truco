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

        // 3 possible cases are handled:

        // 1) Check if action is a challenge  "rising" (i.e: Envido -> Real Envido! / Envido -> Falta Envido!) or challenge mismatch
        if (_move.action == CardsStructs.Action.Challenge) {
            // Preconditions:
            // - Previous challenge was accepted
            // - Player is not the challenger
            // - No points were previously spoken
            // - Haven't reach maximum challenges spelled
            require(
                _gameState.currentChallenge.response ==
                    CardsStructs.Response.Accept
            );
            require(
                _gameState.playerTurn != _gameState.currentChallenge.challenger
            );
            require(
                _gameState.envidoCountPerPlayer[_gameState.playerTurn] == 0 &&
                _gameState.envidoCountPerPlayer[reversePlayer(_gameState.playerTurn)] == 0
            );
            //require (no maximium reached);
            
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
        }

        // 3) Envido point spell:
        if (_move.action == CardsStructs.Action.EnvidoCount) {
            // Preconditions:
            // - Challenge should have been accepted by other party
            // - Check if i'm in place for spelling my points (i am "mano") or by contrary it's other players turn
            require (_gameState.currentChallenge.waitingChallengeResponse == false);

            require (_gameState.currentChallenge.response == CardsStructs.Response.Accept);

            if (_gameState.playerTurn == _gameState.currentChallenge.challenger) {
                // Current player challenged envido, so we must ensure other player already cast it's envido count_
                require (_gameState.envidoCountPerPlayer[reversePlayer(_gameState.playerTurn)] != 0);
                require (_gameState.envidoCountPerPlayer[_gameState.playerTurn] == 0);
            }
            
            //Do envido count
        }

        return _gameState;
    }

    function canResolve(
        CardsStructs.Challenge _challenge
    ) internal pure returns (bool) {
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
    
    function reversePlayer(uint8 _player) internal pure returns (uint8) {
        if (_player == 0) {
            return 1;
        }
        
        return _player;
    }
}
