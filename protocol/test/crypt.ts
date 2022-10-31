import { expect } from "chai";
import { ethers } from "hardhat";

import { CardsStructs } from "../typechain-types/contracts/crypt/DeckCrypt";
import DeckStruct = CardsStructs.DeckStruct;

import { encryptUsingOTP, generateKeyUsingSecret } from "./crypto-primitives";

describe("OTP-Crypt", function () {
  async function deployContract() {
    // Contracts are deployed using the first signer/account by default
    const [owner] = await ethers.getSigners();

    const DeckCrypt = await ethers.getContractFactory("DeckCrypt");
    const sut = await DeckCrypt.deploy();
    return { sut, owner };
  }
  
   function getDeck(): array<string> {
    return [
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
      0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
      0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23,
      0x24, 0x25, 0x26, 0x27, 0x28,
    ];
  }

  function isDeckValid(cards: string[]): boolean {
    
    for (let i = 0; i < cards.length; i++) {
       let number = parseInt(cards[i], 16)
       if (number < 1 || number > 40) {
         return false;
       }
    } 
    return true
  }
  
  describe("Crypt-OTP", function () {
    it("Possible valid decks with one key", async function () {
      
      let deck: DeckStruct = {cards: getDeck()};
      
      // Iterate over all possible encrytion bytes keys
      for  (let i = 0; i < 256; i++) {

        let validDecks = 0;
        let invalidDecks = 0;

        let encryptKeyByte = ("0" + i.toString(16)).substr(-2)

        // Repeat the key for the length of the deck + 1 for OTP
        let encryptionKey = encryptKeyByte.repeat(41);

        let encryptedDeck  = encryptUsingOTP(
            deck,
            encryptionKey.match(/.{1,2}/g) || [] // Split the key into 2 byte chunks
        );

        // Check how many valid decks result from iterating all possible decryption keys
        for  (let j = 0; j < 256; j++) {

          let decryptKeyByte = ("0" + j.toString(16)).substr(-2)

          // Repeat the key for the length of the deck + 1 for OTP
          let decryptionKey = decryptKeyByte.repeat(41);

          let decryptedDeck = encryptUsingOTP(
              encryptedDeck,
              decryptionKey.match(/.{1,2}/g) || [] // Split the key into 2 byte chunks
          );
          
          if (isDeckValid(decryptedDeck.cards)) {
            validDecks++
          } else {
            invalidDecks++
          }

        }
        
        console.log("key: " + encryptKeyByte, "valid decks: " + validDecks, " invalid decks: " + invalidDecks);
      }
      
    })      
      
    it("Encrypt a Deck", async function () {
      const { sut } = await deployContract();


      let deck: DeckStruct = { cards: getDeck() };
      const secret = "truco and blockchain are awesome";

      const encryptedDeckUsingContract = await sut.encryptOrDecryptDeck(
        deck,
        secret
      );

      let expectedDeck = encryptUsingOTP(
        deck,
        generateKeyUsingSecret(secret, deck.cards.length)
      );

      // Assert both encrypted deck cards match
      encryptedDeckUsingContract.cards.forEach((card, index) => {
        expect(card).to.equal(expectedDeck.cards[index]);
      });
    });
  });
});
