// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./interfaces/Structs.sol";
import "./interfaces/IChallengeResolver.sol";
import "./interfaces/ICardsDeck.sol";

contract EngineQueries  {
    IChallengeResolver internal envidoResolver;
    IChallengeResolver internal trucoResolver;
    ICardsDeck internal cardsDeck;

    constructor(IChallengeResolver _trucoResolver, IChallengeResolver _envidoResolver, ICardsDeck _cardsDeck) {
        envidoResolver = _envidoResolver;
        trucoResolver = _trucoResolver;
        cardsDeck = _cardsDeck;
    }

    function isMoveAChallengeForEnvido(CardsStructs.Move memory _move)
        external
        view
        returns (bool)
    {
        if (_move.action != CardsStructs.Action.Challenge) {
            return false;
        }
        return
            envidoResolver.canResolve(
                CardsStructs.Challenge(_move.parameters[0])
            );
    }

    function isMoveAChallengeForTruco(CardsStructs.Move memory _move)
        external
        view
        returns (bool)
    {
        if (_move.action != CardsStructs.Action.Challenge) {
            return false;
        }
        return
            trucoResolver.canResolve(
                CardsStructs.Challenge(_move.parameters[0])
            );
    }


    function isGameEnded(CardsStructs.GameState memory gameState)
        external
        view
        returns (bool)
    {
        // Implement this
        return false;
    }

    // Check if envido can be spelled at this game
    function canEnvidoBeSpelled(CardsStructs.GameState memory gameState)
        internal
        view
        returns (bool)
    {
        return
            ! envidoResolver.isFinal(gameState) &&
            ( gameState.revealedCardsByPlayer[0][0]== 0 || gameState.revealedCardsByPlayer[1][0]== 0);
    }


    // Get envido points of a given set of cards
    function getEnvidoPointsForCards(uint8[] memory _cards)
    public
    view
    returns (uint8 _envido)
    {
        require (_cards.length <= 3, "Invalid number of cards");

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
                return 10; // Every figure alone is worth 10 points
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

    function getEnvidoPointsForCardPair(ICardsDeck.Card memory card1, ICardsDeck.Card memory card2 )
    internal view
    returns (uint8) {

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
        CardsStructs.GameState memory gameState,
        CardsStructs.Move memory move
    ) external view returns (bool) {
        CardsStructs.Challenge challenge = gameState.currentChallenge.challenge;

        // Poors man Finite State Machine (FSM) on Solidity times...
        if (move.action == CardsStructs.Action.Resign) {
            //Any player can resign at any time
            return true;
        }

        if (challenge == CardsStructs.Challenge.None) {
            return
                move.action == CardsStructs.Action.PlayCard ||
                move.action == CardsStructs.Action.Challenge;
        }

        if (
            challenge == CardsStructs.Challenge.Truco ||
            challenge == CardsStructs.Challenge.ReTruco ||
            challenge == CardsStructs.Challenge.ValeCuatro
        ) {
            // Current player is not challenger, check if there's a response to enforce
            if (gameState.currentChallenge.waitingChallengeResponse) {
                if (canEnvidoBeSpelled(gameState)) {
                    // Check if envido can be spelled
                }
                return
                    move.action == CardsStructs.Action.Challenge ||
                    move.action == CardsStructs.Action.Response;
            }

            return
                move.action == CardsStructs.Action.Response ||
                move.action == CardsStructs.Action.PlayCard ||
                move.action == CardsStructs.Action.Challenge;
        }

        if (
            challenge == CardsStructs.Challenge.Envido ||
            challenge == CardsStructs.Challenge.RealEnvido ||
            challenge == CardsStructs.Challenge.EnvidoEnvido
        ) {
            return
                move.action == CardsStructs.Action.Response ||
                move.action == CardsStructs.Action.Challenge ||
                move.action == CardsStructs.Action.EnvidoCount;
        }

        if (challenge == CardsStructs.Challenge.FaltaEnvido) {
            return
                move.action == CardsStructs.Action.Response ||
                move.action == CardsStructs.Action.EnvidoCount;
        }

        return false;
    }
}
