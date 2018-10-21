pragma solidity ^0.4.24;

import "./IBasicAssetTokenFull.sol";

contract ICRWDAssetToken is IBasicAssetTokenFull {
    function setClearingAddress(address _clearingAddress) public;
}