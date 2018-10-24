pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol';


/** @title Sample MintableToken for tests. */
contract ERC20TestToken is ERC20Mintable {
    function name() public view returns(string) {
        return "Test Token";
    }

    function symbol() public view returns(string) {
        return "TEST";
    }

    function decimals() public view returns(uint8) {
        return 18;
    }
}