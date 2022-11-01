// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./Structs.sol";

interface IChallengeResolver {
    function resolve(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) external view returns (CardsStructs.GameState memory);

    function canResolve(CardsStructs.Challenge _challenge)
        external
        view
        returns (bool);

    function isFinal(CardsStructs.GameState memory _gameState)
        external
        view
        returns (bool);

    function getWinner(CardsStructs.GameState memory _gameState)
        external
        view
        returns (uint8);
}
