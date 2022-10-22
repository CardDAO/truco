// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

uint8 constant CardsCount = 40;

library CardsStructs {
    struct Deck {
        bytes1[CardsCount] cards;
    }

    enum Action {
        PlayCard,
        EnvidoCount,
        Challenge,
        Response,
        Resign
    }

    enum Challenge {
        None,
        Truco,
        ReTruco,
        ValeCuatro,
        Envido,
        RealEnvido,
        FaltaEnvido
    }

    enum Response {
        Accept,
        DontAccept
    }

    struct GameState {
        int8 playerTurn; // player index
        int8[] teamPoints; //points indexed by team id (in this case a player is a team)
        bytes1[6] revealed_cards; // 
        Challenge currentChallenge;
    }

    struct Move {
        Action action;
        bytes1[] parameters;
    }

    struct Transaction {
        int8 currentPlayerIndex;
        GameState state;
        Move[] moves;
    }
}
