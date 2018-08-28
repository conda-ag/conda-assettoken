pragma solidity ^0.4.24;

/*
    Copyright 2018, CONDA
    This contract is a fork from Adam Dossa
    https://github.com/adamdossa/ProfitSharingContract/blob/master/contracts/ProfitSharing.sol

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

import "./DividendAssetToken.sol";
import "./EquityAssetToken.sol";
import "./feature/FeaturePreventBurning.sol";
import "./feature/FeatureCapitalControl.sol";

/** @title Dividend AssetToken. */
contract DividendEquityAssetToken is DividendAssetToken, FeatureCapitalControl, FeaturePreventBurning {
    
    constructor(address _capitalControl) FeatureCapitalControl(_capitalControl) public {}

    function test() public {

    }

}