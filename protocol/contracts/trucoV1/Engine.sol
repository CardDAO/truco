// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CardsEngine is Ownable {

    IERC20 trucoin;

    constructor (IERC20 _trucoin) {
        trucoin = _trucoin;
    }

}
