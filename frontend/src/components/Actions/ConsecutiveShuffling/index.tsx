import { shuffled } from 'ethers/lib/utils'
import { encryptDeck, decryptDeck } from 'mental-poker';
import { GAME_CONFIG } from "../../../engine/truco/GameConfig";
import { StateEnum } from "../../../hooks/enums"



export const consecutiveShuffling = async (decks: any, deckToShuffle: any, self: any, latestNonce: any, signMessage: any) => {
    let deck = deckToShuffle 
    deck = encryptDeck(shuffled(deck), self.keyPairs[GAME_CONFIG.cardCount].privateKey)

    signMessage({
        message: JSON.stringify({
            topic: 'consecutive_shuffling',
            data: { deck },
            nonce: latestNonce+1 // replaced by the method
        }) 
    })
}

