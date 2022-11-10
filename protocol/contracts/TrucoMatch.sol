// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './trucoV1/interfaces/IERC3333.sol';
import './trucoV1/GameStateQueries.sol';

contract TrucoMatch {
    struct player {
        address playerAddress;
        uint256 tokensAtStake;
    }

    struct Match {
        player[2] players; // player 0 is the creator of the match
        IERC3333.GameState gameState;
        uint256 bet;
    }

    IERC3333 trucoEngine;
    GameStateQueries gameStateQueries;
    IERC20 truCoin;
    Match public currentMatch;
    bool isDealOpen;

    // Events
    event MatchCreated(address match_address);
    event MatchStarted(address player1, address player2, uint256 bet);
    event PlayerStaked(address player, uint256 tokensAtStake);
    event DealStarted(address shuffler);
    event DealEnded();

    modifier enforceTurnSwitching() {
        require(getPlayerIdx() == currentMatch.gameState.playerTurn);
        _;
        switchTurn();
    }

    constructor(
        IERC3333 _trucoEngine,
        IERC20 _truCoin,
        GameStateQueries _gameStateQueries,
        uint256 _bet
    ) {
        trucoEngine = _trucoEngine;
        truCoin = _truCoin;
        gameStateQueries = _gameStateQueries;
        currentMatch.bet = _bet;
        currentMatch.players[0].playerAddress = msg.sender;

        //Mint Sould Bound Token

        emit MatchCreated(address(this));
    }

    // Method for second player joining the match
    function join() public {
        require(
            currentMatch.players[0].playerAddress != msg.sender,
            'Match creator is already joined'
        );
        require(
            currentMatch.players[1].playerAddress == address(0),
            'Match is full'
        );

        // Check invitations if any

        currentMatch.players[1].playerAddress = msg.sender;

        // Make the user stake so he can not kidnap the match
        stake(1);
    }

    // Method for staking & starting the match
    function stake(uint8 _player) public {
        require(
            currentMatch.players[_player].playerAddress == msg.sender,
            'Player is not joined'
        );
        require(
            truCoin.balanceOf(msg.sender) >= currentMatch.bet,
            "You don't have enough Trucoins to stake this match"
        );
        require(
            truCoin.allowance(msg.sender, address(this)) >= currentMatch.bet,
            'Not enough trucoins transfer approved'
        );
        require(
            currentMatch.players[_player].tokensAtStake == 0,
            'You already staked this match'
        );

        // Transfer Trucoins from player to contract
        require(
            truCoin.transferFrom(msg.sender, address(this), currentMatch.bet),
            'Trucoin transfer failed'
        );

        currentMatch.players[_player].tokensAtStake = currentMatch.bet;

        // emit event
        emit PlayerStaked(msg.sender, currentMatch.bet);

        // Start match
        if (
            currentMatch.players[0].tokensAtStake == currentMatch.bet &&
            currentMatch.players[1].tokensAtStake == currentMatch.bet
        ) {
            currentMatch.gameState = trucoEngine.startGame();
            emit MatchStarted(
                currentMatch.players[0].playerAddress,
                currentMatch.players[1].playerAddress,
                currentMatch.bet
            );
        }
    }

    function newDeal() public {
        // Check if current game state enables new card shufflings
        require(!isDealOpen, 'Deal is already open');

        // Determine the new shuffler and check that corresponds to the current player
        uint8 new_shuffler = currentMatch.gameState.playerWhoShuffled ^ 1;
        require(
            msg.sender == currentMatch.players[new_shuffler].playerAddress,
            'You are not the shuffler'
        );

        // Grab the current points
        uint8[] memory current_points = currentMatch.gameState.teamPoints;

        // Reset the game state
        currentMatch.gameState = trucoEngine.initialGameState();

        // Set the current points
        currentMatch.gameState.teamPoints = current_points;

        // Assign new shuffler
        currentMatch.gameState.playerWhoShuffled = new_shuffler;

        // Assign turn to player not shuffling
        currentMatch.gameState.playerTurn = new_shuffler ^ 1;

        // Set deal as open
        isDealOpen = true;

        emit DealStarted(msg.sender);
    }

    // Get players addresses
    function getPlayers() public view returns (address[2] memory) {
        return [
            currentMatch.players[0].playerAddress,
            currentMatch.players[1].playerAddress
        ];
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
    function acceptChallengeForRaising() public  {
        require(getPlayerIdx() == currentMatch.gameState.playerTurn);

        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Response,
            uint8(IERC3333.Response.Accept)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function refuseChallenge() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = buildTransaction(
            IERC3333.Action.Response,
            uint8(IERC3333.Response.Refuse)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    // INTERNAL METHODS -------------------------------------------------------------------------

    // Change turn
    function switchTurn() internal {
        if (gameStateQueries.isGameEnded(currentMatch.gameState)) {
            // Game ended, do not switch turn
            return;
        }

        uint8 inversePlayer = currentMatch.gameState.playerTurn ^ 1;

        // if we are waiting for challenge response it should switch to opponent no matter what
        if (currentMatch.gameState.currentChallenge.waitingChallengeResponse) {
            currentMatch.gameState.playerTurn = inversePlayer;
        return;
        }

        uint8 playerWhoShouldPlayCard = gameStateQueries
            .whichPlayerShouldPlayCard(currentMatch.gameState);

        // If we're playing envido challenge apply specific logic
        if (
            gameStateQueries.isEnvidoChallenge(
                currentMatch.gameState.currentChallenge.challenge
            )
        ) {
            // If challenge was refused or envido ended we should fallback to the player who should play card
            if (
                currentMatch.gameState.currentChallenge.response ==
                IERC3333.Response.Refuse ||
                gameStateQueries.isEnvidoEnded(currentMatch.gameState)
            ) {
                currentMatch.gameState.playerTurn = playerWhoShouldPlayCard;
                return;
            }

            // Inverse player, since we are at spelling points stage
            currentMatch.gameState.playerTurn = inversePlayer;
            return;
        }

        // We are at a truco challenge (or None), so return which player should play card
        currentMatch.gameState.playerTurn = playerWhoShouldPlayCard;
    }

    function buildTransaction(IERC3333.Action _action, uint8 _param)
        internal
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
        if (msg.sender == currentMatch.players[0].playerAddress) {
            return 0;
        } else if (msg.sender == currentMatch.players[1].playerAddress) {
            return 1;
        }

        revert('You are not a player in this match');
    }
}
