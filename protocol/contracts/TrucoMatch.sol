// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './trucoV1/interfaces/IERC3333.sol';
import './trucoV1/GameStateQueries.sol';
import './token/TrucoChampionsToken.sol';
import './IV/SignatureValidation.sol';

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
    using SignatureValidation for bytes32;

    // Events
    event MatchCreated(address indexed match_address, uint256 bet);
    event MatchStarted(
        address indexed player1,
        address indexed player2,
        uint256 bet
    );
    event NewDeal(address shuffler);
    event NewDealRequired(address newShuffler, uint8 nextNonce);
    event TurnSwitch(address indexed playerTurn);
    event MatchFinished(
        address indexed winner,
        uint8 winnerScore,
        address indexed loser,
        uint8 loserScore,
        uint256 bet
    );

    modifier enforceTurnSwitching() {
        require(
            _getPlayerIdx() == currentMatch.gameState.playerTurn,
            'Not your turn'
        );
        require(
            matchState.state == MatchStateEnum.WAITING_FOR_PLAY,
            'State is not WAITING_FOR_PLAY'
        );
        _;
        if (_switchTurn()) {
            // Turn switched
            emit TurnSwitch(
                currentMatch.players[currentMatch.gameState.playerTurn]
            );
        }
        _updateMatchState();
        _addPointsFromRoundIfApply();
        _finishMatchIfApply();
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
        _changeMatchStateToWaitingForDeal();

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
        currentMatch.gameState.playerWhoShuffled = _getPlayerIdx();

        // Assign turn to player not shuffling
        currentMatch.gameState.playerTurn =
            currentMatch.gameState.playerWhoShuffled ^
            1;

        // Update state and deal nonce
        matchState.state = MatchStateEnum.WAITING_FOR_PLAY;
        matchState.dealNonce++;

        emit NewDeal(msg.sender);
    }

    // Get players addresses
    function getPlayers() public view returns (address[2] memory) {
        return [currentMatch.players[0], currentMatch.players[1]];
    }

    function resign() public enforceTurnSwitching {
        _changeMatchStateToWaitingForDeal();

        // Check if player is resigning while an Envido is at play
        if (
            gameStateQueries.isEnvidoChallenge(
                currentMatch.gameState.currentChallenge.challenge
            )
        ) {
            // Challenger gets points at stake plus 1 point for truco
            currentMatch.gameState.teamPoints[
                currentMatch.gameState.currentChallenge.challenger
            ] += currentMatch.gameState.currentChallenge.pointsAtStake + 1;
            return;
        }

        // Check if an accepted envido was played (refusal points are handled on refusal move processing at current match level)
        _addEnvidoPointsOnlyForAcceptedChallenge();

        // We should update the match state manually because modifier enforceTurnSwitching won't kick in since it's a resign
        _changeMatchStateToWaitingForRevealIfApplies();

        _addTrucoPoints(true);
    }

    // IV signature proof method
    function revealCards(uint8[] memory _cards, bytes memory signature)
        public
        virtual
    {
        _validateSignature(
            getCardProofToForSigning(msg.sender, _cards),
            signature
        );
        _revealCards(_cards);
    }

    function spellTruco() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = _buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.Truco)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellReTruco() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = _buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.ReTruco)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellValeCuatro() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = _buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.ValeCuatro)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    // IV signature proof method
    function playCard(uint8 _card, bytes memory signature)
        public
        virtual
        enforceTurnSwitching
    {
        uint8[] memory cards = new uint8[](1);
        cards[0] = _card;

        _validateSignature(
            getCardProofToForSigning(msg.sender, cards),
            signature
        );
        _playCard(_card);
    }

    function spellEnvido() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = _buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.Envido)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellEnvidoEnvido() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = _buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.EnvidoEnvido)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellRealEnvido() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = _buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.RealEnvido)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellFaltaEnvido() public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = _buildTransaction(
            IERC3333.Action.Challenge,
            uint8(IERC3333.Challenge.FaltaEnvido)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function spellEnvidoCount(uint8 _points) public enforceTurnSwitching {
        IERC3333.Transaction memory transaction = _buildTransaction(
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
        require(_getPlayerIdx() == currentMatch.gameState.playerTurn);

        IERC3333.Transaction memory transaction = _buildTransaction(
            IERC3333.Action.Response,
            uint8(IERC3333.Response.Accept)
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    function refuseChallenge() public enforceTurnSwitching {
        bool isEnvido = gameStateQueries.isEnvidoChallenge(
            currentMatch.gameState.currentChallenge.challenge
        );

        IERC3333.Transaction memory transaction = _buildTransaction(
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

    function getCardProofToForSigning(
        address _playerAddress,
        uint8[] memory _cards
    ) public view returns (bytes32) {
        require(
            _cards.length > 0 && _cards.length <= 3,
            'Invalid number of cards'
        );
        require(
            _playerAddress == currentMatch.players[0] ||
                _playerAddress == currentMatch.players[1],
            'Address is not a player in this match'
        );

        return keccak256(_getCardsString(_playerAddress, _cards));
    }

    // INTERNAL METHODS -------------------------------------------------------------------------

    // Get cards abi encoded representation for cards to sign
    // IV template:
    // revealedCards:<player_address>:<match_address>:<shuffling_nonce>:<card1>:<card2>:... etc
    function _getCardsString(address _playerAddress, uint8[] memory _cards)
        internal
        view
        returns (bytes memory)
    {
        bytes memory encodedCards;

        for (uint8 i = 0; i < _cards.length; i++) {
            encodedCards = abi.encodePacked(encodedCards, ':', _cards[i]);
        }

        bytes memory sigToHash = abi.encodePacked(
            'revealedCards:',
            _playerAddress,
            ':',
            address(this),
            ':',
            matchState.dealNonce,
            encodedCards
        );

        return sigToHash;
    }

    function _playCard(uint8 _card) internal enforceTurnSwitching {
        IERC3333.Transaction memory transaction = _buildTransaction(
            IERC3333.Action.PlayCard,
            _card
        );
        currentMatch.gameState = trucoEngine.transact(transaction);
    }

    // This method should be called only from envido winner and if it's waiting for cards to be revealed
    function _revealCards(uint8[] memory _cards) internal {
        require(
            matchState.state == MatchStateEnum.WAITING_FOR_REVEAL,
            'State is not WAITING_FOR_REVEAL'
        );
        require(
            _cards.length >= 1 && _cards.length <= 3,
            'You can only reveal 3 cards at most'
        );

        uint8 envidoWinner = gameStateQueries.getEnvidoWinner(
            currentMatch.gameState
        );

        require(_getPlayerIdx() == envidoWinner, 'Not envido winner');

        uint8 envidoCountFromPlayerCards = gameStateQueries
            .getEnvidoPointsForCards(_cards);

        require(
            envidoCountFromPlayerCards ==
                currentMatch.gameState.envido.playerCount[envidoWinner],
            'Envido count from cards does not match'
        );

        // At this points cards were reveled ok, match state shouuld be reset
        _changeMatchStateToWaitingForDeal();

        // Since modifier cannot be used in this function we need to manually trigger envido points settlement
        _addEnvidoPointsOnlyForAcceptedChallenge();

        // Needed to check for game finality after reveal, crucial that state is switched away from WAITING_FOR_REVEAL to work
        _updateMatchState();
    }

    // Applies the points awarded from round if it's final
    function _addPointsFromRoundIfApply() internal {
        if (matchState.state != MatchStateEnum.WAITING_FOR_DEAL) {
            return;
        }

        // If invoked function is resign we should not assign points since it was resolved at resign function
        if (_getCalledFunctionSelector() == bytes4(0x69652fcf)) {
            // '69652fcf' is the hash of the function 'resign' (with no arguments)
            // used https://abi.hashex.org/ to get the hash
            return;
        }

        // Envido points
        _addEnvidoPointsOnlyForAcceptedChallenge();

        // If game ended return
        if (trucoEngine.isGameEnded(currentMatch.gameState)) {
            _updateMatchState(); // update state to finished match
            return;
        }

        // Truco points (false params since user it's not resiging, checked above)
        _addTrucoPoints(false);
    }

    // Add envido points to match team points records
    function _addEnvidoPointsOnlyForAcceptedChallenge()
        internal
        returns (bool)
    {
        // No points added if envido is waiting for reveal
        if (matchState.state == MatchStateEnum.WAITING_FOR_REVEAL) {
            return false;
        }

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

            return true;
        }

        return false;
    }

    // Add truco points to match team points records
    function _addTrucoPoints(bool _playerResigned) internal {
        // If player resigned we should assing points to opponent instead of truco winner
        uint8 trucoWinner = _playerResigned
            ? _getPlayerIdx() ^ 1
            : gameStateQueries.getTrucoWinner(currentMatch.gameState);

        currentMatch.gameState.teamPoints[trucoWinner] += currentMatch
            .gameState
            .currentChallenge
            .pointsAtStake;
    }

    // Updates match state status based on current game state
    function _updateMatchState() internal {
        // Check for game ending, but be careful about waiting for an envido
        if (
            trucoEngine.isGameEnded(currentMatch.gameState) &&
            matchState.state != MatchStateEnum.WAITING_FOR_REVEAL
        ) {
            matchState.state = MatchStateEnum.FINISHED;
            return;
        }

        if (matchState.state != MatchStateEnum.WAITING_FOR_PLAY) {
            // New state is not updatable from other state/s
            return;
        }

        // Check if current round is finished, signal that a new shuffle is needed to start playing again
        if (gameStateQueries.isTrucoEnded(currentMatch.gameState)) {
            if (_changeMatchStateToWaitingForRevealIfApplies()) {
                return;
            }

            _changeMatchStateToWaitingForDeal();
            return;
        }

        matchState.state = MatchStateEnum.WAITING_FOR_PLAY;
    }

    // Change state and emit event to signal for new shuffling requirement
    function _changeMatchStateToWaitingForDeal() internal {
        // Emit event
        // TODO: change playerWhoShuffled ???
        address newShuffler = currentMatch.players[
            currentMatch.gameState.playerWhoShuffled ^ 1
        ];
        emit NewDealRequired(newShuffler, matchState.dealNonce + 1);
        matchState.state = MatchStateEnum.WAITING_FOR_DEAL;
    }

    // Changes match state to waiting for deal if applies
    function _changeMatchStateToWaitingForRevealIfApplies()
        internal
        returns (bool)
    {
        // Check if an envido winner has to reveal cards
        if (
            gameStateQueries.cardsShouldBeRevealedForEnvido(
                currentMatch.gameState
            )
        ) {
            matchState.state = MatchStateEnum.WAITING_FOR_REVEAL;
            return true;
        }

        return false;
    }

    // Change turn logic
    function _switchTurn() internal returns (bool) {
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

    function _buildTransaction(IERC3333.Action _action, uint8 _param)
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
        transaction.playerIdx = _getPlayerIdx();
        transaction.state = currentMatch.gameState;
        transaction.moves = moves;

        return transaction;
    }

    function _getPlayerIdx() internal view returns (uint8) {
        if (msg.sender == currentMatch.players[0]) {
            return 0;
        } else if (msg.sender == currentMatch.players[1]) {
            return 1;
        }

        revert('You are not a player in this match');
    }

    // Return current function selector
    function _getCalledFunctionSelector() internal pure returns (bytes4) {
        bytes4 selector;
        assembly {
            selector := calldataload(0)
        }
        return selector;
    }

    function _finishMatchIfApply() internal {
        if (!gameStateQueries.isGameEnded(currentMatch.gameState)) {
            // Game is not finished, do not do anything
            return;
        }

        // Get game winner
        uint8 winner = gameStateQueries.getGameWinner(currentMatch.gameState);
        uint8 winnerScore = currentMatch.gameState.teamPoints[winner];
        address winnerAddress = currentMatch.players[winner];

        // Get game loser
        uint8 loser = winner ^ 1;
        uint8 loserScore = currentMatch.gameState.teamPoints[loser];
        address loserAddress = currentMatch.players[loser];

        // Transfer trucoins to winner
        uint256 reward = truCoin.balanceOf(address(this));
        truCoin.transfer(winnerAddress, reward);

        // Assign Truco Champions Token
        TCT.assign(winnerAddress, winnerScore, loserAddress, loserScore);

        // Emit event
        emit MatchFinished(
            winnerAddress,
            winnerScore,
            loserAddress,
            loserScore,
            currentMatch.bet
        );
    }

    function _validateSignature(bytes32 hash, bytes memory signature)
        internal
        view
    {
        address[2] memory players = getPlayers();
        address signer = hash.getSigner(signature);
        require(
            players[0] == signer || players[1] == signer,
            'Invalid signature'
        );
    }
}
