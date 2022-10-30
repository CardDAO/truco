// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./trucoV1/Engine.sol";
import "./trucoV1/Structs.sol";
import "./crypt/DeckCrypt.sol";

contract TrucoMatch  {

    struct player {
        address playerAddress;
        uint256 tokensAtStake;
    }
    
    struct Match {
        player[2] players; // player 0 is the creator of the match
        CardsStructs.Deck deck;
        CardsStructs.GameState gameState;
        uint256 tokensAtStake; 

    }

    Engine trucoEngine;
    DeckCrypt deckCrypt;
    IERC20 truCoin;
    Match currentMatch;

    // Events
    event MatchCreated(address match_address);
    event MatchStarted(address player1, address player2, uint256 tokensAtStake);
    event PlayerStaked(address player, uint256 tokensAtStake);
    event DealStarted(address shuffler);
    event DealEnded();


    constructor (Engine _trucoEngine, DeckCrypt _deckCrypt, IERC20 _truCoin, uint256 _tokensAtStake) {
        trucoEngine = _trucoEngine;
        deckCrypt = _deckCrypt;
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
        require(truCoin.balanceOf(msg.sender) >= currentMatch.tokensAtStake, "You don't have enough Trucoins to join this match");
        require(truCoin.allowance(msg.sender, address(this)) >= currentMatch.tokensAtStake, "Not enough trucoins transfer approved");

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

    function newDeal(CardsStructs.Deck memory _deck) public {
        // Check if current game state enables new card shufflings
        require(!currentMatch.gameState.isDealOpen, "Deal is already open");

        // Determine the new shuffler and check that corresponds to the current player
        uint8 new_shuffler = currentMatch.gameState.playerWhoShuffled ^ 1;
        require(msg.sender == currentMatch.players[new_shuffler].playerAddress, "You are not the shuffler");

        currentMatch.deck = _deck; // encrypted deck using 2 secrets
        
        // Assign new shuffler
        currentMatch.gameState.playerWhoShuffled = new_shuffler;

        // Assign turn to player not shuffling
        currentMatch.gameState.playerTurn = currentMatch.gameState.playerWhoShuffled ^ 1;

        // Unset current challenge from previous deal
        currentMatch.gameState.currentChallenge.challenge = CardsStructs.Challenge.None;

        // Clean revealed cards
        currentMatch.gameState.revealedCardsByPlayer[0] = [0,0,0];
        currentMatch.gameState.revealedCardsByPlayer[1] = [0,0,0];

        // Clean envido count
        currentMatch.gameState.envidoCountPerPlayer[0] = 0;
        currentMatch.gameState.envidoCountPerPlayer[1] = 0;

        // Set deal as open
        currentMatch.gameState.isDealOpen = true;

        emit DealStarted(msg.sender);
    }

    // Get players addresses
    function getPlayers() public view returns (address[2] memory) {
        return [currentMatch.players[0].playerAddress, currentMatch.players[1].playerAddress];
    }

    // [Test Functions] --------------------------------------------------------------
    
    // Deck getter 
    function decryptDeck(string memory _secret) public {
        currentMatch.deck = deckCrypt.encryptOrDecryptDeck(currentMatch.deck, _secret);
    }

    // [Test] Deck getter 
    function getDeck() public view returns (CardsStructs.Deck memory) {
        return currentMatch.deck;
    }

    // [Test] Card getter
    function getCardAtId(uint8 id) public view returns (bytes1 card){
        card  =  currentMatch.deck.cards[id];
    }

    // [Test] Creates an unencrypted deck using all ordered cards 
    function createDeck() public {

        bytes1[CardsCount] memory cards = currentMatch.deck.cards; 

        // pack  cards into bytes
        for (uint8 i = 0; i < CardsCount; i++) {
            cards[i] =  bytes1(i);
        }

        currentMatch.deck.cards = cards;
    }
}