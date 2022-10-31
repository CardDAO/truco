export {};

declare global {
    import { SignatureLike } from "@ethersproject/bytes"
    import { BytesLike } from "ethers"
    import { StateEnum } from "../hooks/enum"


    type PromiseOrValue<BytesLike> = BytesLike | Promise<BytesLike>

    type Card = PromiseOrValue<BytesLike>

    type Shuffling = {
        cards: Card
    }

    type Data = Shuffling | Object

    type Move = {
        topic: String, //json
        data?: Data
        nonce: Number
    }

    type MessageType = {
        message: Move,
        signature?: SignatureLike
    }

    type ExposeCard = {
        index: number,
        keys: PromiseOrValue<BytesLike>[],
        card: Card
    }

    type GameState = {
        state: StateEnum,
        myCards: Card[],
        myDictionary: Card[], // keys indexed
        encryptedDeck: Card[], // encrypted deck
        usedCards: ExposeCard[], // cards with keys and index
        validPlayerAddresses: string[]
    }
}
