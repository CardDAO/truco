// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

import '../interfaces/IChallengeResolver.sol';

contract EnvidoResolver is IChallengeResolver, OwnableUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init();
    }

    function resolve(
        IERC3333.GameState memory _gameState,
        IERC3333.Move memory _move
    ) external view returns (IERC3333.GameState memory) {
        // Valid moves up to this point are enforced before any logic
        require(
            _move.action == IERC3333.Action.Challenge ||
                _move.action == IERC3333.Action.Response ||
                _move.action == IERC3333.Action.EnvidoCount
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

        // 1) Check if action is a challenge or a "rising" (i.e: Envido -> Real Envido! / Envido -> Falta Envido!) or challenge mismatch
        if (_move.action == IERC3333.Action.Challenge) {
            // Preconditions:
            // - Previous challenge was accepted
            // - Player is not the challenger
            // - Challenger shouldn't have played a card
            // - No points were previously spoken
            // - Haven't reach maximum challenges spelled

            // Check challenger only if it's a raise (comes from a state of no current challenge)
            if (
                _gameState.currentChallenge.challenge != IERC3333.Challenge.None
            ) {
                require(
                    _gameState.playerTurn !=
                        _gameState.currentChallenge.challenger
                );
            }

            // PLayer can't challenge if he already played a card
            require(
                _gameState.revealedCardsByPlayer[_gameState.playerTurn][0] == 0
            );

            // Envido count should not be spelled for any player
            require(
                validEnvido(
                    _gameState.envido.playerCount[_gameState.playerTurn]
                ) ==
                    false &&
                    validEnvido(
                        _gameState.envido.playerCount[
                            _reversePlayer(_gameState.playerTurn)
                        ]
                    ) ==
                    false
            );

            require(
                _gameState.currentChallenge.challenge !=
                    IERC3333.Challenge.FaltaEnvido,
                "FaltaEnvido can't be rised"
            );

            IERC3333.Challenge newChallenge = IERC3333.Challenge(
                _move.parameters[0]
            );

            require(
                newChallenge > _gameState.currentChallenge.challenge,
                "Can't rise a challenge with a lower value"
            );

            // Since envido is being spelled, state should be set accordingly
            _gameState.envido.spelled = true;

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

            _gameState.currentChallenge.response = response;
            _gameState.currentChallenge.waitingChallengeResponse = false;
            _gameState.currentChallenge.pointsAtStake;

            // If response is a refusal, the challenge is over
            if (response == IERC3333.Response.Refuse) {
                // Reward points to the challenger
                _gameState.envido.pointsRewarded = _gameState
                    .currentChallenge
                    .pointsAtStake;

                // Reset current challenge
                _gameState = _resetChallenge(_gameState);

                return _gameState;
            }

            // At this point we assume response is an acceptance

            // If current points at stake is equal to 1, it means that no previous challenge was accepted. In this case
            // we should override the points at stake with the new challenge points
            // Also, when playing "FaltaEnvido" points at stake are equal to challenge derived points. All other points should
            // be overridden
            if (
                _gameState.currentChallenge.pointsAtStake == 1 ||
                _gameState.currentChallenge.challenge ==
                IERC3333.Challenge.FaltaEnvido
            ) {
                _gameState.currentChallenge.pointsAtStake = _pointsPerChallenge(
                    _gameState.currentChallenge.challenge,
                    _gameState
                );

                return _gameState;
            }

            // Previous challenge was accepted, so we should add the new challenge points to the current points at stake
            _gameState.currentChallenge.pointsAtStake += _pointsPerChallenge(
                _gameState.currentChallenge.challenge,
                _gameState
            );

            return _gameState;
        }

        // 3) Envido point count:
        if (_move.action == IERC3333.Action.EnvidoCount) {
            // Preconditions:
            // - Challenge should have been accepted by other party
            // - Check if i'm in place for spelling my points (i am "mano") or by contrary it's other players turn
            require(
                _gameState.currentChallenge.waitingChallengeResponse == false
            );

            require(
                _gameState.currentChallenge.response == IERC3333.Response.Accept
            );

            // Check if player is in place for spelling his points: if it's not "mano" then other
            // player should have spelled it's points
            if (
                _gameState.playerTurn ==
                _gameState.currentChallenge.challenger &&
                _gameState.playerTurn == _gameState.playerWhoShuffled
            ) {
                // Current player challenged envido, so we must ensure other player already cast it's envido count
                require(
                    validEnvido(
                        _gameState.envido.playerCount[
                            _reversePlayer(_gameState.playerTurn)
                        ]
                    )
                );
                require(
                    validEnvido(
                        _gameState.envido.playerCount[_gameState.playerTurn]
                    ) == false
                );
            }

            // Check envido count is valid
            require(validEnvido(_move.parameters[0]), 'Invalid envido count');

            //Do envido count
            uint8 envidoCount = _move.parameters[0];
            _gameState.envido.playerCount[_gameState.playerTurn] = envidoCount;

            if (_isEnvidoCountFinished(_gameState)) {
                // If game is final, we should reward points to the winner
                _gameState.envido.pointsRewarded = _gameState
                    .currentChallenge
                    .pointsAtStake;

                // Reset current challenge
                _gameState = _resetChallenge(_gameState);
            }

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
            _challenge == IERC3333.Challenge.Envido ||
            _challenge == IERC3333.Challenge.RealEnvido ||
            _challenge == IERC3333.Challenge.EnvidoEnvido ||
            _challenge == IERC3333.Challenge.FaltaEnvido
        ) {
            return true;
        }

        return false;
    }

    function isFinal(IERC3333.GameState memory _gameState)
        external
        view
        returns (bool)
    {
        // Check if points were already rewarded
        if (_gameState.envido.pointsRewarded > 0) {
            return true;
        }

        if (_gameState.envido.spelled == false) {
            return false;
        }

        if (_isEnvidoCountFinished(_gameState)) {
            return true;
        }

        if (this.canResolve(_gameState.currentChallenge.challenge) == false) {
            return false;
        }

        if (_gameState.currentChallenge.waitingChallengeResponse == true) {
            return false;
        }

        return _gameState.currentChallenge.response == IERC3333.Response.Refuse;
    }

    function getWinner(IERC3333.GameState memory _gameState)
        external
        view
        returns (uint8)
    {
        require(this.isFinal(_gameState));

        // If challenge was refused, the challenger won
        if (_gameState.currentChallenge.response == IERC3333.Response.Refuse) {
            return _gameState.currentChallenge.challenger;
        }

        // At this point we can assume challenge was accepted

        // If the same points for envido were spoken by all players, "mano" won (the opponent of the deck shuffler)
        if (
            _gameState.envido.playerCount[_gameState.playerTurn] ==
            _gameState.envido.playerCount[_reversePlayer(_gameState.playerTurn)]
        ) {
            return _reversePlayer(_gameState.playerWhoShuffled);
        }

        // Last but not least: the player with the highest envido count wins
        if (
            _gameState.envido.playerCount[_gameState.playerTurn] >
            _gameState.envido.playerCount[_reversePlayer(_gameState.playerTurn)]
        ) {
            return _gameState.playerTurn;
        }

        return _reversePlayer(_gameState.playerTurn);
    }

    // Check if envido count is valid, if not it means that player didn't spell it's points
    function validEnvido(uint8 _envidoCount) public pure returns (bool) {
        return _envidoCount >= 0 && _envidoCount <= 33;
    }

    function _reversePlayer(uint8 _player) internal pure returns (uint8) {
        return _player ^ 1;
    }

    // Return points that should be at stake for a given challenge
    function _pointsPerChallenge(
        IERC3333.Challenge challenge,
        IERC3333.GameState memory _gameState
    ) internal pure returns (uint8) {
        if (
            challenge == IERC3333.Challenge.Envido ||
            challenge == IERC3333.Challenge.EnvidoEnvido
        ) {
            return 2;
        }

        if (challenge == IERC3333.Challenge.RealEnvido) {
            return 3;
        }

        if (challenge == IERC3333.Challenge.FaltaEnvido) {
            if (_gameState.teamPoints[0] >= _gameState.teamPoints[1]) {
                return _gameState.pointsToWin - _gameState.teamPoints[0];
            }

            return _gameState.pointsToWin - _gameState.teamPoints[1];
        }

        revert('Invalid challenge');
    }

    function _isEnvidoCountFinished(IERC3333.GameState memory _gameState)
        internal
        pure
        returns (bool)
    {
        if (
            validEnvido(_gameState.envido.playerCount[_gameState.playerTurn]) &&
            validEnvido(
                _gameState.envido.playerCount[
                    _reversePlayer(_gameState.playerTurn)
                ]
            )
        ) {
            return true;
        }

        return false;
    }

    function _resetChallenge(IERC3333.GameState memory _gameState)
        internal
        pure
        returns (IERC3333.GameState memory)
    {
        _gameState.currentChallenge.challenge = IERC3333.Challenge.None;
        _gameState.currentChallenge.waitingChallengeResponse = false;
        _gameState.currentChallenge.pointsAtStake = 1;
        _gameState.currentChallenge.response = IERC3333.Response.None;

        return _gameState;
    }
}
