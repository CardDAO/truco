import { expect } from "chai";
import { ethers } from "hardhat";

import {BigNumber} from "ethers";

describe("Engine Queries", function () {

  async function deployContract() {
    const TrucoResolver = await ethers.getContractFactory("TrucoResolver");
    const trucoResolver = await TrucoResolver.deploy();

    const EnvidoResolver = await ethers.getContractFactory("EnvidoResolver");
    const envidoResolver = await EnvidoResolver.deploy();

    const CardsDeck = await ethers.getContractFactory("CastillianDeck");
    const cardsDeck = await CardsDeck.deploy();

    const EngineQueries = await ethers.getContractFactory("EngineQueries");
    const sut = await EngineQueries.deploy(
        trucoResolver.address,
        envidoResolver.address,
        cardsDeck.address
    );
    return { sut };
  }

  describe("Envido points calculation", function () {

    it("Invalid cards", async function () {
      const {sut} = await deployContract();

      // One invalid card
      let cards = [BigNumber.from(0)]

      expect(sut.getEnvidoPointsForCards(cards)).to.be.revertedWith("Invalid card")

      // Multiple invalid cards
      cards = [BigNumber.from(0), BigNumber.from(44)]

      expect(sut.getEnvidoPointsForCards(cards)).to.be.revertedWith("Invalid card")

      // Mix invalid with valid cards
      cards = [BigNumber.from(0), BigNumber.from(2), BigNumber.from(3)]

      expect(sut.getEnvidoPointsForCards(cards)).to.be.revertedWith("Invalid card")

      // Mix valid with invalid upper bound
      cards = [BigNumber.from(2), BigNumber.from(3), BigNumber.from(44)]

      expect(sut.getEnvidoPointsForCards(cards)).to.be.revertedWith("Invalid card")
    })

    describe("No suit match", function () {

      it("One number and two figures", async function () {
        const {sut} = await deployContract();

        // Three cards of different suit
        let cards = [BigNumber.from(1), BigNumber.from(11), BigNumber.from(21)]

        expect(await sut.getEnvidoPointsForCards(cards)).to.equal(BigNumber.from(1))
      })

      it("Two numbers and one figure", async function () {
        const {sut} = await deployContract();

        // Three cards of different suit
        let cards = [BigNumber.from(1), BigNumber.from(18), BigNumber.from(28)]

        expect(await sut.getEnvidoPointsForCards(cards)).to.equal(BigNumber.from(1))
      })

      it("Two numbers and one figure, different order", async function () {
        const {sut} = await deployContract();

        // Three cards of different suit
        let cards = [BigNumber.from(18), BigNumber.from(28), BigNumber.from(5),]

        expect(await sut.getEnvidoPointsForCards(cards)).to.equal(BigNumber.from(5))
      })

      it("Three numbers", async function () {
        const {sut} = await deployContract();

        // Three cards of different suit
        let cards = [BigNumber.from(1), BigNumber.from(23), BigNumber.from(34)]

        expect(await sut.getEnvidoPointsForCards(cards)).to.equal(BigNumber.from(4))
      })


    })

    describe("Suit match", function () {

      it("Suit match, only two add for envido", async function () {
        const {sut} = await deployContract();

        // Three cards of different suit
        let cards = [BigNumber.from(1), BigNumber.from(8), BigNumber.from(21)]

        expect(await sut.getEnvidoPointsForCards(cards)).to.equal(BigNumber.from(21))
      })

      it("Suit match, only two add for envido", async function () {
        const {sut} = await deployContract();

        // Three cards of different suit
        let cards = [BigNumber.from(1), BigNumber.from(8), BigNumber.from(21)]

        expect(await sut.getEnvidoPointsForCards(cards)).to.equal(BigNumber.from(21))
      })
    })
  })
});
