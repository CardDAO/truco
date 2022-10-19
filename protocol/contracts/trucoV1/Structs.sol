// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

uint8 constant CardsCount = 40;

library CardsStructs  {

    struct Deck {
        bytes1[CardsCount] cards;
    }

    enum Action {
        PlayCard, Challenge, Response, Resign
    }

    enum Challenge {
        Truco, ReTruco, ValeCuatro, Envido, EnvidoEnvido, RealEnvido, FaltaEnvido
    }

    enum Response {
        Accept, DontAccept, EnvidoCount
    }

    struct Move {
        Action action;
        bytes1[] parameters;
    }
}

