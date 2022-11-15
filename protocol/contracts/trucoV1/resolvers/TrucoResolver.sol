// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '../interfaces/IChallengeResolver.sol';

contract TrucoResolver {
    function resolve(
        IERC3333.GameState memory _gameState,
        IERC3333.Move memory _move
    ) external view returns (IERC3333.GameState memory) {
        // Valid moves up to this point are enforced before any logic
        require(
            _move.action == IERC3333.Action.Challenge ||
                _move.action == IERC3333.Action.Response ||
                _move.action == IERC3333.Action.PlayCard
        );

        // When current challenge is at a refusal state, no new moves can be processed
        if (
            _gameState.currentChallenge.challenge != IERC3333.Challenge.None &&
            _gameState.currentChallenge.response == IERC3333.Response.Refuse
        ) {
            revert(
                'No new moves can be processed while current challenge is at refusal state'
            );
        }

        // Check whether the game is at a final state and should not accept any new moves
        if (this.isFinal(_gameState)) {
            revert('Game is in final state');
        }

        // ---------------------------------------------------------------------------------------------------------
        // Main Logic:
        // 3 possible cases are handled:

        // 1) Check if action is a challenge  "rising" (i.e: Envido -> Real Envido! / Envido -> Falta Envido!) or challenge mismatch
        if (_move.action == IERC3333.Action.Challenge) {
            // Preconditions:
            // - Previous challenge was accepted
            // - Player is not the challenger
            // - Haven't reach maximum challenges spelled
            require(
                _gameState.currentChallenge.waitingChallengeResponse == false
            );

            // Check challenger only if it's a raise (comes from a state of no current challenge)
            if (
                _gameState.currentChallenge.challenge != IERC3333.Challenge.None
            ) {
                require(
                    _gameState.playerTurn !=
                        _gameState.currentChallenge.challenger
                );
            }

            // Check if the challenge can't be raised
            require(
                _gameState.currentChallenge.challenge !=
                    IERC3333.Challenge.ValeCuatro,
                "ValeCuatro can't be rised"
            );

            IERC3333.Challenge newChallenge = IERC3333.Challenge(
                _move.parameters[0]
            );

            // Check if the challenge is a valid raise, being the next in the chain
            require(
                uint8(newChallenge) ==
                    uint8(_gameState.currentChallenge.challenge) + 1
            );

            _gameState.currentChallenge.challenge = newChallenge;
            _gameState.currentChallenge.response = IERC3333.Response.None;
            _gameState.currentChallenge.waitingChallengeResponse = true;
            _gameState.currentChallenge.challenger = _gameState.playerTurn;

            return _gameState;
        }

        // 2) Check if action is an envido acceptance or refusal
        if (_move.action == IERC3333.Action.Response) {
            // Preconditions:
            // - Challenge should have no response
            // - Can't be the challenger
            // - Should be a valid response
            require(
                _gameState.currentChallenge.response == IERC3333.Response.None
            );

            IERC3333.Response response = IERC3333.Response(_move.parameters[0]);

            require(
                response == IERC3333.Response.Accept ||
                    response == IERC3333.Response.Refuse
            );

            require(
                _gameState.playerTurn != _gameState.currentChallenge.challenger
            );

            _gameState.currentChallenge.waitingChallengeResponse = false;
            _gameState.currentChallenge.response = response;

            // If response is a refusal, game ends
            if (response == IERC3333.Response.Refuse) {
                return _gameState;
            }

            // If it's an acceptance, points are overriden with the challenge points
            _gameState.currentChallenge.pointsAtStake = pointsPerChallenge(
                _gameState.currentChallenge.challenge
            );

            return _gameState;
        }

        // 3) Play a card
        if (_move.action == IERC3333.Action.PlayCard) {
            // Preconditions:
            // - There should be no Challenge spelled or a Challenge should have been accepted by other party
            require(
                _gameState.currentChallenge.waitingChallengeResponse == false
            );

            // Card should be valid
            require(isValidCard(_move.parameters[0]));

            uint8 slot = findRoundIdOrFail(
                _gameState.revealedCardsByPlayer[_gameState.playerTurn]
            );

            // Check card is not repeated
            require(
                cardNotRepeated(
                    _gameState.revealedCardsByPlayer,
                    _move.parameters[0]
                )
            );

            _gameState.revealedCardsByPlayer[_gameState.playerTurn][
                slot
            ] = _move.parameters[0];

            return _gameState;
        }

        // If we reach this point, it means that the move is not valid
        revert('Invalid Move');
    }

    function canResolve(IERC3333.Challenge _challenge)
        external
        pure
        returns (bool)
    {
        if (
            _challenge == IERC3333.Challenge.None ||
            _challenge == IERC3333.Challenge.Truco ||
            _challenge == IERC3333.Challenge.ReTruco ||
            _challenge == IERC3333.Challenge.ValeCuatro
        ) {
            return true;
        }

        return false;
    }

    // Check if the challenge is at a final state (no cards can be played and a winner could be determined)
    function isFinal(IERC3333.GameState memory _gameState)
        external
        view
        returns (bool)
    {
        //If a refusal was made, game is final
        if (_gameState.currentChallenge.response == IERC3333.Response.Refuse) {
            return true;
        }

        // Check if there are cards yet to be reveled by any player at rounds that's a sign that the game is not over
        if (
            !roundFinished(_gameState.revealedCardsByPlayer, 0) ||
            !roundFinished(_gameState.revealedCardsByPlayer, 1)
        ) {
            return false;
        }

        // At this point we should assume that all cards are revealed at round 2, so we need to check if there's a winner
        int8 round1Winner = roundWinner(_gameState.revealedCardsByPlayer, 0);
        int8 round2Winner = roundWinner(_gameState.revealedCardsByPlayer, 1);

        // If player wins both rounds, he wins the game
        if (round1Winner >= 0 && round1Winner == round2Winner) {
            return true;
        }

        // If first round was a tie and second round has a winner game should be final
        if (round1Winner < 0 && round2Winner >= 0) {
            return true;
        }

        // Check if at round 3 all cards are revealed
        return roundFinished(_gameState.revealedCardsByPlayer, 2);
    }

    function getWinner(IERC3333.GameState memory _gameState)
        external
        view
        returns (uint8)
    {
        require(this.isFinal(_gameState), 'Game is not final');

        // If truco was refused, the challenger wins
        if (_gameState.currentChallenge.response == IERC3333.Response.Refuse) {
            return _gameState.currentChallenge.challenger;
        }

        int8 round1Winner = roundWinner(_gameState.revealedCardsByPlayer, 0);
        int8 round2Winner = roundWinner(_gameState.revealedCardsByPlayer, 1);

        if (round1Winner < 0 && round2Winner >= 0) {
            // If first round was a tie and the second rounds defines (if it's not a tie)
            return uint8(round2Winner);
        }

        // If both rounds are won by same player, it's the winner
        if (round1Winner == round2Winner && round1Winner >= 0) {
            return uint8(round1Winner);
        }

        int8 round3Winner = roundWinner(_gameState.revealedCardsByPlayer, 2);

        // If it's a tie in the third round, "mano" wins
        if (round3Winner < 0) {
            return reversePlayer(_gameState.playerWhoShuffled);
        }

        return uint8(round3Winner);
    }

    // ---------------------------------------------------------------------------------------------------------
    // END: IFace impl
    // ---------------------------------------------------------------------------------------------------------

    // Checks if round is considered finished
    function roundFinished(uint8[3][] memory _revealedCards, uint8 round)
        public
        pure
        returns (bool)
    {
        for (uint8 i = 0; i < _revealedCards.length; i++) {
            if (_revealedCards[i][round] == 0) {
                return false;
            }
        }

        return true;
    }

    // Returns the winner player idx or -1 on draw or
    function roundWinner(uint8[3][] memory _revealedCards, uint8 _roundId)
        public
        pure
        returns (int8)
    {
        uint8[41] memory cardsHierachy = getCardsHierarchy();
        uint8 cardPlayer0AtCurrentRound = _revealedCards[0][_roundId];
        uint8 cardPlayer1AtCurrentRound = _revealedCards[1][_roundId];

        if (
            cardsHierachy[cardPlayer0AtCurrentRound] ==
            cardsHierachy[cardPlayer1AtCurrentRound]
        ) {
            return -1;
        }

        if (
            cardsHierachy[cardPlayer0AtCurrentRound] <
            cardsHierachy[cardPlayer1AtCurrentRound]
        ) {
            return int8(0);
        }

        return int8(1);
    }

    function reversePlayer(uint8 _player) internal pure returns (uint8) {
        return _player ^ 1;
    }

    // Check if card is not repeated in the array
    function cardNotRepeated(uint8[3][] memory _revealedCards, uint8 _card)
        internal
        pure
        returns (bool)
    {
        for (uint8 i = 0; i < _revealedCards.length; i++) {
            for (uint8 j = 0; j < _revealedCards[i].length; j++) {
                if (_revealedCards[i][j] == _card) {
                    return false;
                }
            }
        }

        return true;
    }

    // Get current round id at play
    function roundAtPlay(IERC3333.GameState memory _gameState)
        public
        pure
        returns (uint8)
    {
        uint8 i = 0;

        while (i < 3) {
            if (
                _gameState.revealedCardsByPlayer[0][i] == 0 ||
                _gameState.revealedCardsByPlayer[1][i] == 0
            ) {
                return i;
            }

            i++;
        }
        return i;
    }

    function roundEmpty(IERC3333.GameState memory gameState, uint8 _roundId)
        public
        pure
        returns (bool)
    {
        return
            gameState.revealedCardsByPlayer[0][_roundId] == 0 &&
            gameState.revealedCardsByPlayer[1][_roundId] == 0;
    }

    function roundComplete(IERC3333.GameState memory gameState, uint8 _roundId)
        external
        view
        returns (bool)
    {
        // Cards does not repeat, so special case is when both cards are the same they should be masked
        return
            this.roundEmpty(gameState, _roundId) &&
            gameState.revealedCardsByPlayer[0][_roundId] !=
            gameState.revealedCardsByPlayer[1][_roundId];
    }

    function getPlayerTurnAtRound(
        IERC3333.GameState memory gameState,
        uint8 _roundId
    ) public view returns (uint8) {
        require(!this.roundComplete(gameState, _roundId));

        if (gameState.revealedCardsByPlayer[0][_roundId] == 0) {
            return 0;
        }
        return 1;
    }

    // Return points that should be at stake for a given challenge
    function pointsPerChallenge(IERC3333.Challenge challenge)
        internal
        pure
        returns (uint8)
    {
        if (challenge == IERC3333.Challenge.Truco) {
            return 2;
        }

        if (challenge == IERC3333.Challenge.ReTruco) {
            return 3;
        }

        if (challenge == IERC3333.Challenge.ValeCuatro) {
            return 4;
        }

        revert('Invalid challenge');
    }

    // Check if it's a valid card representation
    function isValidCard(uint8 _card) internal pure returns (bool) {
        return _card >= 1 && _card <= 41;
    }

    // Find first round slot available for a player to play a card
    function findRoundIdOrFail(uint8[3] memory _playerRounds)
        internal
        pure
        returns (uint8)
    {
        uint8 i = 0;

        while (i < 3 && _playerRounds[i] != 0) {
            i++;
        }

        if (i == 3) {
            revert('No rounds available');
        }

        return i;
    }

    // @dev Card Hierarchy for Castillian Suited Card Deck, see CastillianDeck.sol (IDeck impl) for deck card definition
    function getCardsHierarchy() internal pure returns (uint8[41] memory) {
        /*
        // Generation Code
        uint8[41] memory hierarchy;

        hierarchy[21] = 1; // Ace of Swords
        hierarchy[31] = 2; // Ace of Clubs
        hierarchy[27] = 3; // 7 of Swords
        hierarchy[7] = 4; // 7 of Coins

        // 3 of all suits
        hierarchy[3] = hierarchy[13] = hierarchy[23] = hierarchy[33]  = 5;

        // 2 of all suits
        hierarchy[2] = hierarchy[12] = hierarchy[22] = hierarchy[32]  = 6;

        // Aces of Cups and Coins
        hierarchy[1] = hierarchy[11] = 7;

        // All Kings
        hierarchy[10] = hierarchy[20] = hierarchy[30] = hierarchy[40] = 8;

        // All Knights
        hierarchy[9] = hierarchy[19] = hierarchy[29] = hierarchy[39] = 9;

        // All Knave
        hierarchy[8] = hierarchy[18] = hierarchy[28] = hierarchy[38] = 10;

        // 7 of Cups and Clubs
        hierarchy[17] = hierarchy[37] = 11;

        // All 6s
        hierarchy[6] = hierarchy[16] = hierarchy[26] = hierarchy[36] = 12;

        // All 5s
        hierarchy[5] = hierarchy[15] = hierarchy[25] = hierarchy[35] = 13;

        // All 4s
        hierarchy[4] = hierarchy[14] = hierarchy[24] = hierarchy[34] = 14;

        Array:
        [
            0,
            7, 6, 5, 14, 13, 12,  4, 10, 9, 8,
            7, 6, 5, 14, 13, 12, 11, 10, 9, 8,
            1, 6, 5, 14, 13, 12,  3, 10, 9, 8,
            2, 6, 5, 14, 13, 12, 11, 10, 9, 8
        ]

        */

        // This array was created using previously described code and pre-calculated to avoid memory expansion and gas costs
        return [
            0,
            7,
            6,
            5,
            14,
            13,
            12,
            4,
            10,
            9,
            8,
            7,
            6,
            5,
            14,
            13,
            12,
            11,
            10,
            9,
            8,
            1,
            6,
            5,
            14,
            13,
            12,
            3,
            10,
            9,
            8,
            2,
            6,
            5,
            14,
            13,
            12,
            11,
            10,
            9,
            8
        ];
    }
}
