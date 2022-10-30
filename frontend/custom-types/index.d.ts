export {};

declare global {
    import { SignatureLike } from "@ethersproject/bytes"
    import { BytesLike } from "ethers"
    type PromiseOrValue<BytesLike> = BytesLike | Promise<BytesLike>

    type Card = PromiseOrValue<BytesLike>

    type Shuffling = {
        cards: PromiseOrValue<BytesLike>
    }
    type Data = Shuffling | Object

    type Request = {
        topic: String, //json
        data?: Data
        nonce: Number
    }

    type MessageType = {
        message: Request,
        signature?: SignatureLike
    }

    type ExposeCard = {
        index: number,
        keys: PromiseOrValue<BytesLike>[],
        card: Card
    }
}
