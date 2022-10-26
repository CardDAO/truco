//import { Contract, ContractInterface, utils } from "ethers"
import { Web3Provider, ExternalProvider } from '@ethersproject/providers'
import { Provider as InterfaceProvider, GAS_PRICE_LIMIT } from './Provider'


export class EthersJS implements InterfaceProvider<Web3Provider> {
  library: Web3Provider
  account: any

  readonly provider: ExternalProvider
  //contract?: Contract

  constructor(provider: ExternalProvider) {
    this.library = new Web3Provider(provider) as Web3Provider
    this.provider = provider
  }

  getLibrary(): Web3Provider {
    return this.library
  }

  async getBalance(): Promise<Number> {
    return Number(await this.library.getBalance(this.account))
  }

  async connect() {
    const accounts = await this.library.send("eth_requestAccounts", [])
    this.account = accounts[0]
  }

  async verify(connected: any, disconnected: any) {
     window.ethereum.on('accountsChanged', disconnected)
     connected(await this.library.send("eth_accounts", []))
  }

}
