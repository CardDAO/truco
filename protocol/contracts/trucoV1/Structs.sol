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
        Refuse
    }

    struct CurrentChallenge {
        Challenge challenge;
        uint8 challenger;
        uint8 pointsAtStake;
        bool waitingChallengeResponse;
        Response response;
    }

    struct GameState {
        uint8 playerTurn; // player index
        uint8 playerWhoShuffled;
        uint8 pointsToWin;
        CurrentChallenge currentChallenge;
        uint8[][3] revealedCardsByPlayer;
        uint8[] envidoCountPerPlayer;
        uint8[] teamPoints; //points indexed by team id (in this case a player is a team)
        bool isDealOpen;
    }

    struct Move {
        Action action;
        uint8[] parameters;
    }

    struct Transaction {
        uint8 playerIdx;
        GameState state;
        Move[] moves;
    }
}
