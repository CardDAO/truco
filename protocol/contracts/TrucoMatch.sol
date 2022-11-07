// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./trucoV1/interfaces/IERC3333.sol";

contract TrucoMatch  {

    struct player {
        address playerAddress;
        uint256 tokensAtStake;
    }

    struct Match {
        player[2] players; // player 0 is the creator of the match
        IERC3333.GameState gameState;
        uint256 tokensAtStake;

    }

    IERC3333 trucoEngine;
    IERC20 truCoin;
    Match currentMatch;
    bool isDealOpen;

    // Events
    event MatchCreated(address match_address);
    event MatchStarted(address player1, address player2, uint256 tokensAtStake);
    event PlayerStaked(address player, uint256 tokensAtStake);
    event DealStarted(address shuffler);
    event DealEnded();


    constructor (IERC3333 _trucoEngine, IERC20 _truCoin, uint256 _tokensAtStake) {

        trucoEngine = _trucoEngine;
        truCoin = _truCoin;
        currentMatch.tokensAtStake = _tokensAtStake;
        currentMatch.players[0].playerAddress = msg.sender;

        //Mint Sould Bound Token

        emit MatchCreated(address(this));
    }

    // Method for second player joining the match
    function join() public {
        require(currentMatch.players[0].playerAddress != msg.sender, "Match creator is already joined");
        require(currentMatch.players[1].playerAddress == address(0), "Match is full");

        // Check invitations if any

        currentMatch.players[1].playerAddress = msg.sender;

        // Make the user stake so he can not kidnap the match
        stake(1);
    }

    // Method for staking & starting the match
    function stake(uint8 _player) public {
        require(
            currentMatch.players[_player].playerAddress == msg.sender,
            "Player is not joined");
        require(
            truCoin.balanceOf(msg.sender) >= currentMatch.tokensAtStake,
            "You don't have enough Trucoins to stake this match");
        require(
            truCoin.allowance(msg.sender, address(this)) >= currentMatch.tokensAtStake,
            "Not enough trucoins transfer approved");
        require(
            currentMatch.players[_player].tokensAtStake == 0,
            "You already staked this match");

        // Transfer Trucoins from player to contract
        require(truCoin.transferFrom(
            msg.sender, address(this), currentMatch.tokensAtStake),
            "Trucoin transfer failed");

        currentMatch.players[_player].tokensAtStake = currentMatch.tokensAtStake;

        // emit event
        emit PlayerStaked(msg.sender, currentMatch.tokensAtStake);

        // Start match
        if (currentMatch.players[0].tokensAtStake == currentMatch.tokensAtStake &&
            currentMatch.players[1].tokensAtStake == currentMatch.tokensAtStake) {
            currentMatch.gameState = trucoEngine.startGame();
            emit MatchStarted(
                currentMatch.players[0].playerAddress,
                currentMatch.players[1].playerAddress,
                currentMatch.tokensAtStake);
        }
    }

    function newDeal() public {
        // Check if current game state enables new card shufflings
        require(!isDealOpen, "Deal is already open");

        // Determine the new shuffler and check that corresponds to the current player
        uint8 new_shuffler = currentMatch.gameState.playerWhoShuffled ^ 1;
        require(msg.sender == currentMatch.players[new_shuffler].playerAddress, "You are not the shuffler");

        // Grab the current points
        uint8[] memory current_points = currentMatch.gameState.teamPoints;

        // Reset the game state
        currentMatch.gameState = trucoEngine.initialGameState();

        // Set the current points
        currentMatch.gameState.teamPoints = current_points;

        // Assign new shuffler
        currentMatch.gameState.playerWhoShuffled = new_shuffler;

        // Assign turn to player not shuffling
        currentMatch.gameState.playerTurn = new_shuffler ^ 1;

        // Set deal as open
        isDealOpen = true;

        emit DealStarted(msg.sender);
    }

    // Get players addresses
    function getPlayers() public view returns (address[2] memory) {
        return [currentMatch.players[0].playerAddress, currentMatch.players[1].playerAddress];
    }
}
