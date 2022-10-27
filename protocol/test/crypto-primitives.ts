import { expect } from "chai";
const { ethers } = require("hardhat");

import { CardsStructs } from "../typechain-types/contracts/crypt/DeckCrypt";
import DeckStruct = CardsStructs.DeckStruct;

// Deck encrytion and decryption routing mirrors the one in the contract DeckCrypt.sol
export function encryptUsingOTP(
  deck: DeckStruct,
  key: Array<string>
): DeckStruct {
  expect(key.length).to.be.greaterThan(deck.cards.length);

  const encryptedDeck: DeckStruct = {
    cards: [],
  };

  for (let i = 0; i < deck.cards.length; i++) {
    let card = deck.cards[i];

    // Do XOR byte by byte
    let xored = parseInt(card.toString(), 10) ^ parseInt("0x" + key[i], 16);

    // Add padding zeroes to the left to make sure the length is 2
    xored = ("0" + xored.toString(16)).substr(-2);

    encryptedDeck.cards[i] = "0x" + xored;
  }
  return encryptedDeck;
}

// Generate secret key for OTP encryption using keccak256 mirroring the contract implementation
export function generateKeyUsingSecret(
  secret: string,
  length: number
): Array<string> {
  expect(length).to.be.greaterThan(0);

  let sequence: number = 0;
  let key: string = "";

  for (let i = 0; i < length / 32; i++) {
    // Generate keccak256 hash from secret + sequence.
    // IMPORTANT NOTE FOR COMPATIBILITY:
    // `sequence` must be converted to utf8 representation using it as index, not it's string representation directly.
    let hash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(secret + String.fromCharCode(sequence))
    );
    // remove "0x" prefix from the beginning of the hash since we want pure byte representation
    key += hash.slice(2);
    sequence++;
  }
  return key.match(/.{1,2}/g) || [];
}
