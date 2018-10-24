pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol';

/** @title Sample MintableToken for tests. */
contract ERC20TestTokenRetValueSimulator is ERC20Mintable {

    function name() public view returns(string) {
        return "Broken Token";
    }

    function symbol() public view returns(string) {
        return "BRK";
    }

    function decimals() public view returns(uint8) {
        return 18;
    }

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