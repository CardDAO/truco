
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


### A short poem thanks to OpenAI Chatbot 

In the world of Truco,
Ethereum reigns supreme,
A decentralized platform,
Where trust is the key.

Smart contracts run the game,
Enforcing the rules,
No cheating or foul play,
In this blockchain-based school.

With Truco on Ethereum,
Players can bet and win,
In a secure and fair environment,
Where the code can't be tinkered with.

So come and join the fun,
And see what Ethereum can do,
In the world of Truco,
Where anything is possible too.
