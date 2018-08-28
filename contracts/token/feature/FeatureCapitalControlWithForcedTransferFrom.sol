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

/** @title FeatureCapitalControlWithForcedTransferFrom. */
contract FeatureCapitalControlWithForcedTransferFrom is FeatureCapitalControl {

///////////////////
// Events
///////////////////
    event SelfApprovedTransfer(address indexed initiator, address indexed from, address indexed to, uint256 value);


///////////////////
// Overrides
///////////////////

    //override: transferFrom that has special self-approve behaviour when executed as capitalControl
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool)
    {
        if (msg.sender == capitalControl) {
            if(_value != balanceOf(_from))
            {
                revert("Only full amount in case of lost wallet is allowed");
            }

            return inforcedTransferFromInternal(_from, _to, _value);
        } else {
            return super.transferFrom(_from, _to, _value);
        }
    }

}