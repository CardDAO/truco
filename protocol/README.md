# ♠ ♦ ♥ ♣ Truco Protocol ♠ ♦ ♥ ♣


### Scripts
#### Deploy
```sh
    npx hardhat run scripts/deploy.ts --network localhost
```

#### Mint Trucoins
```sh
    npx hardhat mint \ 
        --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
        --beneficiary 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
        --amount 100000000000000000000 \ # 100 trucoins
        --network localhost
```
