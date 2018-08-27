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

import "./CRWDAssetToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/** @title Dividend AssetToken. */
contract DividendAssetToken is CRWDAssetToken {
    /*
    * @title This contract includes the dividend AssetToken features
    * @author Paul Pöltner / Conda
    * @dev DividendAssetToken inherits from CRWDAssetToken which inherits from BasicAssetToken
    */

    using SafeMath for uint256;
    using AssetTokenSupplyL for AssetTokenSupplyL.Supply;
    using AssetTokenSupplyL for AssetTokenSupplyL.Store;

///////////////////
// Variables
///////////////////

    /** @dev `recycleLockedTimespan` devines the time, when the dividends will be recycled*/
    uint256 public recycleLockedTimespan = 365 days;

    AssetTokenSupplyL.Store storedDividends;

///////////////////
// Events
///////////////////

    event DividendDeposited(address indexed _depositor, uint256 _blockNumber, uint256 _amount, uint256 _totalSupply, uint256 _dividendIndex);
    event DividendClaimed(address indexed _claimer, uint256 _dividendIndex, uint256 _claim);
    event DividendRecycled(address indexed _recycler, uint256 _blockNumber, uint256 _amount, uint256 _totalSupply, uint256 _dividendIndex);

///////////////////
// Modifier
///////////////////

    modifier validDividendIndex(uint256 _dividendIndex) {
        require(_dividendIndex < storedDividends.dividends.length);
        _;
    }

///////////////////
// Dividend Payment for Ether
///////////////////

    /** @dev Receives ether to be distriubted to all token owners*/
    function depositDividend() public payable onlyOwner onlyAlive {

        // gets the current number of total token distributed
        uint256 currentSupply = totalSupplyAt(block.number);
        
        storedDividends.depositDividend(msg.value, currentSupply);
    }

///////////////////
// Dividend Payment for ERC20 Dividend
///////////////////

    /** @dev Receives ether to be distriubted to all token owners
      * @param _dividendToken Token address
      * @param _amount The amount of tokens for deposit
      */
    function depositERC20Dividend(address _dividendToken, uint256 _amount) public onlyOwner onlyAlive {
        // gets the current number of total token distributed
        uint256 currentSupply = totalSupplyAt(block.number);

        storedDividends.depositERC20Dividend(_dividendToken, _amount, currentSupply, baseCurrency);
    }

///////////////////
// Claim dividends
///////////////////

    /** @dev Token holder can claim the payout of dividends for a specific dividend payout
      * @param _dividendIndex the index of the specific dividend distribution
      */
    function claimDividend(uint256 _dividendIndex) public validDividendIndex(_dividendIndex) {
        storedDividends.claimDividend(supply, _dividendIndex);
    }

    /** @dev Claim all dividiends
      * @notice In case function call runs out of gas run single address calls against claimDividend function
      */
    function claimDividendAll() public {
        storedDividends.claimDividendAll(supply);
    }

    /** @dev Claim dividends in batches
      * @notice In case claimDividendAll runs out of gas
      */
    function claimInBatches(uint256 startIndex, uint256 endIndex) public {
        storedDividends.claimInBatches(supply, startIndex, endIndex); 
    }

    /** @dev Dividends which have not been claimed
      * @param _dividendIndex The index to be recycled
      */
    function recycleDividend(uint256 _dividendIndex) public onlyOwner validDividendIndex(_dividendIndex) {
        uint256 currentSupply = totalSupplyAt(block.number);

        storedDividends.recycleDividend(_dividendIndex, recycleLockedTimespan, currentSupply);
    }

}
