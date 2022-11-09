// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '../Engine2Players.sol';

// Test infrastructure for Engine testing: workaround for hardhat tests handling non view return values
contract Engine2PlayersTester is Engine2Players {
    constructor(
        IERC20 _trucoin,
        IChallengeResolver _trucoResolver,
        IChallengeResolver _envidoResolver,
        EngineQueries _engineQueries
    )
        Engine2Players(
            _trucoin,
            _trucoResolver,
            _envidoResolver,
            _engineQueries
        )
    {}

    IERC3333.GameState public gameState;

    function setGameState(IERC3333.GameState calldata _gameState) external {
        gameState = _gameState;
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

    function executeTransaction(IERC3333.Transaction memory transaction)
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

    function isEnvidoFinal() public view returns (bool) {
        return envidoResolver.isFinal(gameState);
    }
}
