pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./AssetTokenSupplyL.sol";

library AssetTokenDividendL {
    /*
    * @title This contract includes the dividend AssetToken features
    * @author Paul Pöltner / Conda
    * @dev DividendAssetToken inherits from CRWDAssetToken which inherits from BasicAssetToken
    */

    using SafeMath for uint256;
    using AssetTokenSupplyL for AssetTokenSupplyL.Supply;

    struct Store {
        Dividend[] dividends;
        mapping (address => uint256) dividendsClaimed;
    }

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

    /** @dev Receives ether to be distriubted to all token owners*/
    function depositDividend(Store storage _self, uint256 msgValue, uint256 _currentSupply) 
    public 
    {
        // creates a new index for the dividends
        uint256 dividendIndex = _self.dividends.length;
        // gets the current number of total token distributed
        uint256 blockNumber = SafeMath.sub(block.number, 1);

        // Stores the current meta data for the dividend payout
        _self.dividends.push(
            Dividend(
                blockNumber,    // Block number when the dividends are distributed
                block.timestamp,            // Timestamp of the distribution
                DividendType.Ether, // Type of dividends
                address(0),
                msgValue,      // Total amount that has been distributed
                0,              // amount that has been claimed
                _currentSupply,  // Total supply
                false           // Already recylced
            )
        );
        emit DividendDeposited(msg.sender, blockNumber, msgValue, _currentSupply, dividendIndex);
    }

    function depositERC20Dividend(Store storage _self, address _dividendToken, uint256 _amount, uint256 _currentSupply, address baseCurrency)
    public
    {
        require(_amount > 0);

        require(_dividendToken == baseCurrency);

        // it shouldn't return anything but according to ERC20 standard it could if badly implemented
        require(ERC20(_dividendToken).transferFrom(msg.sender, this, _amount));

        // creates a new index for the dividends
        uint256 dividendIndex = _self.dividends.length;
        // gets the current number of total token distributed
        uint256 blockNumber = SafeMath.sub(block.number, 1);

        // Stores the current meta data for the dividend payout
        _self.dividends.push(
            Dividend(
                blockNumber,    // Block number when the dividends are distributed
                block.timestamp,            // Timestamp of the distribution
                DividendType.ERC20, 
                _dividendToken, 
                _amount,      // Total amount that has been distributed
                0,              // amount that has been claimed
                _currentSupply,  // Total supply
                false           // Already recylced
            )
        );
        emit DividendDeposited(msg.sender, blockNumber, _amount, _currentSupply, dividendIndex);
    }

    function claimDividend(Store storage _self, AssetTokenSupplyL.Supply storage _supply, uint256 _dividendIndex) public {
        // Loads the details for the specific Dividend payment
        Dividend storage dividend = _self.dividends[_dividendIndex];

        // Devidends should not have been claimed already
        require(dividend.claimed[msg.sender] == false);

         // Devidends should not have been recycled already
        require(dividend.recycled == false);

        // get the token balance at the time of the dividend distribution
        uint256 balance = _supply.balanceOfAt(msg.sender, dividend.blockNumber);

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
    function claimDividendAll(Store storage _self, AssetTokenSupplyL.Supply storage _supply) public {
        //early exit if all claimed
        require(_self.dividendsClaimed[msg.sender] < _self.dividends.length);

        // Cycle through all dividend distributions and make the payout
        for (uint i = _self.dividendsClaimed[msg.sender]; i < _self.dividends.length; i++) {
            if ((_self.dividends[i].claimed[msg.sender] == false) && (_self.dividends[i].recycled == false)) {
                _self.dividendsClaimed[msg.sender] = SafeMath.add(i, 1); //ERROR: seems this should move into claimDividend...
                claimDividend(_self, _supply, i);
            }
        }
    }

    /** @dev Claim dividends in batches
      * @notice In case claimDividendAll runs out of gas
      */
    function claimInBatches(Store storage _self, AssetTokenSupplyL.Supply storage _supply, uint256 startIndex, uint256 endIndex) public {
        require(startIndex < endIndex);

        //early exit if already claimed
        require(_self.dividendsClaimed[msg.sender] < _self.dividends.length);

        // Cycle through all dividend distributions and make the payout
        for (uint i = startIndex; i <= endIndex; i++) {
            if ((_self.dividends[i].claimed[msg.sender] == false) && (_self.dividends[i].recycled == false)) {
                _self.dividendsClaimed[msg.sender] = SafeMath.add(_self.dividendsClaimed[msg.sender], 1);
                claimDividend(_self, _supply, i);
            }
        }
    }

    /** @dev Dividends which have not been claimed
      * @param _dividendIndex The index to be recycled
      */
    function recycleDividend(Store storage _self, uint256 _dividendIndex, uint256 recycleLockedTimespan, uint256 _currentSupply) public {
        // Get the dividend distribution
        Dividend storage dividend = _self.dividends[_dividendIndex];

        // should not have been recycled already
        require(dividend.recycled == false);

        // The recycle time has to be over
        require(dividend.timestamp < SafeMath.sub(block.timestamp, recycleLockedTimespan));

        // The amount, which has not been claimed is distributed to all other token owners
        _self.dividends[_dividendIndex].recycled = true;
        
        uint256 remainingAmount = SafeMath.sub(dividend.amount, dividend.claimedAmount);
        uint256 dividendIndex = _self.dividends.length;
        uint256 blockNumber = SafeMath.sub(block.number, 1);
        _self.dividends.push(
            Dividend(
                blockNumber,
                block.timestamp,
                dividend.dividendType,
                dividend.dividendToken,
                remainingAmount,
                0,
                _currentSupply,
                false
            )
        );
        emit DividendRecycled(msg.sender, blockNumber, remainingAmount, _currentSupply, dividendIndex);
    }

    ///////////////////
    // Events
    ///////////////////

    event DividendDeposited(address indexed _depositor, uint256 _blockNumber, uint256 _amount, uint256 _totalSupply, uint256 _dividendIndex);
    event DividendClaimed(address indexed _claimer, uint256 _dividendIndex, uint256 _claim);
    event DividendRecycled(address indexed _recycler, uint256 _blockNumber, uint256 _amount, uint256 _totalSupply, uint256 _dividendIndex);
}