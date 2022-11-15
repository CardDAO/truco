//This should mirror the struct in the contract in contracts/match/TrucoMatch.sol

export const enum MatchStateEnum {
    WAITING_FOR_PLAYERS,
    WAITING_FOR_DEAL,
    WAITING_FOR_PLAY,
    WAITING_FOR_REVEAL,
    FINISHED
}
