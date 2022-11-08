// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

// Imports
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC3333.sol";
import "../TrucoMatch.sol";

contract TrucoMatchFactory is OwnableUpgradeable {
    // State variables
    TrucoMatch[] public matches;
    IERC3333 internal trucoEngine;
    IERC20 internal truCoin;
    uint256 public minBet;

    // Events
    event TrucoMatchCreated(address indexed match_address, address indexed player1, uint256 bet);

    // Initialize
    function initialize(IERC3333 _trucoEngine, IERC20 _truCoin, uint256 _minBet) public initializer {
        trucoEngine = _trucoEngine;
        truCoin = _truCoin;
        minBet = _minBet;
    }

    // New Match
    function newMatch(uint256 _bet) public returns (address) {
        require(_bet >= minBet, "Bet is too low");
        require(IERC20(truCoin).balanceOf(msg.sender) >= _bet, "Not enough tokens");
        require(IERC20(truCoin).allowance(msg.sender, address(this)) >= _bet, "Not enough allowance");

        // Create new match
        TrucoMatch deployedMatch = new TrucoMatch(trucoEngine, truCoin, _bet);
        address newMatchAddress = address(deployedMatch);
        matches.push(deployedMatch);

        // Transfer tokens to match
        IERC20(truCoin).transferFrom(msg.sender, newMatchAddress, _bet);

        emit TrucoMatchCreated(newMatchAddress, msg.sender, _bet);

        return newMatchAddress;
    }

    // Method for getting all matches
    function getMatches() public view returns (TrucoMatch[] memory) {
        return matches;
    }

    // Destroy match contract
    function destroyMatch(address _matchAddress) public onlyOwner {
        // Destroy match
    }
}
