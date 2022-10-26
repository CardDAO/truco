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
    
    function executeTransaction(CardsStructs.Transaction memory transaction) public {
        gameState = this.transact(transaction);
    }
}
