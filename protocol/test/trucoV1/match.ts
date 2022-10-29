import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

describe("Match Main Logic", function () {
  async function deployContract() {
    const Trucoin = await ethers.getContractFactory("Trucoin");
    const truecoin = await Trucoin.deploy();

    const TrucoResolver = await ethers.getContractFactory("TrucoResolver");
    const trucoResolver = await TrucoResolver.deploy();

    const EnvidoResolver = await ethers.getContractFactory("EnvidoResolver");
    const envidoResolver = await EnvidoResolver.deploy();

    const TrucoEngine = await ethers.getContractFactory("EngineTester");
    const engine = await TrucoEngine.deploy(
      truecoin.address,
      trucoResolver.address,
      envidoResolver.address
    );

    const DeckCrypt = await ethers.getContractFactory("DeckCrypt");
    const deckCrypt = await DeckCrypt.deploy();

    const TrucoMatch = await ethers.getContractFactory("TrucoMatch");
    const sut = await TrucoMatch.deploy(
      engine.address,
      deckCrypt.address,
      truecoin.address
    );

    return { sut };
  }

  describe("Example", function () {
    const currentPlayerIdx = BigNumber.from(0);

    it("Check if i can spell Truco", async function () {
      const { sut } = await deployContract();

      // This should fail internally on call to trucoEngine but catched by the view and return false
      expect(await sut.callStatic.canISpellTruco()).to.be.false;
    });
  });
});
