pragma solidity ^0.4.23;

import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

/** @title Sample MintableToken for tests. */
contract ERC20TestTokenRetValueSimulator is MintableToken {
    //Investment Details
    string public name = "Broken Token";
    string public symbol = "BRK";
    uint256 public decimals = 18;

    bool returnValue = false;

    function transfer(address /*_to*/, uint256 /*_value*/) public returns (bool) {
        return returnValue;
    }

    function transferFrom(address /*from*/, address /*to*/, uint256 /*value*/) public returns (bool) {
        return returnValue;
    }

    function setReturnValue(bool retValue) public {
        returnValue = retValue;
    }
}