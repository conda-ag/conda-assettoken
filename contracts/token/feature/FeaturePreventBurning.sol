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

import "../abstract/IBasicAssetToken.sol";

/** @title FeaturePreventBurning. */
contract FeaturePreventBurning is IBasicAssetToken {
    function burn(address /*_who*/, uint256 /*_amount*/) public {
        revert("Capital decrease requires redeployment");
    }
}