// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './interfaces/IChallengeResolver.sol';
import './interfaces/ICardsDeck.sol';

contract GameStateQueries {
    IChallengeResolver internal envidoResolver;
    IChallengeResolver internal trucoResolver;
    ICardsDeck internal cardsDeck;

    constructor(
        IChallengeResolver _trucoResolver,
        IChallengeResolver _envidoResolver,
        ICardsDeck _cardsDeck
    ) {
        envidoResolver = _envidoResolver;
        trucoResolver = _trucoResolver;
        cardsDeck = _cardsDeck;
    }

    function isMoveAChallengeForEnvido(IERC3333.Move memory _move)
        external
        view
        returns (bool)
    {
        if (_move.action != IERC3333.Action.Challenge) {
            return false;
        }
        return
            envidoResolver.canResolve(IERC3333.Challenge(_move.parameters[0]));
    }

    function isMoveAChallengeForTruco(IERC3333.Move memory _move)
        external
        view
        returns (bool)
    {
        if (_move.action != IERC3333.Action.Challenge) {
            return false;
        }
        return
            trucoResolver.canResolve(IERC3333.Challenge(_move.parameters[0]));
    }

    function isGameEnded(IERC3333.GameState memory gameState)
        external
        view
        returns (bool)
    {
        // Implement this
        return false;
    }

    // Return wich player should be play next
    function whichPlayerShouldPlayCard(IERC3333.GameState memory gameState)
    external
    view
    returns (uint8)
    {
        // For each round check if it's incomplete, in that case return the player that should play
        for (uint8 i; i < 3; i++) {
            if (! this.roundComplete(gameState, i)) {
                return this.getPlayerTurnAtRound(gameState, i);
            }
        }

        return gameState.playerTurn;
    }

    function roundComplete(IERC3333.GameState memory gameState, uint8 _roundId) external view returns (bool) {
        // Cards does not repeat, so special case is when both cards are the same they should be masked
        return gameState.revealedCardsByPlayer[0][_roundId] !=  gameState.revealedCardsByPlayer[1][_roundId];
    }

    function getPlayerTurnAtRound(IERC3333.GameState memory gameState, uint8 _roundId) external view returns (uint8) {
        // Round 1 is still at play
        if (gameState.revealedCardsByPlayer[0][0] == 0) {
            return 0;
        }
        return 1;
    }

    // Check if envido can be spelled at this game
    function canEnvidoBeSpelled(IERC3333.GameState memory gameState)
        internal
        view
        returns (bool)
    {
        return
            !envidoResolver.isFinal(gameState) &&
            (gameState.revealedCardsByPlayer[0][0] == 0 ||
                gameState.revealedCardsByPlayer[1][0] == 0);
    }

    // Get envido points of a given set of cards
    function getEnvidoPointsForCards(uint8[] memory _cards)
        public
        view
        returns (uint8 _envido)
    {
        require(_cards.length <= 3, 'Invalid number of cards');

        ICardsDeck.Card[3] memory validCards;
        uint8 numValidCards;

        // Make an array of decoded Card
        for (uint8 i = 0; i < _cards.length; i++) {
            validCards[i] = cardsDeck.decodeCard(_cards[i]);
            if (validCards[i].value != 0) {
                numValidCards++;
            }
        }

        // If there is just one card, return its value
        if (numValidCards == 1) {
            if (validCards[0].value < 10) {
                return validCards[0].value;
            } else {
                return 0; // Every figure alone is worth 10 points
            }
        }

        //Tere are at least two cards to compare
        uint8 envidoValue;

        // Check first and second card
        envidoValue = getEnvidoPointsForCardPair(validCards[0], validCards[1]);

        if (envidoValue > _envido) {
            _envido = envidoValue;
        }

        if (numValidCards == 2) {
            // There are just two cards, return the best envido
            return _envido;
        }

        // Check pending combinations with 3rd card

        // Check first and third card
        envidoValue = getEnvidoPointsForCardPair(validCards[0], validCards[2]);

        if (envidoValue > _envido) {
            _envido = envidoValue;
        }

        // Check second and third card
        envidoValue = getEnvidoPointsForCardPair(validCards[1], validCards[2]);

        if (envidoValue > _envido) {
            _envido = envidoValue;
        }

        return _envido;
    }

    function getEnvidoPointsForCardPair(
        ICardsDeck.Card memory card1,
        ICardsDeck.Card memory card2
    ) internal view returns (uint8) {
        // Check if cards are of the same suit, in that case return the number that's bigger
        if (card1.suit != card2.suit) {
            // Both figures
            if (card1.value >= 10 && card2.value >= 10) {
                return 0;
            }

            // Figure and number: return number
            if (card1.value >= 10 && card2.value < 10) {
                return card2.value;
            }
            if (card1.value < 10 && card2.value >= 10) {
                return card1.value;
            }

            // Both numbers, return greater
            if (card1.value > card2.value) {
                return card1.value;
            }

            return card2.value;
        }

        // Same suit

        // Check for both being figures
        if (card1.value >= 10 && card2.value >= 10) {
            return 20;
        }

        // Check if both are no figures
        if (card1.value < 10 && card2.value < 10) {
            return card1.value + card2.value + 20;
        }

        // Mixed case
        uint8 envidoValue = 20;

        // Check wich card is not
        if (card1.value < 10) {
            envidoValue += card1.value;
        }

        if (card2.value < 10) {
            envidoValue += card2.value;
        }

        return envidoValue;
    }

    // Determine if a given move is valid for a given game state
    function isMoveValid(
        IERC3333.GameState memory gameState,
        IERC3333.Move memory move
    ) external view returns (bool) {
        IERC3333.Challenge challenge = gameState.currentChallenge.challenge;

        // Poors man Finite State Machine (FSM) on Solidity times...
        if (move.action == IERC3333.Action.Resign) {
            //Any player can resign at any time
            return true;
        }

        if (challenge == IERC3333.Challenge.None) {
            return
                move.action == IERC3333.Action.PlayCard ||
                move.action == IERC3333.Action.Challenge;
        }

        if (
            challenge == IERC3333.Challenge.Truco ||
            challenge == IERC3333.Challenge.ReTruco ||
            challenge == IERC3333.Challenge.ValeCuatro
        ) {
            // Current player is not challenger, check if there's a response to enforce
            if (gameState.currentChallenge.waitingChallengeResponse) {
                if (canEnvidoBeSpelled(gameState)) {
                    // Check if envido can be spelled
                }
                return
                    move.action == IERC3333.Action.Challenge ||
                    move.action == IERC3333.Action.Response;
            }

            return
                move.action == IERC3333.Action.Response ||
                move.action == IERC3333.Action.PlayCard ||
                move.action == IERC3333.Action.Challenge;
        }

        if (
            challenge == IERC3333.Challenge.Envido ||
            challenge == IERC3333.Challenge.RealEnvido ||
            challenge == IERC3333.Challenge.EnvidoEnvido
        ) {
            return
                move.action == IERC3333.Action.Response ||
                move.action == IERC3333.Action.Challenge ||
                move.action == IERC3333.Action.EnvidoCount;
        }

        if (challenge == IERC3333.Challenge.FaltaEnvido) {
            return
                move.action == IERC3333.Action.Response ||
                move.action == IERC3333.Action.EnvidoCount;
        }

        return false;
    }
}
