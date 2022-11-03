// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./Structs.sol";

/**
 * @title ERC3333 interface for turn based card games
 * @dev see ERC-3333 proposal
 */
interface IERC3333 {
    function startGame() external returns (CardsStructs.GameState memory);

    function initialGameState()
        external
        pure
        returns (CardsStructs.GameState memory _gameState);

    function transact(CardsStructs.Transaction calldata transaction)
        external
        returns (CardsStructs.GameState memory gameState);

    function isGameEnded(CardsStructs.GameState memory gameState)
        external
        view
        returns (bool);
}
