// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

/**
 * @title ERC3333 interface for turn based Truco card games on the Blockchain
 * @dev see ERC-3333 proposal
 */
interface IERC3333 {
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
        uint8 pointsAtStake; // Amount of points that will be added to the winner's score when challenge is resolved
        bool waitingChallengeResponse;
        Response response;
    }

    // Envido State
    struct EnvidoState {
        bool spelled; // True if envido was spelled by some player, does not mean it was accepted, refused or played
        uint8[] playerCount; // Points count per player, 0 if not played
        uint8 pointsRewarded; // Points rewarded to the winner, if there's no winner yet, it's 0
    }

    // Game state representation
    struct GameState {
        uint8 playerTurn; // player index, NOT managed by engine
        uint8 playerWhoShuffled; // player index, NOT managed by engine
        uint8 pointsToWin; // points to win, NOT managed by engine
        CurrentChallenge currentChallenge; // engine managed state
        uint8[3][] revealedCardsByPlayer; // engine managed state
        EnvidoState envido; // engine managed state
        uint8[] teamPoints; //points indexed by team id (in this case a player is a team) NOT managed by engine
    }

    // Represents a transaction (defined as a series of moves) which is meant to be applied to the given game state
    struct Transaction {
        uint8 playerIdx;
        GameState state;
        Move[] moves;
    }

    function startGame() external returns (GameState memory);

    function initialGameState()
        external
        pure
        returns (GameState memory _gameState);

    function transact(Transaction calldata transaction)
        external
        returns (GameState memory gameState);

    function isGameEnded(GameState memory gameState)
        external
        view
        returns (bool);

    function getFees() external view returns (uint256);
}
