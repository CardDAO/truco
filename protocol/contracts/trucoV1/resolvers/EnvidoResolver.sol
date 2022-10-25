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

        // 1) Check if action is a challenge "rising" (i.e: Envido -> Real Envido! / Envido -> Falta Envido!)
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
                _gameState.envidoCountPerPlayer[0] == 0 &&
                    _gameState.envidoCountPerPlayer[1] == 0
            );
            //require (no maximium reached);
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
}
