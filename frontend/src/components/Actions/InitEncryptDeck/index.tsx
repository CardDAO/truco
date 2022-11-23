import { shuffled } from 'ethers/lib/utils'
import { encryptDeck, decryptDeck } from 'mental-poker';
import { GAME_CONFIG } from "../../../engine/truco/GameConfig";
import { StateEnum } from "../../../hooks/enums"



export const initEncryptDeck = async (decks: any, deckShuffled: any, self: any, latestNonce: any, signMessage: any) => {

    let deck = encryptDeck(
        decryptDeck(deckShuffled, self.keyPairs[GAME_CONFIG.cardCount].privateKey),
        self.keyPairs.map(keyPair => keyPair.privateKey),
    );

    signMessage({
        message: JSON.stringify({
            topic: 'init_locking',
            data: { deck },
            nonce: latestNonce+1 // replaced by the method
        }) 
    })

    return deck;
}

