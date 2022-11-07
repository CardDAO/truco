// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./IERC3333.sol";

interface IChallengeResolver {
    function resolve(
        IERC3333.GameState memory _gameState,
        IERC3333.Move memory _move
    ) external view returns (IERC3333.GameState memory);

    function canResolve(IERC3333.Challenge _challenge)
        external
        view
        returns (bool);

    function isFinal(IERC3333.GameState memory _gameState)
        external
        view
        returns (bool);

    function getWinner(IERC3333.GameState memory _gameState)
        external
        view
        returns (uint8);
}
