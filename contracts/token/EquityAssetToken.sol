pragma solidity ^0.4.24;

/*
    Copyright 2018, CONDA

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import "./FeatureCapitalControl.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/lifecycle/Destructible.sol";

/** @title Equity AssetToken. */
contract EquityAssetToken is FeatureCapitalControl, Destructible {
    uint256 public baseRate = 1; //override: fixed baseRate
    

    constructor(address _capitalControl) FeatureCapitalControl(_capitalControl) public {}

///////////////////
// Events
///////////////////
    event SelfApprovedTransfer(address indexed initiator, address indexed from, address indexed to, uint256 value);


///////////////////
// Overrides
///////////////////
    //override: fixed baseRate
    function setCurrencyMetaData(address _tokenBaseCurrency, uint256 _baseRate) public 
    {
        //Error: Decimals immer 1 nicht baserate
        require(_baseRate == 1); //requires 1Token=1BaseCurrency

        super.setCurrencyMetaData(_tokenBaseCurrency, _baseRate);
    }

    //override: transferFrom that has special self-approve behaviour when executed as capitalControl
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool)
    {
        if (msg.sender == capitalControl) {
            if(_value != balanceOf(_from))
            {
                revert("Only full amount in case of lost wallet is allowed");
            }

            return supply.enforcedTransferFrom(availability, _from, _to, _value);
        } else {
            return super.transferFrom(_from, _to, _value);
        }
    }

    function burn(address _who, uint256 _amount) public {
        revert("Capital decrease requires redeployment");
    }
}