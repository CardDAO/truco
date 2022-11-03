const { ethers } = require("hardhat");

export async function deployEngineContract() {
    const Trucoin = await ethers.getContractFactory("Trucoin");
    const trucoin = await Trucoin.deploy();

    const TrucoResolver = await ethers.getContractFactory("TrucoResolver");
    const trucoResolver = await TrucoResolver.deploy();

    const EnvidoResolver = await ethers.getContractFactory("EnvidoResolver");
    const envidoResolver = await EnvidoResolver.deploy();

    const CardsDeck = await ethers.getContractFactory("CastillianDeck");
    const cardsDeck = await CardsDeck.deploy();

    const EngineQueries = await ethers.getContractFactory("EngineQueries");
    const engineQueries = await EngineQueries.deploy(
        trucoResolver.address,
        envidoResolver.address,
        cardsDeck.address
    );

    const TrucoEngine = await ethers.getContractFactory("EngineTester");
    const engine = await TrucoEngine.deploy(
        trucoin.address,
        trucoResolver.address,
        envidoResolver.address,
        engineQueries.address
    );

  return { engine, trucoin };
}
