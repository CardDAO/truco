import { randomBytes } from 'ethers/lib/utils'

export const dealCards = (encryptedDeck: any, usedIndexCards: any, self: any, latestNonce: any, signMessage: any): MentalPokerCard[] => {
    // TODO check used cards < 40-3
    let dealIndexes = []

    while (dealIndexes.length < 3) {
        // USE GAME CONFIG
        const randomIndex = parseInt(randomBytes(1).toString()) % 40
        if (usedIndexCards.indexOf(randomIndex) === -1 && dealIndexes.indexOf(randomIndex) === -1) {
            dealIndexes.push(
                randomIndex
            )
        }
    }

    const cardsToDeal: MentalPokerCard[] = []
    for (let i = 0; i < dealIndexes.length ; i++) {
        cardsToDeal.push({
            cardIndex: dealIndexes[i],
            private_keys: [self.keyPairs[dealIndexes[i]].privateKey]
        })

    }
    console.log('to send', cardsToDeal)

     signMessage({
        message: JSON.stringify({
            topic: 'deal_cards',
            data: { cardsToDeal },
            nonce: latestNonce+1 // replaced by the method
        }) 
    })

    return cardsToDeal
}

