// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./interfaces/ICardsDeck.sol";

/*
Suit and cards deck representation for a 40 Castilian Suit Card Deck

see: https://en.wikipedia.org/wiki/Spanish-suited_playing_cards#Castilian_pattern

0 (Coins): 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
1 (Cups): 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
2 (Swords): 21, 22, 23, 24, 25, 26, 27, 28, 29, 30
3 (Clubs): 31, 32, 33, 34, 35, 36, 37, 38, 39, 40

Last three cards of each suit are 'Knave', 'Knight', 'King'.

ID 0 is reserved for masked cards

Example:
- Card ID 8 is Knave of Coins
- Card ID 19 is Knight of Cups
- Card ID 21 is Ace of Swords
*/
contract CastillianDeck is ICardsDeck {

    uint8 public constant maskedCardId = 0;

    uint8 public constant numberOfCards = 40;

    function suitName(uint8 _card) public view returns (string memory)
    {
        Card memory card = decodeCard(_card);

        if (card.suit == 0) {
            return "Coins";
        }

        if (card.suit == 1) {
         return "Cups";
        }

        if (card.suit == 2) {
        return "Swords";
        }

        if (card.suit == 3) {
        return "Clubs";
        }

        revert("Invalid suit");
    }

    function areSameSuit(uint8 _card1, uint8 _card2)
    public
    view
    returns (bool)
    {
        Card memory card1 = decodeCard(_card1);
        Card memory card2 = decodeCard(_card2);

        return card1.suit == card2.suit;
    }

    // Decode points of a given set of cards
    function decodeCard(uint8 _card)
    public
    view
    returns (Card memory)
    {
        require (_card != 0 || _card > 40 , "Invalid card");

        Card memory card;
        uint8 offset = 0;

        // Suit definition
        if (_card  <= 10) {
            card.suit = 0;
        }
        else if (_card <= 20) {
            card.suit = 1;
            offset = 10;
        }
        else if (_card <= 30) {
            card.suit = 2;
            offset = 20;
        }
        else if (_card <= 40) {
            card.suit = 3;
            offset = 30;
        }

        card.value = _card - offset;

        // Numeric card
        if (card.value <= 7 ) {
            return card;
        }

        // Figure
        card.value = card.value - 8 + 10;

        return card;
    }
}
