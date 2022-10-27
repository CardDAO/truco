// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./trucoV1/Engine.sol";
import "./trucoV1/Structs.sol";
import "./crypt/DeckCrypt.sol";

contract TrucoMatch  {

    struct Match {
        address[2] players; // player 0 is the creator of the match
        CardsStructs.Deck deck;
        CardsStructs.GameState gameState;
        uint256 tokensAtStake; 
    }

    Engine trucoEngine;
    DeckCrypt deckCrypt;
    IERC20 trueCoin;
    Match currentMatch;

    // Events
    event MatchCreated(address player, uint256 tokensAtStake);
    event MatchStarted(address[2] players, uint256 tokensAtStake);
    event DealStarted(address shuffler);
    event DealEnded();


    constructor (Engine _trucoEngine, DeckCrypt _deckCrypt, IERC20 _truecoin, uint256 _tokensAtStake) {
        trucoEngine = _trucoEngine;
        deckCrypt = _deckCrypt;
        trueCoin = _truecoin;

        //Transfer Trucoins from owner to contract
        trueCoin.transferFrom(msg.sender, address(this), _tokensAtStake);
        currentMatch.tokensAtStake = _tokensAtStake;

        currentMatch.players[0] = msg.sender;

        //Mint Sould Bound Token

        emit MatchCreated(msg.sender, _tokensAtStake);
    }
    
        
    // Method for joining the match 
    function join() public {
        require(currentMatch.players[1] == address(0), "Match is full");
        require(msg.sender != currentMatch.players[0], "You can't join your own match");
        require(trueCoin.balanceOf(msg.sender) >= currentMatch.tokensAtStake, "You don't have enough Trucoins to join this match");

        // Check invitations if any

        // Transfer Trucoins from player to contract
        trueCoin.transferFrom(msg.sender, address(this), currentMatch.tokensAtStake);
        currentMatch.tokensAtStake += currentMatch.tokensAtStake;

        currentMatch.players[1] = msg.sender;

        // Start match
        currentMatch.gameState = trucoEngine.startMatch();
        emit MatchStarted(currentMatch.players, currentMatch.tokensAtStake);
    }

    function newDeal(CardsStructs.Deck memory _deck) {
        // Check if current game state enables new card shufflings
        require(!currentMatch.gameState.isDealOpen, "Deal is already open");

        // Determine the new shuffler and check that corresponds to the current player
        uint8 new_shuffler = currentMatch.playerWhoShuffled ^ 1;
        require(msg.sender == currentMatch.players[new_shuffler], "You are not the shuffler");

        currentMatch.deck = _deck; // encrypted deck using 2 secrets

        // Assign cards for each player interleaving one for each other, i.e player1: 0,2,4 player2: 1,3,5
        for (uint8 i = 0; i < 3; i++) {
            currentMatch.gameState.playerCards[0][i] = i*2;
            currentMatch.gameState.playerCards[1][i] = i*2 + 1;
        }
        
        // Assign new shuffler
        currentMatch.playerWhoShuffled = new_shuffler;

        // Assign turn to player not shuffling
        currentMatch.gameState.playerTurn = currentMatch.playerWhoShuffled ^ 1;

        // Unset current challenge from previous deal
        currentMatch.gameState.currentChallenge.challenge = CardsStructs.Challenge.None;

        // Clean revealed cards
        currentMatch.gameState.revealedCardsByPlayer[0] = new uint8[3](0);
        currentMatch.gameState.revealedCardsByPlayer[1] = new uint8[3](0);

        // Clean envido count
        currentMatch.gameState.envidoCountPerPlayer[0] = 0;
        currentMatch.gameState.envidoCountPerPlayer[1] = 0;

        // Set deal as open
        currentMatch.gameState.isDealOpen = true;

        emit DealStarted(msg.sender, currentMatch.tokensAtStake);
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