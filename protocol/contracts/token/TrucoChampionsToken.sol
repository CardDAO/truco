// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TrucoChampionsToken is Ownable {
    string public constant name = "Truco Champions Token";
    string public constant symbol = "TCT";

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

    mapping (uint256 => TrucoTrophy) public trophies;
    mapping (address => uint256[]) public trophiesByPlayerAddress;
    mapping (address => uint256[]) public matchesByPlayerAddress;
    mapping (address => uint256) public trophiesByMatchAddress;

    event TrucoTrophyWon(address indexed winner, address indexed loser, uint256 tokenId);

    constructor(address _owner) {
        // Set the owner to the Truco Match Factory contract
        transferOwnership(_owner);
    }

    modifier onlyMatch(TrucoTrophy memory _trophy) {
        require(msg.sender == _trophy.trucoMatch, "Only the match can assign a trophy");
        require(trophiesByMatchAddress[msg.sender] != 0, "Trophy not minted");
        _;
    }

    function mint(address _match) public onlyOwner returns (TrucoTrophy memory) {
        require(trophiesByMatchAddress[_match] == 0, "Trophy already minted");
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        TrucoTrophy memory trophy = TrucoTrophy(tokenId, _match, address(0), 0, address(0), 0);
        trophies[tokenId] = trophy;
        return trophy;
    }

    function assign(address winner, uint8 winnerScore, address loser, uint8 loserScore, TrucoTrophy memory _trophy) public onlyMatch(_trophy) {
        _trophy.winner = winner;
        _trophy.winnerScore = winnerScore;
        _trophy.loser = loser;
        _trophy.loserScore = loserScore;
        trophies[_trophy.tokenId] = _trophy;
        trophiesByPlayerAddress[winner].push(_trophy.tokenId);
        matchesByPlayerAddress[winner].push(_trophy.tokenId);
        matchesByPlayerAddress[loser].push(_trophy.tokenId);
        emit TrucoTrophyWon(winner, loser, _trophy.tokenId);
    }
}
