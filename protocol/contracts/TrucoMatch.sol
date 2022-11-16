// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './trucoV1/interfaces/IERC3333.sol';
import './trucoV1/GameStateQueries.sol';
import './token/TrucoChampionsToken.sol';

contract TrucoMatch {
    enum MatchStateEnum {
        WAITING_FOR_PLAYERS,
        WAITING_FOR_DEAL,
        WAITING_FOR_PLAY,
        WAITING_FOR_REVEAL,
        FINISHED
    }

    struct MatchState {
        uint8 dealNonce;
        MatchStateEnum state;
    }

    struct Match {
        address[2] players; // player 0 is the creator of the match
        IERC3333.GameState gameState;
        uint256 bet;
    }

    IERC3333 trucoEngine;
    GameStateQueries gameStateQueries;
    IERC20 truCoin;
    TrucoChampionsToken TCT;
    Match public currentMatch;
    MatchState public matchState;

    // Events
    event MatchCreated(address indexed match_address, uint256 bet);
    event MatchStarted(
        address indexed player1,
        address indexed player2,
        uint256 bet
    );
    event NewDeal(address shuffler);
    event TurnSwitch(address indexed playerTurn);

    modifier enforceTurnSwitching() {
        require(
            getPlayerIdx() == currentMatch.gameState.playerTurn,
            'Not your turn'
        );
        require(
            matchState.state == MatchStateEnum.WAITING_FOR_PLAY,
            'State is not WAITING_FOR_PLAY'
        );
        _;
        if (switchTurn()) {
            // Turn switched
            emit TurnSwitch(
                currentMatch.players[currentMatch.gameState.playerTurn]
            );
        }
        updateMatchState();
    }

    constructor(
        IERC3333 _trucoEngine,
        IERC20 _truCoin,
        TrucoChampionsToken _TCT,
        GameStateQueries _gameStateQueries,
        address player1,
        uint256 _bet
    ) {
        trucoEngine = _trucoEngine;
        truCoin = _truCoin;
        TCT = _TCT;
        gameStateQueries = _gameStateQueries;
        currentMatch.bet = _bet;
        currentMatch.players[0] = player1;

        matchState.state = MatchStateEnum.WAITING_FOR_PLAYERS;

        emit MatchCreated(address(this), _bet);
    }

    // Method for second player joining the match
    function join() public {
        // First player is joined at contract creation, so he is not allowed to join again
        require(
            currentMatch.players[0] != msg.sender,
            'Match creator is already joined'
        );
        // If second player is already set match is full
        require(currentMatch.players[1] == address(0), 'Match is full');
        // Transfer Trucoins from player to contract
        require(
            truCoin.transferFrom(msg.sender, address(this), currentMatch.bet),
            'ERC20: insufficient allowance'
        );
        // Transfer fees to trucoEngine
        bool result = truCoin.approve(
            address(trucoEngine),
            trucoEngine.getFees()
        );
        require(result, 'Approval failed');

        // Set second player
        currentMatch.players[1] = msg.sender;

        // Change match status
        matchState.state = MatchStateEnum.WAITING_FOR_DEAL;

        // Start match
        currentMatch.gameState = trucoEngine.startGame();

        emit MatchStarted(
            currentMatch.players[0],
            currentMatch.players[1],
            currentMatch.bet
        );
    }

    function newDeal() public {
        // Check if current game state enables new card shufflings
        require(
            matchState.state == MatchStateEnum.WAITING_FOR_DEAL,
            'Deal not allowed'
        );

        // Determine the new shuffler and check that corresponds to the current player
        uint8 new_shuffler = currentMatch.gameState.playerWhoShuffled ^ 1;

        // Check that the player who is calling the function is the new shuffler, avoid if it's first shuffle
        if (matchState.dealNonce > 0) {
            require(
                msg.sender == currentMatch.players[new_shuffler],
                'You are not the shuffler'
            );
        }

        // Grab the current points
        uint8[] memory current_points = currentMatch.gameState.teamPoints;

        // Reset the game state
        currentMatch.gameState = trucoEngine.initialGameState();

        // Set the current points
        currentMatch.gameState.teamPoints = current_points;

        // Assign new shuffler
        currentMatch.gameState.playerWhoShuffled = getPlayerIdx();

        // Assign turn to player not shuffling
        currentMatch.gameState.playerTurn =
            currentMatch.gameState.playerWhoShuffled ^
            1;

        // Update state and deal nonce
        matchState.state = MatchStateEnum.WAITING_FOR_PLAY;
        matchState.dealNonce++;

        emit NewDeal(msg.sender);
    }

    // Applies the points awarded from round if it's final
    function addPointsFromRoundIfApply() internal {
        // Check for envido accepted challenge points
        if (
            currentMatch.gameState.envido.pointsRewarded > 0 &&
            gameStateQueries.envidoPointsCountWereSpelled(
                currentMatch.gameState
            )
        ) {
            // Envido points to apply that were resolved from an Accepted envido challenge (refusal points are handled
            // on refusal move processing at current match level
            uint8 envidoWinner = gameStateQueries.getEnvidoWinner(
                currentMatch.gameState
            );
            currentMatch.gameState.teamPoints[envidoWinner] += currentMatch
                .gameState
                .envido
                .pointsRewarded;
        }

        // Check for truco points
        uint8 trucoWinner = gameStateQueries.getTrucoWinner(
            currentMatch.gameState
        );
        currentMatch.gameState.teamPoints[trucoWinner] += currentMatch
            .gameState
            .currentChallenge
            .pointsAtStake;
    }

    // Get players addresses
    function getPlayers() public view returns (address[2] memory) {
        return [currentMatch.players[0], currentMatch.players[1]];
    }

    function spellTruco() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.Truco)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellReTruco() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.ReTruco)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellValeCuatro() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.ValeCuatro)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function playCard(uint8 _card) public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.PlayCard,
            _card
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellEnvido() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.Envido)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellEnvidoEnvido() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.EnvidoEnvido)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellRealEnvido() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.RealEnvido)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellFaltaEnvido() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.FaltaEnvido)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellEnvidoCount(uint8 _points) public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.EnvidoCount,
            _points
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    // Accepts challenge and switches turn
    function acceptChallenge() public enforceTurnSwitching {
        acceptChallengeForRaising();
    }

    // Accept for raising, do not switch turn
    function acceptChallengeForRaising() public {
        require(getPlayerIdx() == currentMatch.gameState.playerTurn);

        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Response,
            uint8(IERC3333.Response.Accept)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function refuseChallenge() public enforceTurnSwitching {
        bool isEnvido = gameStateQueries.isEnvidoChallenge(
            currentMatch.gameState.currentChallenge.challenge
        );

        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Response,
            uint8(IERC3333.Response.Refuse)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);

        // Check if Envido was refused, in that case we should assign points to the challenger rightaway
        if (isEnvido) {
            uint8 envidoChalleger = currentMatch
                .gameState
                .currentChallenge
                .challenger;
            currentMatch.gameState.teamPoints[envidoChalleger] += currentMatch
                .gameState
                .envido
                .pointsRewarded;
        }
    }

    // INTERNAL METHODS -------------------------------------------------------------------------

    // Change turn
    function switchTurn() internal returns (bool) {
        if (trucoEngine.isGameEnded(currentMatch.gameState)) {
            // Game ended, do not switch turn
            return false;
        }

        if (gameStateQueries.isTrucoEnded(currentMatch.gameState)) {
            // Round ended, do not switch turn
            return false;
        }

        uint8 inversePlayer = currentMatch.gameState.playerTurn ^ 1;

        // if we are waiting for challenge response it should switch to opponent no matter what
        if (currentMatch.gameState.currentChallenge.waitingChallengeResponse) {
            currentMatch.gameState.playerTurn = inversePlayer;
            return true;
        }

        uint8 playerWhoShouldPlayCard = gameStateQueries
            .whichPlayerShouldPlayCard(currentMatch.gameState);

        // VERY SPECIFIC CORNER CASE
        // Stage: Envido / Point counting stage
        // IF the player who should play card (mano) already spelled the points so it be needed to switch turn, if not
        // since player is mano should always spell first and turn shouldn't switch (should never enter this if statement)
        if (
            gameStateQueries.isEnvidoChallenge(
                currentMatch.gameState.currentChallenge.challenge
            ) &&
            gameStateQueries.envidoPointsCountWereSpelled(
                currentMatch.gameState
            ) ==
            false &&
            gameStateQueries.envidoPointsCountWereSpelledForPlayer(
                currentMatch.gameState,
                playerWhoShouldPlayCard
            )
        ) {
            currentMatch.gameState.playerTurn = inversePlayer;
            return true;
        }

        bool playerSwitched = playerWhoShouldPlayCard !=
            currentMatch.gameState.playerTurn;

        // We are at a truco challenge (or None), so return which player should play card
        currentMatch.gameState.playerTurn = playerWhoShouldPlayCard;
        return playerSwitched;
    }

    function updateMatchState() internal {
        if (trucoEngine.isGameEnded(currentMatch.gameState)) {
            matchState.state = MatchStateEnum.FINISHED;
            return;
        }

        // Check if current round is finished, signal that a new shuffle is needed to start playing again
        if (gameStateQueries.isTrucoEnded(currentMatch.gameState)) {
            // Check if an envido winner has to reveal cards
            if (
                gameStateQueries.cardsShouldBeRevealedForEnvido(
                    currentMatch.gameState
                )
            ) {
                matchState.state = MatchStateEnum.WAITING_FOR_REVEAL;
                return;
            }

            // Add points to match counter from this closing round
            addPointsFromRoundIfApply();

            matchState.state = MatchStateEnum.WAITING_FOR_DEAL;
            return;
        }

        matchState.state = MatchStateEnum.WAITING_FOR_PLAY;
    }

    function buildTransaction(IERC3333.Action _action, uint8 _param)
        internal
        view
        returns (IERC3333.Transaction memory)
    {
        uint8[] memory params = new uint8[](1);
        params[0] = _param;

        IERC3333.Move memory move;
        move.action = _action;
        move.parameters = params;

        IERC3333.Move[] memory moves = new IERC3333.Move[](1);
        moves[0] = move;

        IERC3333.Transaction memory transaction;
        transaction.playerIdx = getPlayerIdx();
        transaction.state = currentMatch.gameState;
        transaction.moves = moves;

        return transaction;
    }

    function getPlayerIdx() internal view returns (uint8) {
        if (msg.sender == currentMatch.players[0]) {
            return 0;
        } else if (msg.sender == currentMatch.players[1]) {
            return 1;
        }

        revert('You are not a player in this match');
    }
}
