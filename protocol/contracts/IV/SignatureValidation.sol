// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

library SignatureValidation {
    using ECDSA for bytes32;

    function getSigner(bytes32 hash, bytes memory signature)
        internal
        pure
        returns (bool)
    {
        return hash.toEthSignedMessageHash().recover(signature);
    }
}
