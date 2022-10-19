// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../trucoV1/Structs.sol";

contract DeckCrypt  {

    CardsStructs.Deck deck;

    constructor () {
        createDeck();
    }
 
    function getCardAtId(uint8 id) public view returns (bytes1 card){
        card  =  deck.cards[id];
    }

    function getDeck() public view returns (CardsStructs.Deck memory) {
        return deck;
    }

    function encryptOrDecryptDeck(string memory _secret) public  {
        // Generate key using key derivation
        bytes1[CardsCount] memory key  = keyDerivation(_secret, CardsCount);

        for (uint8 i = 0; i < CardsCount; i++) {
            deck.cards[i] = encryptOrDecryptByte(deck.cards[i], key[i]);
        }
    }

    // Key derivation function: uses a secret and desired lenght and generates a key for each card
    function keyDerivation(string memory _secret, uint8 _lenght) internal pure returns (bytes1[CardsCount] memory key)
    {
        require (bytes(_secret).length > 0, "Secret can't be empty");

        uint8 sequence = 0;
        uint8 keyOffSet = 0;
        bytes32 generatedKey = generateKey(_secret, sequence);

        for (uint8 i = 0; i < _lenght; i++) {

            if (i > 0 && i % 32 == 0) {
                sequence++;
                keyOffSet= sequence * 32;
                generatedKey = generateKey(_secret, sequence);
            }

            // Offset keeps pointer relative to actual key byte
            // i.e: on sequence 1, position 32 will be index 0 of a new obtained secret 
            key[i] = generatedKey[i-keyOffSet];
        }

        return key;
    }

    function createDeck() internal {
        // pack  cards into bytes
        for (uint8 i = 0; i < CardsCount; i++) {
            deck.cards[i] = bytes1(i);
        }
    }

    function generateKey(string memory _secret, uint8 _sequence) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_secret, _sequence));
    }

    function encryptOrDecryptByte(bytes1 data, bytes1 secret) internal pure returns (bytes1) {
        return data | secret;
    }
}