import { expect } from "chai"
import { ethers } from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { deployEngineContract } from "../deploy-engine-contract"

import { BigNumber } from "ethers"

describe("Truco Match", function () {
  const tokenAtStake = BigNumber.from(10)

  async function deployContract() {
    // Contracts are deployed using the first signer/account by default
    const [owner, player2, invalid_player] = await ethers.getSigners()

    const { trucoin, engine } = await deployEngineContract()

    // Transfer trucoins to players
    await trucoin.mint(owner.address, tokenAtStake)
    await trucoin.mint(player2.address, tokenAtStake)
    await trucoin.mint(invalid_player.address, tokenAtStake)

    const TrucoMatch = await ethers.getContractFactory("TrucoMatch")
    const match = await TrucoMatch.deploy(
      engine.address,
      trucoin.address,
      tokenAtStake
    )

    return { match, engine, trucoin, owner, player2, invalid_player }
  }

  async function startMatch() {
    const { match, trucoin, owner, player2 } = await loadFixture(
      deployContract
    )

    // Approve trucoins to be used by the match contract
    await trucoin.connect(owner).approve(match.address, tokenAtStake)
    await trucoin.connect(player2).approve(match.address, tokenAtStake)

    // Owner stakes tokens
    await match.connect(owner).stake(0)

    // Player2 joins the match
    await match.connect(player2).join()

    return { match, trucoin, owner, player2, tokenAtStake }
  }

  // Constructor tests
  describe("Constructor", function () {
    it("The owner must be player 1. Player 2 must be address(0)", async function () {
      const { match, owner } = await loadFixture(deployContract)

      await match.getPlayers().then((players) => {
        expect(players[0]).to.equal(owner.address)
        expect(players[1]).to.equal(ethers.constants.AddressZero)
      })
    })
  })

  // Join tests
  describe("Join", function () {
    it("Player 2 must be able to join the match", async function () {
      const { match, trucoin, owner, player2 } = await loadFixture(
        deployContract
      )

      // Allow trucoin transfer
      await trucoin.connect(player2).approve(match.address, tokenAtStake)

      await match.connect(player2).join()

      await match.getPlayers().then((players) => {
        expect(players[0]).to.equal(owner.address)
        expect(players[1]).to.equal(player2.address)
      })
    })

    it("Must not be able to join the match if it is already full", async function () {
      const { match, trucoin, owner, player2, invalid_player } =
        await loadFixture(deployContract)

      // Allow trucoin transfer
      await trucoin.connect(player2).approve(match.address, tokenAtStake)
      await trucoin
        .connect(invalid_player)
        .approve(match.address, tokenAtStake)

      await match.connect(player2).join()
      await expect(match.connect(invalid_player).join()).to.be.revertedWith(
        "Match is full"
      )

      await match.getPlayers().then((players) => {
        expect(players[0]).to.equal(owner.address)
        expect(players[1]).to.equal(player2.address)
      })
    })

    // Must revert if not enough tokens are approved
    it("Must revert if not enough tokens are approved", async function () {
      const { match, trucoin, player2 } = await loadFixture(deployContract)

      // Allow trucoin transfer
      await trucoin
        .connect(player2)
        .approve(match.address, tokenAtStake.sub(1))

      await expect(match.connect(player2).join()).to.be.revertedWith(
        "Not enough trucoins transfer approved"
      )
    })

    // Owner must not be able to join the match
    it("Owner must not be able to join the match", async function () {
      const { match, trucoin, owner } = await loadFixture(deployContract)

      // Allow trucoin transfer
      await trucoin.connect(owner).approve(match.address, tokenAtStake)

      await expect(match.connect(owner).join()).to.be.revertedWith(
        "Match creator is already joined"
      )
    })

    // Must start the match if both players are joined & tokens are transfered
    it("Must start the match if both players are joined & tokens are transfered", async function () {
      const { match, trucoin, owner, player2 } = await loadFixture(
        deployContract
      )

      // Allow trucoin transfer
      await trucoin.connect(owner).approve(match.address, tokenAtStake)
      await trucoin.connect(player2).approve(match.address, tokenAtStake)

      // Owner stakes tokens
      await match.connect(owner).stake(0)

      // Player 2 joins the match
      expect(await match.connect(player2).join()).to.emit(
        match,
        "MatchStarted"
      )

      await match.getPlayers().then((players) => {
        expect(players[0]).to.equal(owner.address)
        expect(players[1]).to.equal(player2.address)
      })
    })
  })

  // Stake tests
  describe("Stake", function () {
    it("Must emit an event when staking", async function () {
      const { match, trucoin, owner } = await loadFixture(deployContract)

      // Allow trucoin transfer
      await trucoin.connect(owner).approve(match.address, tokenAtStake)

      await expect(match.connect(owner).stake(0)).to.emit(
        match,
        "PlayerStaked"
      )
    })

    // Must revert if player is not joined
    it("Must revert if player is not joined", async function () {
      const { match, trucoin, player2 } = await loadFixture(deployContract)

      // Allow trucoin transfer
      await trucoin.connect(player2).approve(match.address, tokenAtStake)

      await expect(match.connect(player2).stake(0)).to.be.revertedWith(
        "Player is not joined"
      )
    })

    // Must revert if player does not have enough tokens approved
    it("Must revert if player does not have enough tokens approved", async function () {
      const { match, trucoin, owner } = await loadFixture(deployContract)

      // Allow trucoin transfer
      await trucoin.connect(owner).approve(match.address, tokenAtStake.sub(1))

      await expect(match.connect(owner).stake(0)).to.be.revertedWith(
        "Not enough trucoins transfer approved"
      )
    })

    // Must start the match if both players are joined & tokens are transfered
    it("Must start the match if both players are joined & tokens are transfered", async function () {
      const { match, trucoin, owner, player2 } = await loadFixture(
        deployContract
      )

      // Allow trucoin transfer
      await trucoin.connect(owner).approve(match.address, tokenAtStake)
      await trucoin.connect(player2).approve(match.address, tokenAtStake)

      // Player 2 joins the match
      await match.connect(player2).join()

      // Owner stakes and match starts
      expect(await match.connect(owner).stake(0)).to.emit(
        match,
        "MatchStarted"
      )

      await match.getPlayers().then((players) => {
        expect(players[0]).to.equal(owner.address)
        expect(players[1]).to.equal(player2.address)
      })
    })
  })

  // New Deal tests
})
