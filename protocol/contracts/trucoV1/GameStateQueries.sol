// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

import './interfaces/ICardsDeck.sol';
import './resolvers/TrucoResolver.sol';
import './resolvers/EnvidoResolver.sol';

contract GameStateQueries is Initializable, OwnableUpgradeable {
    EnvidoResolver internal envidoResolver;
    TrucoResolver internal trucoResolver;
    ICardsDeck internal cardsDeck;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        TrucoResolver _trucoResolver,
        EnvidoResolver _envidoResolver,
        ICardsDeck _cardsDeck
    ) public initializer {
        __Ownable_init();
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

    function isGameEnded(IERC3333.GameState memory _gameState)
        external
        pure
        returns (bool)
    {
        return
            _gameState.teamPoints[0] >= _gameState.pointsToWin ||
            _gameState.teamPoints[1] >= _gameState.pointsToWin;
    }

    // Return wich player should be play next
    function whichPlayerShouldPlayCard(IERC3333.GameState memory gameState)
        external
        view
        returns (uint8)
    {
        uint8 roundAtPlay = trucoResolver.roundAtPlay(gameState);
        uint8 playerMano = gameState.playerWhoShuffled ^ 1;

        // Truco is being played
        if (trucoResolver.roundEmpty(gameState, roundAtPlay)) {
            if (roundAtPlay == 0) {
                // First round, no player played yet. Mano should play first
                return playerMano;
            }

            int8 roundWinner = trucoResolver.roundWinner(
                gameState.revealedCardsByPlayer,
                roundAtPlay - 1
            );

            // Check if it was a draw, in that case the player who is mano should play first
            if (roundWinner < 0) {
                return playerMano;
            }

            // Previous round winnner should play first
            return uint8(roundWinner);
        }

        // If the round is not empty, the player who is left to play should play next
        return trucoResolver.getPlayerTurnAtRound(gameState, roundAtPlay);
    }

    function isTrucoEnded(IERC3333.GameState memory gameState)
        external
        view
        returns (bool)
    {
        if (
            this.isEnvidoChallenge(gameState.currentChallenge.challenge) ==
            false
        ) {
            return trucoResolver.isFinal(gameState);
        }

        // Envido is still playing
        return false;
    }

    // Should be called only if truco is final, else will fail
    function getTrucoWinner(IERC3333.GameState memory gameState)
        external
        view
        returns (uint8)
    {
        return trucoResolver.getWinner(gameState);
    }

    // Should be called only if envido is final, else will fail
    function getEnvidoWinner(IERC3333.GameState memory gameState)
        external
        view
        returns (uint8)
    {
        return envidoResolver.getWinner(gameState);
    }

    function isEnvidoChallenge(IERC3333.Challenge _challenge)
        external
        view
        returns (bool)
    {
        return envidoResolver.canResolve(_challenge);
    }

    function isEnvidoEnded(IERC3333.GameState memory gameState)
        external
        view
        returns (bool)
    {
        return envidoResolver.isFinal(gameState);
    }

    // Check if both players have played their envido count
    function envidoPointsCountWereSpelled(IERC3333.GameState memory _gameState)
        external
        view
        returns (bool)
    {
        return
            this.envidoPointsCountWereSpelledForPlayer(_gameState, 0) &&
            this.envidoPointsCountWereSpelledForPlayer(_gameState, 1);
    }

    // Check if both players have played their envido count
    function envidoPointsCountWereSpelledForPlayer(
        IERC3333.GameState memory _gameState,
        uint8 _player
    ) external view returns (bool) {
        return
            envidoResolver.validEnvido(_gameState.envido.playerCount[_player]);
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
        envidoValue = _getEnvidoPointsForCardPair(validCards[0], validCards[1]);

        if (envidoValue > _envido) {
            _envido = envidoValue;
        }

        if (numValidCards == 2) {
            // There are just two cards, return the best envido
            return _envido;
        }

        // Check pending combinations with 3rd card

        // Check first and third card
        envidoValue = _getEnvidoPointsForCardPair(validCards[0], validCards[2]);

        if (envidoValue > _envido) {
            _envido = envidoValue;
        }

        // Check second and third card
        envidoValue = _getEnvidoPointsForCardPair(validCards[1], validCards[2]);

        if (envidoValue > _envido) {
            _envido = envidoValue;
        }

        return _envido;
    }

    // Check if envido can be spelled at this game
    function cardsShouldBeRevealedForEnvido(
        IERC3333.GameState memory _gameState
    ) public view returns (bool) {
        if (!envidoResolver.isFinal(_gameState)) {
            return false;
        }

        // Check if it was a refusal (no points by any party should be spelled)
        if (!envidoResolver.validEnvido(_gameState.envido.playerCount[0])) {
            return false;
        }

        // There should be a winner, since envido is final and envido count was spelled
        uint8 envidoWinner = envidoResolver.getWinner(_gameState);

        // Check for unmasked cards in the revealed cards array
        uint8 numRevealedCards = 0;
        for (uint8 i = 0; i <= 2; i++) {
            if (
                _gameState.revealedCardsByPlayer[envidoWinner][i] !=
                cardsDeck.maskedCardId()
            ) {
                numRevealedCards++;
            }
        }

        // No revealed cards at the table, winner should reveal
        if (numRevealedCards == 0) {
            return true;
        }

        // Now build a dynamic array with revealed cards by envido winner to check if envido matchs, so in that case
        // no extra cards need to be revealed
        uint8[] memory envidoWinnerCards = new uint8[](numRevealedCards);

        // Since cards are revaled in consecutive order all unmasked cards should start at index 0 and be contiguous
        for (uint8 i = 0; i < numRevealedCards; i++) {
            envidoWinnerCards[i] = _gameState.revealedCardsByPlayer[
                envidoWinner
            ][i];
        }

        // If envido from revealed cards does not match the envido from the challenge, cards should be revealed
        if (
            getEnvidoPointsForCards(envidoWinnerCards) !=
            _gameState.envido.playerCount[envidoWinner]
        ) {
            return true;
        }

        return false;
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
                if (_canEnvidoBeSpelled(gameState)) {
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

    function getGameWinner(IERC3333.GameState memory gameState)
        public
        view
        returns (uint8)
    {
        require(this.isGameEnded(gameState), 'Game is not ended');
        // Check if there's a winner
        if (gameState.teamPoints[0] >= gameState.pointsToWin) {
            return 0;
        }

        return 1;
    }

    // Check if envido can be spelled at this game
    function _canEnvidoBeSpelled(IERC3333.GameState memory gameState)
        internal
        view
        returns (bool)
    {
        return
            !envidoResolver.isFinal(gameState) &&
            !trucoResolver.roundComplete(gameState, 0);
    }

    function _getEnvidoPointsForCardPair(
        ICardsDeck.Card memory card1,
        ICardsDeck.Card memory card2
    ) internal pure returns (uint8) {
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
}
