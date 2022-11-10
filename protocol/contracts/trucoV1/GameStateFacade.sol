// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './trucoV1/GameStateQueries.sol';
import './trucoV1/interfaces/IERC3333.sol';

contract GameStateFacade {
    IERC3333.GameState gameState;
    GameStateQueries gameStateQueries;

}
