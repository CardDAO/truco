import { shuffled } from 'ethers/lib/utils'
import { encryptDeck, decryptDeck } from 'mental-poker';
import { GAME_CONFIG } from "../../../engine/truco/GameConfig";
import { StateEnum } from "../../../hooks/enums"



export const firstShuffling = async (decks: any, cardCodewords: any, self: any, latestNonce: any, signMessage: any) => {
    console.log('inica el shuffling con', cardCodewords)
    let deck = cardCodewords
    const deckShuffled = shuffled(deck)
    console.log('key pairs',self.keyPairs[GAME_CONFIG.cardCount].privateKey)
    deck = encryptDeck(deckShuffled, self.keyPairs[GAME_CONFIG.cardCount].privateKey)

    console.log('el deck encriptado', deck)

    signMessage({
        message: JSON.stringify({
            topic: 'init_shuffling',
            data: { deck },
            nonce: latestNonce+1 // replaced by the method
        }) 
    })
}

