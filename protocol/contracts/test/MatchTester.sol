// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '../TrucoMatch.sol';

// Test infrastructure for Match testing
contract TrucoMatchTester is TrucoMatch {
    constructor(
        IERC3333 _trucoEngine,
        IERC20 _truCoin,
        TrucoChampionsToken _TCT,
        GameStateQueries _gameStateQueries,
        address _player1,
        uint256 _tokensAtStake
    )
        TrucoMatch(
            _trucoEngine,
            _truCoin,
            _TCT,
            _gameStateQueries,
            _player1,
            _tokensAtStake
        )
    {}

    function playCard(uint8 _card, bytes memory _signature) public override {
        if (_signature.length > 0) {
            super.playCard(_card, _signature);
            return;
        }

        _playCard(_card);
    }

    function revealCards(uint8[] memory _cards, bytes memory _signature)
        public
        override
    {
        if (_signature.length > 0) {
            super.revealCards(_cards, _signature);
            return;
        }

        _revealCards(_cards);
    }

    function getEnvidoCountPerPlayer() public view returns (uint8[] memory) {
        return currentMatch.gameState.envido.playerCount;
    }

    function getRevealedCards() public view returns (uint8[3][] memory) {
        return currentMatch.gameState.revealedCardsByPlayer;
    }

    function currentPlayerIdx() public view returns (uint8) {
        return _getPlayerIdx();
    }

    function setPlayerTurn(uint8 _playerTurnIdx) public {
        currentMatch.gameState.playerTurn = _playerTurnIdx;
    }

    function setTeamPoints(uint8 _playerIdx, uint8 _points) public {
        currentMatch.gameState.teamPoints[_playerIdx] = _points;
    }

    function setTrucoChampionsTokenContractAddress(TrucoChampionsToken _TCT)
        public
    {
        TCT = _TCT;
    }

    function getCardsString(address _playerAddress, uint8[] memory _cards)
        public
        view
        returns (bytes memory)
    {
        return _getCardsString(_playerAddress, _cards);
    }
}
