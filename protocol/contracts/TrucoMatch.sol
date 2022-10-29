// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./trucoV1/interfaces/Structs.sol";
import "./trucoV1/interfaces/IERC3333.sol";

import "./crypt/DeckCrypt.sol";

contract TrucoMatch  {

    struct Match {
        address[2] players; // player 0 is the creator of the match
        CardsStructs.Deck deck;
        CardsStructs.GameState gameState;
        uint256 tokensAtStake; 
    }

    IERC3333 trucoEngine;
    DeckCrypt deckCrypt;
    IERC20 trucoin;
    Match currentMatch;

    constructor (IERC3333 _trucoEngine, DeckCrypt _deckCrypt, IERC20 _trucoin) {
        trucoEngine = _trucoEngine;
        deckCrypt = _deckCrypt;
        currentMatch.players[0] = msg.sender;

        //Transfer Trucoins from owner to contract
        //Mint Sould Bound Token 
    }
    
        
    // Method for joining the match 
    function join() public {
        // Check match state
        // Check invitations if any
        // Transfer tokens
        // Close game for new joins
        // Emit an event
    }

    function newDeal(CardsStructs.Deck memory _deck) public {
        // Check if current game state enables new card shufflings
        // Check for player authorization to shuffle
        currentMatch.deck = _deck; // encrypted deck using 2 secrets
        // Assign cards for each player interleaving one for each other, i.e player1: 0,2,4 player2: 1,3,5
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
    
    // View example to exemplify how an interface that serves the frontend 
    // but exposes zero knowledge of internal structs
    function canISpellTruco() external view returns (bool) {
        
        CardsStructs.Move memory move;
        move.action = CardsStructs.Action.Challenge;
        move.parameters = new uint8[](1);
        move.parameters[0] = uint8(CardsStructs.Challenge.Truco);
        
        CardsStructs.Transaction memory transaction;
        transaction.playerIdx = 1;
        transaction.state = currentMatch.gameState;
        transaction.moves = new CardsStructs.Move[](1);
        transaction.moves[0] = move;
        
        try trucoEngine.transact(transaction) returns (CardsStructs.GameState memory _gameState) {
            // discard result
        }
        catch {
            return false;
        }
        
        return true;
    }
    
}