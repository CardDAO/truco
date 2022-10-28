// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../Engine.sol";
import "../Structs.sol";

// Test infrastructure for Engine testing: workaround for hardhat tests handling non view return values
contract EngineTester is Engine {
    constructor(IERC20 _trucoin) Engine(_trucoin) {}

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
        return EnvidoResolver.getWinner(gameState);
    }

    function getTrucoWinner() public view returns (uint8) {
        return TrucoResolver.getWinner(gameState);
    }
}
