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
import "./feature/FeatureCapitalControlWithForcedTransferFrom.sol";
import "./feature/FeaturePreventBurning.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/lifecycle/Destructible.sol";

/** @title Equity AssetToken. */
contract EquityAssetToken is CRWDAssetToken, FeatureCapitalControlWithForcedTransferFrom, FeaturePreventBurning, Destructible {
    uint256 public decimals = 0; //override: fixed decimals

    constructor(address _capitalControl) FeatureCapitalControlWithForcedTransferFrom(_capitalControl) public {}
}