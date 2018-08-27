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

/** @title Equity AssetToken. */
contract FeatureCapitalControl is CRWDAssetToken {
    //if set can mint/burn after finished. E.g. a notary.
    address public capitalControl;

    //override: skip certain modifier checks as capitalControl
    function _canDoAnytime() internal view returns (bool) {
        return msg.sender == capitalControl;
    }

    modifier onlyCapitalControl() {
        require(msg.sender == capitalControl);
        _;
    }

    function setCapitalControl(address _capitalControl) public canSetMetadata {
        capitalControl = _capitalControl;
    }

    function updateCapitalControl(address _capitalControl) public onlyCapitalControl {
        capitalControl = _capitalControl;
    }

    constructor(address _capitalControl) public {
        capitalControl = _capitalControl;
        availability.transfersPaused = true; //disable transfer as default
    }

////////////////
// Reopen crowdsale (by capitalControl e.g. notary)
////////////////

    /** @dev If a capitalControl is set he can reopen the crowdsale.
      * @param _newCrowdsale the address of the new crowdsale
      */
    function reopenCrowdsale(address _newCrowdsale) public onlyCapitalControl returns (bool) {
        require(crowdsale != _newCrowdsale);

        crowdsale = _newCrowdsale;
        
        return availability.reopenCrowdsale();
    }
}