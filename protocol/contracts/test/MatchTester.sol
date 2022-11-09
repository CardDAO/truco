// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '../TrucoMatch.sol';

// Test infrastructure for Match testing
contract TrucoMatchTester is TrucoMatch {
    constructor(
        IERC3333 _trucoEngine,
        IERC20 _truCoin,
        GameStateQueries _gameStateQueries,
        uint256 _tokensAtStake
    ) TrucoMatch(_trucoEngine, _truCoin, _gameStateQueries, _tokensAtStake) {}

    function getEnvidoCountPerPlayer() public view returns (uint8[] memory) {
        return currentMatch.gameState.envido.playerCount;
    }

    function currentPlayerIdx() public view returns (uint8) {
        return getPlayerIdx();
    }
}
