// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../interfaces/IChallengeResolver.sol";

contract TrucoResolver {
    function resolve(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) external view returns (CardsStructs.GameState memory) {
        // Valid moves up to this point are enforced before any logic
        require(
            _move.action == CardsStructs.Action.Challenge ||
                _move.action == CardsStructs.Action.Response ||
                _move.action == CardsStructs.Action.PlayCard
        );

        // When current challenge is at a refusal state, no new moves can be processed
        if (
            _gameState.currentChallenge.challenge !=
            CardsStructs.Challenge.None &&
            _gameState.currentChallenge.response == CardsStructs.Response.Refuse
        ) {
            revert(
                "No new moves can be processed while current challenge is at refusal state"
            );
        }

        // Check whether the game is at a final state and should not accept any new moves
        if (this.isFinal(_gameState)) {
            revert("Game is in final state");
        }

        // ---------------------------------------------------------------------------------------------------------
        // Main Logic:
        // 3 possible cases are handled:

        // 1) Check if action is a challenge  "rising" (i.e: Envido -> Real Envido! / Envido -> Falta Envido!) or challenge mismatch
        if (_move.action == CardsStructs.Action.Challenge) {
            // Preconditions:
            // - Previous challenge was accepted
            // - Player is not the challenger
            // - Haven't reach maximum challenges spelled
            require(
                _gameState.currentChallenge.waitingChallengeResponse == false
            );

            // Check challenger only if it's a raise (comes from a state of no current challenge)
            if (
                _gameState.currentChallenge.challenge !=
                CardsStructs.Challenge.None
            ) {
                require(
                    _gameState.playerTurn !=
                        _gameState.currentChallenge.challenger
                );
            }

            // Check if the challenge can't be raised
            require(
                _gameState.currentChallenge.challenge !=
                    CardsStructs.Challenge.ValeCuatro,
                "ValeCuatro can't be rised"
            );

            CardsStructs.Challenge newChallenge = CardsStructs.Challenge(
                _move.parameters[0]
            );

            // Check if the challenge is a valid raise, being the next in the chain
            require(
                uint8(newChallenge) ==
                    uint8(_gameState.currentChallenge.challenge) + 1
            );

            _gameState.currentChallenge.challenge = newChallenge;
            _gameState.currentChallenge.response = CardsStructs.Response.None;
            _gameState.currentChallenge.waitingChallengeResponse = true;
            _gameState.currentChallenge.challenger = _gameState.playerTurn;

            return _gameState;
        }

        // 2) Check if action is an envido acceptance or refusal
        if (_move.action == CardsStructs.Action.Response) {
            // Preconditions:
            // - Challenge should have no response
            // - Can't be the challenger
            // - Should be a valid response
            require(
                _gameState.currentChallenge.response ==
                    CardsStructs.Response.None
            );

            CardsStructs.Response response = CardsStructs.Response(
                _move.parameters[0]
            );

            require(
                response == CardsStructs.Response.Accept ||
                    response == CardsStructs.Response.Refuse
            );

            require(
                _gameState.playerTurn != _gameState.currentChallenge.challenger
            );

            _gameState.currentChallenge.waitingChallengeResponse = false;
            _gameState.currentChallenge.response = response;

            // If response is a refusal, game ends
            if (response == CardsStructs.Response.Refuse) {
                return _gameState;
            }

            // If it's an acceptance, points are overriden with the challenge points
            _gameState.currentChallenge.pointsAtStake = pointsPerChallenge(
                _gameState.currentChallenge.challenge,
                _gameState
            );

            return _gameState;
        }

        // 3) Play a card
        if (_move.action == CardsStructs.Action.PlayCard) {
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
        revert("Invalid Move");
    }

    function canResolve(CardsStructs.Challenge _challenge)
        external
        view
        returns (bool)
    {
        if (
            _challenge == CardsStructs.Challenge.None ||
            _challenge == CardsStructs.Challenge.Truco ||
            _challenge == CardsStructs.Challenge.ReTruco ||
            _challenge == CardsStructs.Challenge.ValeCuatro
        ) {
            return true;
        }

        return false;
    }

    function isFinal(CardsStructs.GameState memory _gameState)
        external
        view
        returns (bool)
    {
        if (
            _gameState.currentChallenge.response == CardsStructs.Response.Refuse
        ) {
            return true;
        }

        if (
            _gameState.currentChallenge.challenge == CardsStructs.Challenge.None
        ) {
            return false;
        }

        // TODO: Implement this
        return false;
    }

    function getWinner(CardsStructs.GameState memory _gameState)
        external
        view
        returns (uint8)
    {
        require(this.isFinal(_gameState));

        int8 winner = roundWinner(_gameState.revealedCardsByPlayer, 0);
        if (winner >= 0) {
            return _gameState.playerTurn;
        }

        revert("Implement ME");
    }

    // ---------------------------------------------------------------------------------------------------------
    // END: IFace impl
    // ---------------------------------------------------------------------------------------------------------

    // Checks if round is considered finished
    function roundFinished(uint8[3][] memory _revealedCards, uint8 round)
        internal
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

    // Returns -1 on draw or the winner player idx
    function roundWinner(uint8[3][] memory _revealedCards, uint8 round)
        internal
        pure
        returns (int8)
    {
        int8 winner = -1;

        for (uint8 i = 0; i < _revealedCards.length - 1; i++) {
            if (_revealedCards[i][round] < _revealedCards[i + 1][round]) {
                winner = int8(i);
            }
        }

        return winner;
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
    function roundAtPlay(CardsStructs.GameState memory _gameState)
        internal
        pure
        returns (uint8)
    {
        uint8 i = 0;

        while (i < 3) {
            if (
                _gameState.revealedCardsByPlayer[0][i] == 0 ||
                _gameState.revealedCardsByPlayer[1][i] == 0
            ) {
                return 3;
            }

            i++;
        }
        return i;
    }

    // Return points that should be at stake for a given challenge
    function pointsPerChallenge(
        CardsStructs.Challenge challenge,
        CardsStructs.GameState memory _gameState
    ) internal pure returns (uint8) {
        if (challenge == CardsStructs.Challenge.Truco) {
            return 2;
        }

        if (challenge == CardsStructs.Challenge.ReTruco) {
            return 3;
        }

        if (challenge == CardsStructs.Challenge.ValeCuatro) {
            return 4;
        }

        revert("Invalid challenge");
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
            revert("No rounds available");
        }

        return i;
    }

    function getCardsHierarchy() internal pure returns (uint8[41] memory) {
        /*****************************************************************
        Card Hierarchy for Castillian Suited Card Deck
         
        See: https://en.wikipedia.org/wiki/Spanish-suited_playing_cards#Castilian_pattern
        
        Deck definition:
                
        Coins: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
        Cups: 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
        Swords: 21, 22, 23, 24, 25, 26, 27, 28, 29, 30
        Clubs: 31, 32, 33, 34, 35, 36, 37, 38, 39, 40
        
        Last three cards of each suit are 'Knave', 'Knight', 'King'.

        ID 0 is reserved for masked cards
                 
        Example: 
          - Card ID 8 is Knave of Coins
          - Card ID 19 is Knight of Cups
          - Card ID 21 is Ace of Swords 
          
        Code:
 
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

        *****************************************************************/

        // This array was created using previously described code and pre-calculated to avoid memory expansion and gas costs
        return [
        0,
        7, 6, 5, 14, 13, 12,  4, 10, 9, 8,
        7, 6, 5, 14, 13, 12, 11, 10, 9, 8,
        1, 6, 5, 14, 13, 12,  3, 10, 9, 8,
        2, 6, 5, 14, 13, 12, 11, 10, 9, 8
        ];
    }
}
