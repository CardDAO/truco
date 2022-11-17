// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

library SignatureValidation {
    using ECDSA for bytes32;

    function isValidSignature(bytes32 hash, bytes memory signature)
        internal
        pure
        returns (bool)
    {
        return hash.toEthSignedMessageHash().recover(signature) == address(0); // TODO use IV addresses
    }
}
