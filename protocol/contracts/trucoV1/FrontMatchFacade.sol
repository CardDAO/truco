// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import './GameStateQueries.sol';
import './interfaces/IERC3333.sol';
import '../TrucoMatch.sol';

contract FrontMatchFacade {
    GameStateQueries internal gameStateQueries;

    constructor(GameStateQueries _gameStateQueries) {
        gameStateQueries = _gameStateQueries;
    }

    function canSpellEnvido(TrucoMatch _contractMatch)
        external
        view
        returns (bool)
    {
        IERC3333.Move memory move = prepareMove(
            IERC3333.Action.Challenge,
            IERC3333.Challenge.Envido
        );

        return
            isPlayerTurn(_contractMatch) &&
            gameStateQueries.isMoveValid(
                getCurrentGameState(_contractMatch),
                move
            );
    }

    function canSpellTruco(TrucoMatch _contractMatch)
        external
        view
        returns (bool)
    {
        IERC3333.Move memory move = prepareMove(
            IERC3333.Action.Challenge,
            IERC3333.Challenge.Truco
        );

        return
            isPlayerTurn(_contractMatch) &&
            gameStateQueries.isMoveValid(
                getCurrentGameState(_contractMatch),
                move
            );
    }

    function canResponse(TrucoMatch _contractMatch)
        external
        view
        returns (bool)
    {
        IERC3333.Move memory move = prepareMove(
            IERC3333.Action.Response,
            IERC3333.Challenge.None
        );

        return
            isPlayerTurn(_contractMatch) &&
            gameStateQueries.isMoveValid(
                getCurrentGameState(_contractMatch),
                move
            );
    }

    function canPlayCard(TrucoMatch _contractMatch)
        external
        view
        returns (bool)
    {
        IERC3333.Move memory move = prepareMove(
            IERC3333.Action.PlayCard,
            IERC3333.Challenge.None
        );

        return
            isPlayerTurn(_contractMatch) &&
            gameStateQueries.isMoveValid(
                getCurrentGameState(_contractMatch),
                move
            );
    }

    function getEnvidoPointsForCards(uint8[] memory _cards)
        public
        view
        returns (uint8)
    {
        return gameStateQueries.getEnvidoPointsForCards(_cards);
    }

    function currentPlayerIdx(TrucoMatch currentMatch)
        internal
        view
        returns (uint8)
    {
        address[2] memory players = currentMatch.getPlayers();

        if (msg.sender == players[0]) {
            return 0;
        } else if (msg.sender == players[1]) {
            return 1;
        }

        revert('You are not a player in this match');
    }

    function prepareMove(IERC3333.Action _action, IERC3333.Challenge _param)
        internal
        pure
        returns (IERC3333.Move memory move)
    {
        uint8[] memory params = new uint8[](1);
        params[0] = uint8(_param);
        move.action = _action;
        move.parameters = params;
    }

    function isPlayerTurn(TrucoMatch _contractMatch)
        internal
        view
        returns (bool result)
    {
        if (getCurrentGameState(_contractMatch).playerTurn == currentPlayerIdx(_contractMatch)) {
            result = true;
        }
    }

    function getCurrentGameState(TrucoMatch _contractMatch)
        internal
        view
        returns (IERC3333.GameState memory)
    {
        (IERC3333.GameState memory gameState, ) = _contractMatch.currentMatch();
        return gameState;
    }
}
