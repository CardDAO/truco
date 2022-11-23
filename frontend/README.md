# Truco Front 💅
Web3 frontend for Truco game by CardDAO

## Install & Run
1. Copy `.env.example` to `.env`
2. Execute:
```bash
npm install
npm run start
```

## Deployer match instructions
1. Verify that you have Trucoin's
2. Set amount to bet
3. Click __Deploy Match__ button
4. Approve transfer Trucoins to the contract TrucoMatchFactory
5. Execute deploy -> TrucoMatchFactory
6. Wait... 

## Join the game
1. Put match contract address into join input and click -> __Join__ button
2. If you are the deployer of the match, then you are ready
3. Else, set the amount to bet (wait a bit, it will autocomplete)
4. Click the join match and wait

## Init shuffling
1. Wait for peers > 0
2. Opponent must also have peers
3. Sign message codewords <sub>(Init shuffling sharing codewords. You must sign message and send your codewords)</sub>
4. Sign message shuffling <sub>(Receive codewords from the opponent. You must shuffling and encrypt, sign message and send deck encrypt)</sub>
5. Sign message locking <sub>(Receive deck (double shuffled-encrypted) from the opponent. You must decrypt deck with your key and encrypt each card with different keys. Then, you will sign and send message )</sub>
6. Deal cards for opponent <sub>(Receive the final deck double ecrypted (card by card) from the opponent. Deal! sign and send encrypted cards to the opponent and share your keys for these cards)</sub>
8. Wait for receive yours cards from the opponent

## Play
    - Wait your turn  or play
    - Use red/gray buttons (Action Write) to spell (Truco, Retruco, Envido, Real Envido, etc.)
    - Use Envido Count to spell "Tengo 33"
    - If you play a higher card, remember that it is still your turn
    - Use Accept Challenge For Raising button to spell ReTruco, ValeCuatro, Envido-Envido


## New deal
1. Clear codewords button
2. If your turn -> sharing codewords and repeat shuffling secuence
3. Else, only clear codewords
4. If your turn -> click NewDeal Button after finish shuffling

The frontend use:
    - [P2PT](https://github.com/subins2000/p2pt)
    - [Mental-Poker](https://github.com/kripod/mental-poker)
