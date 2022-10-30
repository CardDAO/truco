// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

uint8 constant CardsCount = 40;

library CardsStructs {
    // Deck definition
    struct Deck {
        bytes1[CardsCount] cards;
    }

    // Valid Actions for Moves
    enum Action {
        PlayCard,
        EnvidoCount,
        Challenge,
        Response,
        Resign
    }

    // Moves
    struct Move {
        Action action;
        uint8[] parameters;
    }

    // Valid Challenges
    enum Challenge {
        None,
        Truco,
        ReTruco,
        ValeCuatro,
        Envido,
        EnvidoEnvido,
        RealEnvido,
        FaltaEnvido
    }

    // Challenges valid responses
    enum Response {
        None,
        Accept,
        Refuse
    }

    // Challenge being played
    struct CurrentChallenge {
        Challenge challenge;
        uint8 challenger;
        uint8 pointsAtStake;
        bool waitingChallengeResponse;
        Response response;
    }

    // Game state representation
    struct GameState {
        uint8 playerTurn; // player index
        uint8 playerWhoShuffled;
        uint8 pointsToWin;
        CurrentChallenge currentChallenge;
        uint8[3][] revealedCardsByPlayer;
        uint8[] envidoCountPerPlayer;
        uint8[] teamPoints; //points indexed by team id (in this case a player is a team)
        bool isDealOpen;

    }

    // Represents a transaction (defined as a series of moves) which is meant to be applied to the given game state
    struct Transaction {
        uint8 playerIdx;
        GameState state;
        Move[] moves;
    }
}
