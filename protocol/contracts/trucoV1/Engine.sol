// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Structs.sol";

contract CardsEngine is Ownable {
    IERC20 trucoin;

    constructor(IERC20 _trucoin) {
        trucoin = _trucoin;
    }

    function startGame()
        public
        returns (CardsStructs.GameState memory _gameState)
    {
        // Check that consumer contract has not already payed for game
        return _gameState;
    }

    function transact(CardsStructs.Transaction calldata transaction)
        external
        returns (CardsStructs.GameState memory gameState)
    {
        // check if game is started for current call

        require(
            transaction.state.playerTurn == transaction.playerIdx,
            "Incorrect player turn"
        );

        gameState = transaction.state;

        // Loops betweeen moves
        for (uint256 i = 0; i < transaction.moves.length; i++) {
            gameState = resolveMove(gameState, transaction.moves[i]);
        }

        //Switch de player antes de devolver el estado
        return gameState;
    }

    function resolveMove(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) internal returns (CardsStructs.GameState memory) {
        // verificar si la movida es valida
        require(isMoveValid(_gameState, _move), "Move is invalid");

        if (_gameState.waitingChallengeResponse) {
            require(
                _gameState.currentChallenge != CardsStructs.Challenge.None,
                "A challenge should be at play"
            );

            require(
                _move.action == CardsStructs.Action.Response,
                "Challenge response is pending"
            );

            _gameState = processMoveChallengeResponse(_gameState, _move);

            _gameState.waitingChallengeResponse = false;

            return _gameState;
        }

        // Aca se puede asumir que el challenge no esta esperando una rta
        if (isChallengeAnEnvido(_gameState.currentChallenge)) {

            require(_move.action == CardsStructs.Action.Challenge || _move.action == CardsStructs.Action.Response  || _move.action == CardsStructs.Action.EnvidoCount )


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
            if (_gameState.waitingChallengeResponse )  {
                require (_move.action == CardsStructs.Action.Response);
                
            }


            // La duda acá es cuando el que cantó envido no le toca decir los puntos, queda en un estado de aceptacióni pero esperando puntos
            // de ambos
            if (_gameState.waitingChallengeResponse && _move.action == CardsStructs.Action.EnvidoCount ) {

                // Checkear si soy mano o no
                if (_gameState.)
                _gameState.waitingChallengeResponse = true;
                _gameState.currentChallenge = _move.parameters[0];

                return _gameState;
            }


        }

        if (isChallengeATruco(_gameState.currentChallenge)) {
            require(_move.action == CardsStructs.Action.Challenge || _move.action == CardsStructs.Action.EnvidoCount  )

            if (_move.action == CardsStructs.Action.Challenge ) {
                _gameState.waitingChallengeResponse = true;
                _gameState.currentChallenge = _move.parameters[0];
            }
        }

        require (false, "Invalid state");
    }

    function isChallengeAnEnvido(CardsStructs.Challenge _challenge)
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

    function processMoveChallengeResponse(
        CardsStructs.GameState memory _gameState,
        CardsStructs.Move memory _move
    ) internal returns (CardsStructs.GameState memory) {}

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

    function isMoveValid(
        CardsStructs.GameState memory gameState,
        CardsStructs.Move memory move
    ) internal returns (bool) {
        // Poors man Finite State Machine (FSM) on Solidity times...

        if (move.action == CardsStructs.Action.Resign) {
            //Any player can resign at any time
            return true;
        }

        if (gameState.currentChallenge == CardsStructs.Challenge.None) {
            return
                move.action == CardsStructs.Action.PlayCard ||
                move.action == CardsStructs.Action.Challenge;
        }

        if (gameState.currentChallenge == CardsStructs.Challenge.Truco) {
            return
                move.action == CardsStructs.Action.Response ||
                move.action == CardsStructs.Action.PlayCard ||
                move.action == CardsStructs.Action.Challenge;
        }

        if (
            gameState.currentChallenge == CardsStructs.Challenge.Envido ||
            gameState.currentChallenge == CardsStructs.Challenge.RealEnvido
        ) {
            return
                move.action == CardsStructs.Action.Response ||
                move.action == CardsStructs.Action.Challenge ||
                move.action == CardsStructs.Action.EnvidoCount;
        }

        if (gameState.currentChallenge == CardsStructs.Challenge.FaltaEnvido) {
            return
                move.action == CardsStructs.Action.Response ||
                move.action == CardsStructs.Action.EnvidoCount;
        }

        return false;
    }
}
