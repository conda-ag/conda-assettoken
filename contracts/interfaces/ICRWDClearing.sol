pragma solidity ^0.4.23;


interface ICRWDClearing {
    function clearFunds(address _underlyingCurrency, address _from, address _to, uint256 _amount) external returns (bool);
}