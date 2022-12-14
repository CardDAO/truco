# ♠ ♦ ♥ ♣ Truco Protocol ♠ ♦ ♥ ♣


### Scripts
#### Deploy
```sh
    npx hardhat run scripts/deploy.ts --network localhost
```

#### Mint Trucoins

Account 3 hardhat (force deployer)
```sh
    npx hardhat mint \ 
        --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3 \ # trucoin
        --beneficiary 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \ # hardhat account 3
        --amount 100000000000000000000 \ # 100 trucoins
        --network localhost
```

Account2 hardhat(player2)
```sh
    npx hardhat mint \
        --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
        --beneficiary 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
        --amount 100000000000000000000 \
        --network localhost
```

#### Manual deploy new match
```sh
    npx hardhat new-match \
        --factory 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318 \ # hardhat account 3
        --trucoin 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
        --amount 100000 \ # approve and deploy
        --network localhost
```
