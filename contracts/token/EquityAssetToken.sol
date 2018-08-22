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

import "./CRWDAssetToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/lifecycle/Destructible.sol";

/** @title Equity AssetToken. */
contract EquityAssetToken is CRWDAssetToken, Destructible {
    uint256 public baseRate = 1; //override: fixed baseRate
    

    constructor(address _capitalControl, bool instantCreatorLockout) public {
        capitalControl = _capitalControl;
        availability.transfersPaused = true; //disable transfer as default

        if(instantCreatorLockout == true) {
            owner = capitalControl;
        }
    }

///////////////////
// Events
///////////////////
    event SelfApprovedTransfer(address indexed initiator, address indexed from, address indexed to, uint256 value);


///////////////////
// Overrides
///////////////////
    //override: fixed baseRate
    function setCurrencyMetaData(address _tokenBaseCurrency, uint256 _baseRate) public 
    onlyOwner
    {
        require(_baseRate == 1); //requires 1Token=1BaseCurrency

        super.setCurrencyMetaData(_tokenBaseCurrency, _baseRate);
    }


    //override: transfer ownership to capitalControl as soon as alive
    function setTokenAlive() public {
        super.setTokenAlive();

        owner = capitalControl;
    }

    //override: transferFrom that has special self-approve behaviour when executed as capitalControl
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool)
    {
        if (msg.sender == capitalControl) {
            return supply.enforcedTransferFrom(_from, _to, _value);
        } else {
            return super.transferFrom(_from, _to, _value);
        }
    }

}