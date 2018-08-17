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
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/** @title Dividend AssetToken. */
contract DividendAssetToken is CRWDAssetToken {
    /*
    * @title This contract includes the dividend AssetToken features
    * @author Paul Pöltner / Conda
    * @dev DividendAssetToken inherits from CRWDAssetToken which inherits from BasicAssetToken
    */

    using SafeMath for uint256;

///////////////////
// Variables
///////////////////

    /** @dev `recycleLockedTimespan` devines the time, when the dividends will be recycled*/
    uint256 public recycleLockedTimespan = 365 days;

    enum DividendType { Ether, ERC20 }

    /** @dev `Dividend` is the structure that saves the status of a dividend distribution*/
    struct Dividend {
        uint256 blockNumber;
        uint256 timestamp;
        DividendType dividendType;
        address dividendToken;
        uint256 amount;
        uint256 claimedAmount;
        uint256 totalSupply;
        bool recycled;
        mapping (address => bool) claimed;
    }

    Dividend[] public dividends;

    mapping (address => uint256) dividendsClaimed;

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
        require(_dividendIndex < dividends.length);
        _;
    }

///////////////////
// Dividend Payment for Ether
///////////////////

    /** @dev Receives ether to be distriubted to all token owners*/
    function depositDividend() public payable onlyOwner onlyAlive {

        // gets the current number of total token distributed
        uint256 currentSupply = totalSupplyAt(block.number);
        // creates a new index for the dividends
        uint256 dividendIndex = dividends.length;
        // gets the current number of total token distributed
        uint256 blockNumber = SafeMath.sub(block.number, 1);

        // Stores the current meta data for the dividend payout
        dividends.push(
            Dividend(
                blockNumber,    // Block number when the dividends are distributed
                block.timestamp,            // Timestamp of the distribution
                DividendType.Ether, // Type of dividends
                address(0),
                msg.value,      // Total amount that has been distributed
                0,              // amount that has been claimed
                currentSupply,  // Total supply
                false           // Already recylced
            )
        );
        emit DividendDeposited(msg.sender, blockNumber, msg.value, currentSupply, dividendIndex);
    }

///////////////////
// Dividend Payment for ERC20 Dividend
///////////////////

    /** @dev Receives ether to be distriubted to all token owners
      * @param _dividendToken Token address
      * @param _amount The amount of tokens for deposit
      */
    function depositERC20Dividend(address _dividendToken, uint256 _amount) public onlyOwner onlyAlive {

        require(_amount > 0);

        require(_dividendToken == baseCurrency);

        // it shouldn't return anything but according to ERC20 standard it could if badly implemented
        require(ERC20(_dividendToken).transferFrom(msg.sender, this, _amount));

        // gets the current number of total token distributed
        uint256 currentSupply = totalSupplyAt(block.number);
        // creates a new index for the dividends
        uint256 dividendIndex = dividends.length;
        // gets the current number of total token distributed
        uint256 blockNumber = SafeMath.sub(block.number, 1);

        // Stores the current meta data for the dividend payout
        dividends.push(
            Dividend(
                blockNumber,    // Block number when the dividends are distributed
                block.timestamp,            // Timestamp of the distribution
                DividendType.ERC20, 
                _dividendToken, 
                _amount,      // Total amount that has been distributed
                0,              // amount that has been claimed
                currentSupply,  // Total supply
                false           // Already recylced
            )
        );
        emit DividendDeposited(msg.sender, blockNumber, _amount, currentSupply, dividendIndex);
    }

///////////////////
// Claim dividends
///////////////////

    /** @dev Token holder can claim the payout of dividends for a specific dividend payout
      * @param _dividendIndex the index of the specific dividend distribution
      */
    function claimDividend(uint256 _dividendIndex) public validDividendIndex(_dividendIndex) {
        // Loads the details for the specific Dividend payment
        Dividend storage dividend = dividends[_dividendIndex];

        // Devidends should not have been claimed already
        require(dividend.claimed[msg.sender] == false);

         // Devidends should not have been recycled already
        require(dividend.recycled == false);

        // get the token balance at the time of the dividend distribution
        uint256 balance = balanceOfAt(msg.sender, dividend.blockNumber);

        // calculates the amount of dividends that can be claimed
        uint256 claim = balance.mul(dividend.amount).div(dividend.totalSupply);

        // flag that dividends have been claimed
        dividend.claimed[msg.sender] = true;
        dividend.claimedAmount = SafeMath.add(dividend.claimedAmount, claim);

        
        // transfer the dividends to the token holder
        if (claim > 0) {
            if (dividend.dividendType == DividendType.Ether) { 
                msg.sender.transfer(claim);
                emit DividendClaimed(msg.sender, _dividendIndex, claim);
            } 

            if (dividend.dividendType == DividendType.ERC20) { 
                require(ERC20(dividend.dividendToken).transfer(msg.sender, claim));

                emit DividendClaimed(msg.sender, _dividendIndex, claim);
            }     
        }
    }

    /** @dev Claim all dividiends
      * @notice In case function call runs out of gas run single address calls against claimDividend function
      */
    function claimDividendAll() public {
        //early exit if all claimed
        require(dividendsClaimed[msg.sender] < dividends.length);

        // Cycle through all dividend distributions and make the payout
        for (uint i = dividendsClaimed[msg.sender]; i < dividends.length; i++) {
            if ((dividends[i].claimed[msg.sender] == false) && (dividends[i].recycled == false)) {
                dividendsClaimed[msg.sender] = SafeMath.add(i, 1);
                claimDividend(i);
            }
        }
    }

    /** @dev Claim dividends in batches
      * @notice In case claimDividendAll runs out of gas
      */
    function claimInBatches(uint256 startIndex, uint256 endIndex) public {
        require(startIndex < endIndex);

        //early exit if already claimed
        require(dividendsClaimed[msg.sender] < dividends.length);

        // Cycle through all dividend distributions and make the payout
        for (uint i = startIndex; i <= endIndex; i++) {
            if ((dividends[i].claimed[msg.sender] == false) && (dividends[i].recycled == false)) {
                dividendsClaimed[msg.sender] = SafeMath.add(dividendsClaimed[msg.sender], 1);
                claimDividend(i);
            }
        }
    }

    /** @dev Dividends which have not been claimed
      * @param _dividendIndex The index to be recycled
      */
    function recycleDividend(uint256 _dividendIndex) public onlyOwner validDividendIndex(_dividendIndex) {
        
        // Get the dividend distribution
        Dividend storage dividend = dividends[_dividendIndex];

        // should not have been recycled already
        require(dividend.recycled == false);

        // The recycle time has to be over
        require(dividend.timestamp < SafeMath.sub(block.timestamp, recycleLockedTimespan));

        // The amount, which has not been claimed is distributed to all other token owners
        dividends[_dividendIndex].recycled = true;
        uint256 currentSupply = totalSupplyAt(block.number);
        uint256 remainingAmount = SafeMath.sub(dividend.amount, dividend.claimedAmount);
        uint256 dividendIndex = dividends.length;
        uint256 blockNumber = SafeMath.sub(block.number, 1);
        dividends.push(
            Dividend(
                blockNumber,
                block.timestamp,
                dividend.dividendType,
                dividend.dividendToken,
                remainingAmount,
                0,
                currentSupply,
                false
            )
        );
        emit DividendRecycled(msg.sender, blockNumber, remainingAmount, currentSupply, dividendIndex);
    }

}
