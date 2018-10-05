pragma solidity ^0.4.24;

import "./IBasicAssetToken.sol";

contract ICRWDAssetToken is IBasicAssetToken {
    function setClearingAddress(address _clearingAddress) public;
}