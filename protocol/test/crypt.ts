import { expect } from "chai";
import { ethers } from "hardhat";

import { CardsStructs } from "../typechain-types/crypt/DeckCrypt";
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

  describe("Crypt-OTP", function () {
    it("Encrypt a Deck", async function () {
      const { sut } = await deployContract();

      const cards = [
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
        0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23,
        0x24, 0x25, 0x26, 0x27,
      ];

      let deck: DeckStruct = { cards: cards };
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
