import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan"

import "dotenv/config";
import { mint } from "./scripts/trucoin/mintTo"

task("mint", "Mint Trucoin to address")
    .addParam("contract", "Trucoin Contract Address")
    .addParam("beneficiary", "Beneficiary account to receive the Trucoins")
    .addParam("amount", "Amount to mint")
    .setAction(mint)

const { REPORT_GAS, COINMARKETCAP_KEY }  = process.env;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.16",
        settings: {
          optimizer: {
            enabled: true,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  gasReporter: {
    enabled: REPORT_GAS == 'true',
    currency: 'USD',
    coinmarketcap: COINMARKETCAP_KEY,
    token: 'ETH',
    gasPriceApi: 'https://api.bscscan.com/api?module=proxy&action=eth_gasPrice',
    showTimeSpent: true,
  },
};

export default config;
