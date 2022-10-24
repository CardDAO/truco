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

        // Aca se puede asumir que el challenge no esta esperando una rta
        if (isChallengeAnEnvido(_gameState.currentChallenge)) {

            require(_move.action == CardsStructs.Action.Challenge || _move.action == CardsStructs.Action.Response  || _move.action == CardsStructs.Action.EnvidoCount );


            // 3 casos

            // 1) Subo la apuesta. Precondiciones: 
            // - challenge anterior aceptado.
            // - no ser el challenger
            // - no haya puntos cantados
            // - no haber alcanzado el limite de re-challenges

            // 2) Respondo la apuesta cantada (Si o no.). Precondiciones:
            //  - challenge sin respuesta
            // -  no ser el challenger

            // 3) Canto puntos. precondicion: 
            //  - challenge con respuesta
            // - checkear si sos mano o no y en funcion de eso si el otro ya cantó


            
            // Se está esperando una respuesta, no puede venir un count u otra action
            if (_gameState.currentChallenge.waitingChallengeResponse )  {
                require (_move.action == CardsStructs.Action.Response);
                
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
        return true;
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
