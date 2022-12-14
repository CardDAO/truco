// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface ICardsDeck {
    struct Card {
        uint8 value;
        uint8 suit;
    }

    function suitName(uint8 _card) external view returns (string memory);

    function maskedCardId() external view returns (uint8);

    function numberOfCards() external view returns (uint8);

    function areSameSuit(uint8 _card1, uint8 _card2)
        external
        pure
        returns (bool);

    function decodeCard(uint8 _card) external pure returns (Card memory);
}
