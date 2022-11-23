
<img src="https://github.com/CardDAO/truco/blob/main/docs/card-dao-logo.png" height="200">

# Truco Implementation


## Main Components

### Decentralized Frontend 

Reference implemenation for decentralized shuffling and smart contract interaction. 

Current implementation covers:

- Wallet interaction: bet, deploy matches, transact and sign
- Decentralized deck shuffling coordination (webrtc + mental poker specs implementation)
- Basic game UI


Check the [documentation](/frontend) 

### Protocol

DAO's Truco On-Chain Protocol: EVM compatible contracts that supports DAOs mission 

Game Engine responsability is to ensure a valid game play and define a winner using an standard interface (ERC-3333) that matches can consume.

This first implementation enable to bet on 2 player truco matches using Trucoins (ERC-20) and Soul Bound Token award for match winner.

Check the [documentation](/protocol) 
