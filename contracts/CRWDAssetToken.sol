pragma solidity ^0.4.23;

import "./token/DividendAssetToken.sol";
import "./interfaces/ICRWDClearing.sol";

/** @title CRWD AssetToken. */
contract CRWDAssetToken is DividendAssetToken {

    address public clearingAddress;

    function transfer(address _to, uint256 _amount) public returns (bool success) {
        uint256 transferValue = _amount.mul(baseRate).div(1000);
        ICRWDClearing(clearingAddress).clearFunds(baseCurrency, msg.sender, _to, transferValue);
        return super.transfer(_to, _amount);
    }

    function transferFrom(address _from, address _to, uint256 _amount) public returns (bool success) {
        uint256 transferValue = _amount.mul(baseRate).div(1000);
        ICRWDClearing(clearingAddress).clearFunds(baseCurrency, _from, _to, transferValue);
        return super.transferFrom(_from, _to, _amount);
    }

    function mint(address _to, uint256 _amount) public onlyOwner canMint returns (bool) {
        uint256 transferValue = _amount.mul(baseRate).div(1000);
        ICRWDClearing(clearingAddress).clearFunds(baseCurrency, _to, _to, transferValue);
        return super.mint(_to,_amount);
    }

    function setClearingAddress(address _clearingAddress) public {
        clearingAddress = _clearingAddress;
    }
}