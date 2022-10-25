//This should mirror the struct in the contract in contracts/trucoV1/Structs.sol

export const enum ActionEnum {
  PlayCard,
  EnvidoCount,
  Challenge,
  Response,
  Resign,
}

// Valid Challenges
export const enum ChallengeEnum {
  None,
  Truco,
  ReTruco,
  ValeCuatro,
  Envido,
  EnvidoEnvido,
  RealEnvido,
  FaltaEnvido,
}

// Challenges valid responses
export const enum ResponseEnum {
  None,
  Accept,
  Refuse,
}
