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
* Attention: Only internal functions should be used in this library
*/
library TrucoResolver {
    function resolve(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) internal returns (CardsStructs.GameState memory) {
        // Valid moves up to this point are enforced before any logic

        if (_move.action == CardsStructs.Action.Challenge) {
            _gameState.currentChallenge.waitingChallengeResponse = true;
            _gameState.currentChallenge.challenge = CardsStructs.Challenge(
                _move.parameters[0]
            );
        }

        return _gameState;
    }

    function canResolve(
        CardsStructs.Challenge _challenge
    ) internal pure returns (bool) {
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
}
