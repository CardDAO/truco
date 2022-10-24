// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Structs.sol";

contract CardsEngine is Ownable {
    IERC20 trucoin;

    uint8 constant internal POINTS_NO_CHALLENGE = 1;

    uint8 constant public CARD_NOT_REVEALED_RESERVED_IDX = 0;

    constructor(IERC20 _trucoin) {
        trucoin = _trucoin;
    }

    function startGame()
        public
        returns (CardsStructs.GameState memory _gameState)
    {
        // Check that consumer contract has not already payed for game
        

        // If not, transfer 1% of caller contract balance on Truecoins

        // Init game state
        _gameState.currentChallenge.challenge = CardsStructs.Challenge.None;
        _gameState.currentChallenge.pointsAtStake = POINTS_NO_CHALLENGE; 
        return _gameState;
    }

    function transact(CardsStructs.Transaction calldata transaction)
        external
        returns (CardsStructs.GameState memory gameState)
    {
        // check if game is started for current call

        // CHeck correct turn
        require(
            transaction.state.playerTurn == transaction.playerIdx,
            "Incorrect player turn"
        );

        gameState = transaction.state;

        // Loops betweeen moves
        for (uint256 i = 0; i < transaction.moves.length; i++) {
            gameState = resolveMove(gameState, transaction.moves[i]);
        }

        // Player switch before returning state
        if ( gameState.playerTurn == 0) {
        gameState.playerTurn = 1;
        } else { gameState.playerTurn = 0; }

        return gameState;
    }

    function resolveMove(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) internal returns (CardsStructs.GameState memory) {
        
        // Verify if it's a valid move
        require(isMoveValid(_gameState, _move), "Move is invalid");

        if (_gameState.currentChallenge.challenge == CardsStructs.Challenge.None) {

            _gameState = processMoveNoActiveChallenge(_gameState, _move);

            return _gameState;
        }

        // Check if an Envido is being played or challenged, in that case this should be the priority
        if (isChallengeAnEnvido(_gameState.currentChallenge)) {

            // Accepted moves up to this point are enforced here
            require(_move.action == CardsStructs.Action.Challenge || _move.action == CardsStructs.Action.Response  || _move.action == CardsStructs.Action.EnvidoCount );

            // 3 possible cases are handled:

            // 1) Check if action is a challenge "rising" (i.e: Envido -> Real Envido! / Envido -> Falta Envido!)
            if (_move.action == CardsStructs.Action.Challenge ) {
                // Preconditions:
                // - Previous challenge was accepted
                // - Player is not the challenger
                // - No points were previously spoken
                // - Haven't reach maximum challenges spelled
                require (_gameState.currentChallenge.response == CardsStructs.Response.Accept);
                require (_gameState.playerTurn != _gameState.currentChallenge.challenger );
                require (_gameState.envidoCountPerPlayer[0] == 0 && _gameState.envidoCountPerPlayer[1] == 0);
                //require (no maximium reached);

            }

            // 2) Check if action is an envido acceptance or refusal
            if (_move.action == CardsStructs.Action.Response ) {
                // Preconditions:
                // - Challenge should have no response
                // - Can't be the challenger
            }
            
            // 3) Envido point spell: 
            if (_move.action == CardsStructs.Action.EnvidoCount ) {
                // Preconditions:
                // - Challenge should have been accepted by other party
                // - Check if i'm in place for spelling my points (i am "mano") or by contrary it's other players turn
            }


            // La duda acá es cuando el que cantó envido no le toca decir los puntos, queda en un estado de aceptacióni pero esperando puntos
            // de ambos
            if (_gameState.currentChallenge.waitingChallengeResponse && _move.action == CardsStructs.Action.EnvidoCount ) {

                /* Checkear si soy mano o no
                if (_gameState.)
                _gameState.waitingChallengeResponse = true;
                _gameState.currentChallenge = _move.parameters[0];
                */
                return _gameState;
            }


        }

        if (isChallengeATruco(_gameState.currentChallenge.challenge)) {
            require(_move.action == CardsStructs.Action.Challenge || _move.action == CardsStructs.Action.EnvidoCount  );

            if (_move.action == CardsStructs.Action.Challenge ) {
                _gameState.currentChallenge.waitingChallengeResponse = true;
                _gameState.currentChallenge.challenge = CardsStructs.Challenge(_move.parameters[0]);
            }
        }

        require (false, "Invalid state");
    }

    function isChallengeAnEnvido(CardsStructs.CurrentChallenge memory _challenge)
        internal
        returns (bool)
    {
        if (
            _challenge.challenge == CardsStructs.Challenge.Envido ||
            _challenge.challenge == CardsStructs.Challenge.RealEnvido ||
            _challenge.challenge == CardsStructs.Challenge.FaltaEnvido
        ) {
            return true; 
        }

        return false;
    }

    function isChallengeATruco(CardsStructs.Challenge _challenge)
        internal
        returns (bool)
    {
        return true;
    }

    function processMoveNoActiveChallenge(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) internal returns (CardsStructs.GameState memory) {


    }

    // [Owner] Transfer gained fees to an arbitrary address
    function transferFeesTo(address _recipient, uint256 _amount)
        public
        onlyOwner
    {
        trucoin.transfer(_recipient, _amount);
    }

    function doesGameEnded(CardsStructs.GameState memory gameState)
        internal
        returns (bool)
    {}


    function canEnvidoBeSpelled(CardsStructs.GameState memory gameState) internal returns (bool)
    {
        return true;
    }


    function isMoveValid(
        CardsStructs.GameState memory gameState,
        CardsStructs.Move memory move
    ) internal returns (bool) {

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

        if (challenge == CardsStructs.Challenge.Truco ||
        challenge == CardsStructs.Challenge.ReTruco  ||
        challenge == CardsStructs.Challenge.ValeCuatro ) {
    
    
            // Player is same as challenger, it only can raise current challenge
            if (gameState.currentChallenge.challenger == gameState.playerTurn) {
                return (move.action == CardsStructs.Action.Challenge);                 
            }

            // Current player is not challemger, check if there's a response to enforce
            if (gameState.currentChallenge.waitingChallengeResponse) {
                if (canEnvidoBeSpelled(gameState)) {

                }
                return move.action == CardsStructs.Action.Challenge || move.action == CardsStructs.Action.Response;
            }
            
            return
                move.action == CardsStructs.Action.Response ||
                move.action == CardsStructs.Action.PlayCard ||
                move.action == CardsStructs.Action.Challenge;
        }

        if (
            challenge == CardsStructs.Challenge.Envido ||
            challenge == CardsStructs.Challenge.RealEnvido
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
