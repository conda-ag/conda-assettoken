pragma solidity ^0.4.23;

import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

/** @title Sample MintableToken for tests. */
contract ERC20TestToken is MintableToken {
    //Investment Details
    string public name = "Test Token";
    string public symbol = "TEST";
    uint256 public decimals = 18;
}