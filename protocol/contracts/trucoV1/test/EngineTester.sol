// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../Engine.sol";

// Test infrastructure for Engine testing: workaround for hardhat tests handling non view return values
contract EngineTester is Engine {
    constructor(
        IERC20 _trucoin,
        IChallengeResolver _trucoResolver,
        IChallengeResolver _envidoResolver,
        EngineQueries _engineQueries
    ) Engine(_trucoin, _trucoResolver, _envidoResolver, _engineQueries) {}

    CardsStructs.GameState public gameState;

    function setGameState(CardsStructs.GameState calldata _gameState) external {
        gameState = _gameState;
    }

    // This functions are an aide for testing since hardhat return structure for these properties are not present
    // on gameState getter result (don't know why)
    function getEnvidoPoints() public view returns (uint8[] memory) {
        return gameState.envidoCountPerPlayer;
    }

    function getTeamPoints() public view returns (uint8[] memory) {
        return gameState.teamPoints;
    }

    function getRevealedCardsByPlayer()
        public
        view
        returns (uint8[3][] memory)
    {
        return gameState.revealedCardsByPlayer;
    }

    function executeTransaction(CardsStructs.Transaction memory transaction)
        public
    {
        gameState = this.transact(transaction);
    }

    function getEnvidoWinner() public view returns (uint8) {
        return envidoResolver.getWinner(gameState);
    }

    function getTrucoWinner() public view returns (uint8) {
        return trucoResolver.getWinner(gameState);
    }

    function isTrucoFinal() public view returns (bool) {
        return trucoResolver.isFinal(gameState);
    }
}
