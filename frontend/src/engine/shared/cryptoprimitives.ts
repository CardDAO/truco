import { utils, BytesLike } from "ethers"

export function encryptAllUsingOTP(
  cards: PromiseOrValue<BytesLike>[],
  key: string
): PromiseOrValue<BytesLike>[] {

    console.log('key',key)
  const encryptedCards = [] as PromiseOrValue<BytesLike>[]

  for (let i = 0; i < cards.length; i++) {
    let card = cards[i]
    console.log('get card', card)

    encryptedCards[i] = encryptCard(card, key)
    console.log('status encrypted', encryptedCards)
  }
  return encryptedCards;
}

export function encryptCard(card: PromiseOrValue<BytesLike>, key: string): PromiseOrValue<BytesLike> {
    // Do XOR byte by byte
    let xored : number = parseInt(card.toString(), 10) ^ parseInt("0x" + key, 16)

    // Add padding zeroes to the left to make sure the length is 2.
    // Use substring, subs deprecated
    // 0x + sanitized xor
    return "0x" + ("0" + xored.toString(16)).substring(-2)
}

export function encryptUsingOTP(
  cards: PromiseOrValue<BytesLike>[],
  key: Array<string>
): PromiseOrValue<BytesLike>[] {

  const encryptedCards = [] as PromiseOrValue<BytesLike>[]

  for (let i = 0; i < cards.length; i++) {
    let card = cards[i]
    encryptedCards[i] = encryptCard(card, key[i])
  }

  return encryptedCards;
}

// Generate secret key for OTP encryption using keccak256 mirroring the contract implementation
export function generateKeyUsingSecret(
  secret: string,
  length: number
): Array<string> {

  let sequence: number = 0;
  let key: string = "";

  for (let i = 0; i < length / 32; i++) {
    // Generate keccak256 hash from secret + sequence.
    // IMPORTANT NOTE FOR COMPATIBILITY:
    // `sequence` must be converted to utf8 representation using it as index, not it's string representation directly.
    let hash = utils.keccak256(
      utils.toUtf8Bytes(secret + String.fromCharCode(sequence))
    );
    // remove "0x" prefix from the beginning of the hash since we want pure byte representation
    key += hash.slice(2);
    sequence++;
  }
  return key.match(/.{1,2}/g) || [];
}
