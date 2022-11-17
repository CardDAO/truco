// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

contract TrucoChampionsToken is Ownable {
    string public constant name = 'Truco Champions Token';
    string public constant symbol = 'TCT';

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    struct TrucoTrophy {
        uint256 tokenId;
        address trucoMatch;
        address winner;
        uint8 winnerScore;
        address loser;
        uint8 loserScore;
    }

    mapping(uint256 => TrucoTrophy) public trophies;
    mapping(address => TrucoTrophy[]) public trophiesByPlayerAddress;
    mapping(address => TrucoTrophy[]) public matchesByPlayerAddress;
    mapping(address => TrucoTrophy) public trophiesByMatchAddress;

    event TrucoTrophyMinted(
        uint256 indexed trophyId,
        address indexed trucoMatch
    );
    event TrucoTrophyWon(
        address indexed winner,
        address indexed loser,
        uint256 tokenId
    );

    modifier onlyMatch() {
        require(
            trophiesByMatchAddress[msg.sender].trucoMatch != address(0),
            'TrucoChampionsToken: Only the match contract can assign tokens'
        );
        _;
    }

    function mint(address _match) public onlyOwner returns (uint256 _tokenId) {
        require(
            trophiesByMatchAddress[_match].tokenId == 0,
            'TrucoChampionsToken: Trophy already minted'
        );

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        TrucoTrophy memory trophy = TrucoTrophy(
            tokenId,
            _match,
            address(0),
            0,
            address(0),
            0
        );
        trophies[tokenId] = trophy;
        trophiesByMatchAddress[_match] = trophy;

        emit TrucoTrophyMinted(tokenId, _match);
        return tokenId;
    }

    function assign(
        address _winner,
        uint8 _winnerScore,
        address _loser,
        uint8 _loserScore
    ) public onlyMatch {
        TrucoTrophy storage trophy = trophiesByMatchAddress[msg.sender];
        trophy.winner = _winner;
        trophy.winnerScore = _winnerScore;
        trophy.loser = _loser;
        trophy.loserScore = _loserScore;
        trophies[trophy.tokenId] = trophy;
        trophiesByPlayerAddress[_winner].push(trophy);
        matchesByPlayerAddress[_winner].push(trophy);
        matchesByPlayerAddress[_loser].push(trophy);
        emit TrucoTrophyWon(_winner, _loser, trophy.tokenId);
    }

    function trophiesOf(address _player)
        public
        view
        returns (TrucoTrophy[] memory)
    {
        return trophiesByPlayerAddress[_player];
    }

    function matchesOf(address _player)
        public
        view
        returns (TrucoTrophy[] memory)
    {
        return matchesByPlayerAddress[_player];
    }

    function getTrophyByMatch(address _match)
        public
        view
        returns (TrucoTrophy memory)
    {
        return trophiesByMatchAddress[_match];
    }

    function getTrophy(uint256 _tokenId)
        public
        view
        returns (TrucoTrophy memory)
    {
        return trophies[_tokenId];
    }

    function getWinner(uint256 _tokenId) public view returns (address) {
        return trophies[_tokenId].winner;
    }

    function getPlayers(uint256 _tokenId)
        public
        view
        returns (address, address)
    {
        return (trophies[_tokenId].winner, trophies[_tokenId].loser);
    }
}
