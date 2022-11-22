import { BigNumber } from 'ethers'
import { ChallengeEnum, ResponseEnum } from './trucoV1/struct-enums'

import { IERC3333 } from '../typechain-types/contracts/trucoV1/interfaces/IERC3333'
import GameStateStruct = IERC3333.GameStateStruct

// Must replicate IERC3333.initialGameState() initial state
export function basicGameState(): GameStateStruct {
    const defaultPlayerId = BigNumber.from(0)
    const maskedCard = BigNumber.from(0) // see ICardsDeck impl:  CastilianDeck.sol

    return {
        playerTurn: BigNumber.from(defaultPlayerId),
        playerWhoShuffled: BigNumber.from(defaultPlayerId),
        pointsToWin: BigNumber.from(15),
        currentChallenge: {
            challenge: BigNumber.from(ChallengeEnum.None),
            challenger: BigNumber.from(defaultPlayerId),
            pointsAtStake: BigNumber.from(defaultPlayerId),
            waitingChallengeResponse: false,
            response: BigNumber.from(ResponseEnum.None),
        },
        revealedCardsByPlayer: [
            [maskedCard, maskedCard, maskedCard],
            [maskedCard, maskedCard, maskedCard],
        ],
        envido: {
            spelled: false,
            playerCount: [BigNumber.from(99), BigNumber.from(99)],
            pointsRewarded: BigNumber.from(0),
        },
        teamPoints: [BigNumber.from(0), BigNumber.from(0)],
    }
}
