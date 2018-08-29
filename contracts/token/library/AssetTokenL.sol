pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

library AssetTokenL {

    using SafeMath for uint256;

    struct Supply {
        // `balances` is the map that tracks the balance of each address, in this
        //  contract when the balance changes the block number that the change
        //  occurred is also included in the map
        mapping (address => Checkpoint[]) balances;

        // Tracks the history of the `totalSupply` of the token
        Checkpoint[] totalSupplyHistory;

        // `allowed` tracks any extra transfer rights as in all ERC20 tokens
        mapping (address => mapping (address => uint256)) allowed;
    }

    struct Availability {
        // Flag that determines if the token is yet configured.
        // Meta data cannot be changed anymore (except capitalControl)
        bool tokenConfigured;

        // Flag that determines if the token is transferable or not.
        bool transfersPaused;

        // Flag that minting is finished
        bool mintingPhaseFinished;

        // Flag that minting is paused
        bool mintingPaused;

        // role that can pause/resume
        address pauseControl;
    }

    struct Store {
        Dividend[] dividends;
        mapping (address => uint256) dividendsClaimed;
    }

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

    enum DividendType { Ether, ERC20 }

    /// @dev `Checkpoint` is the structure that attaches a block number to a
    ///  given value, the block number attached is the one that last changed the
    ///  value
    struct Checkpoint {

        // `fromBlock` is the block number that the value was generated from
        uint128 fromBlock;

        // `value` is the amount of tokens at a specific block number
        uint128 value;
    }

    /// @dev This is the actual transfer function in the token contract, it can
    ///  only be called by other functions in this contract.
    /// @param _from The address holding the tokens being transferred
    /// @param _to The address of the recipient
    /// @param _amount The amount of tokens to be transferred
    /// @return True if the transfer was successful
    function doTransfer(Supply storage _supply, Availability storage _availability, address _from, address _to, uint256 _amount) internal {
        require(!_availability.transfersPaused); //ERROR: capitalControl also can't!
        require(!_availability.mintingPhaseFinished); //ERROR: what if reopened? should be blocked? finishedOnce?

        // Do not allow transfer to 0x0 or the token contract itself
        require(_to != address(0));
        require(_to != address(this));

        // If the amount being transfered is more than the balance of the
        //  account the transfer throws
        uint256 previousBalanceFrom = balanceOfAt(_supply, _from, block.number);
        require(previousBalanceFrom >= _amount);

        // First update the balance array with the new value for the address
        //  sending the tokens
        updateValueAtNow(_supply.balances[_from], previousBalanceFrom.sub(_amount));

        // Then update the balance array with the new value for the address
        //  receiving the tokens
        uint256 previousBalanceTo = balanceOfAt(_supply, _to, block.number);
        require(previousBalanceTo + _amount >= previousBalanceTo); // Check for overflow
        
        updateValueAtNow(_supply.balances[_to], previousBalanceTo.add(_amount));

        // An event to make the transfer easy to find on the blockchain
        emit Transfer(_from, _to, _amount);
    }

    /// @notice `msg.sender` approves `_spender` to spend `_amount` tokens on
    ///  its behalf. This is a modified version of the ERC20 approve function
    ///  to be a little bit safer
    /// @param _spender The address of the account able to transfer the tokens
    /// @param _amount The amount of tokens to be approved for transfer
    /// @return True if the approval was successful
    function approve(Supply storage _self, address _spender, uint256 _amount) public returns (bool success) {
        // To change the approve amount you first have to reduce the addresses`
        //  allowance to zero by calling `approve(_spender,0)` if it is not
        //  already 0 to mitigate the race condition described here:
        //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
        require((_amount == 0) || (_self.allowed[msg.sender][_spender] == 0));

        _self.allowed[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    /// @dev Increase the amount of tokens that an owner allowed to a spender.
    /// 
    /// approve should be called when allowed[_spender] == 0. To increment
    ///  allowed value is better to use this function to avoid 2 calls (and wait until
    ///  the first transaction is mined)
    ///  From MonolithDAO Token.sol
    /// @param _spender The address which will spend the funds.
    ///  @param _addedValue The amount of tokens to increase the allowance by.
    function increaseApproval(Supply storage _self, address _spender, uint _addedValue) public returns (bool) {
        _self.allowed[msg.sender][_spender] = _self.allowed[msg.sender][_spender].add(_addedValue);
        emit Approval(msg.sender, _spender, _self.allowed[msg.sender][_spender]);
        return true;
    }

    /// @dev Decrease the amount of tokens that an owner allowed to a spender.
    ///
    /// approve should be called when allowed[_spender] == 0. To decrement
    /// allowed value is better to use this function to avoid 2 calls (and wait until
    /// the first transaction is mined)
    /// From MonolithDAO Token.sol
    /// @param _spender The address which will spend the funds.
    /// @param _subtractedValue The amount of tokens to decrease the allowance by.
    function decreaseApproval(Supply storage _self, address _spender, uint _subtractedValue) public returns (bool) {
        uint oldValue = _self.allowed[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            _self.allowed[msg.sender][_spender] = 0;
        } else {
            _self.allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        emit Approval(msg.sender, _spender, _self.allowed[msg.sender][_spender]);
        return true;
    }

    /// @notice Send `_amount` tokens to `_to` from `_from` on the condition it
    ///  is approved by `_from`
    /// @param _from The address holding the tokens being transferred
    /// @param _to The address of the recipient
    /// @param _amount The amount of tokens to be transferred
    /// @return True if the transfer was successful
    function transferFrom(Supply storage _supply, Availability storage _availability, address _from, address _to, uint256 _amount) 
    public 
    returns (bool success) 
    {
        // The standard ERC 20 transferFrom functionality
        require(_supply.allowed[_from][msg.sender] >= _amount);
        _supply.allowed[_from][msg.sender].sub(_amount);

        doTransfer(_supply, _availability, _from, _to, _amount);
        return true;
    }

    /// @notice Send `_amount` tokens to `_to` from `_from` WITHOUT approval. UseCase: notar transfers from lost wallet
    /// @param _from The address holding the tokens being transferred
    /// @param _to The address of the recipient
    /// @param _amount The amount of tokens to be transferred
    /// @return True if the transfer was successful
    function enforcedTransferFrom(
        Supply storage _supply, 
        Availability storage _availability, 
        address _from, 
        address _to, 
        uint256 _amount, 
        bool _fullAmountRequired) 
    internal 
    returns (bool success) 
    {
        if(_amount != balanceOfAt(_supply, _from, block.number))
        {
            revert("Only full amount in case of lost wallet is allowed");
        }

        doTransfer(_supply, _availability, _from, _to, _amount);

        emit SelfApprovedTransfer(msg.sender, _from, _to, _amount);

        return true;
    }

////////////////
// Miniting 
////////////////

    /// @dev Function to mint tokens
    /// @param _to The address that will receive the minted tokens.
    /// @param _amount The amount of tokens to mint.
    /// @return A boolean that indicates if the operation was successful.
    function mint(Supply storage _self, address _to, uint256 _amount) public returns (bool) {
        uint256 curTotalSupply = totalSupplyAt(_self, block.number);

        // Check for overflow
        require(curTotalSupply + _amount >= curTotalSupply); 
        uint256 previousBalanceTo = balanceOfAt(_self, _to, block.number);

        // Check for overflow
        require(previousBalanceTo + _amount >= previousBalanceTo); 

        updateValueAtNow(_self.totalSupplyHistory, curTotalSupply.add(_amount));
        updateValueAtNow(_self.balances[_to], previousBalanceTo.add(_amount));

        emit Mint(_to, _amount); //zeppelin compliant
        emit MintDetailed(msg.sender, _to, _amount);
        emit Transfer(address(0), _to, _amount);

        return true;
    }

// ////////////////
// // Burn - only during minting 
// ////////////////

//     /** @dev Burn someone's tokens (only allowed during minting phase). 
//       * @param _who Eth address of person who's tokens should be burned.
//       */
//     function burn(Supply storage _self, address _who, uint256 _value) public {
//         uint256 curTotalSupply = totalSupplyAt(_self, block.number);

//         // Check for overflow
//         require(curTotalSupply - _value <= curTotalSupply); 

//         uint256 previousBalanceWho = balanceOfAt(_self, _who, block.number);

//         require(_value <= previousBalanceWho);

//         updateValueAtNow(_self.totalSupplyHistory, curTotalSupply.sub(_value));
//         updateValueAtNow(_self.balances[_who], previousBalanceWho.sub(_value));

//         emit Burn(_who, _value); //zeppelin compliant
//         emit BurnDetailed(msg.sender, _who, _value);
//         emit Transfer(_who, address(0), _value);
//     }

////////////////
// Query balance and totalSupply in History
////////////////

    /// @dev Queries the balance of `_owner` at a specific `_blockNumber`
    /// @param _owner The address from which the balance will be retrieved
    /// @param _blockNumber The block number when the balance is queried
    /// @return The balance at `_blockNumber`
    function balanceOfAt(Supply storage _self, address _owner, uint _blockNumber) public view returns (uint256) {
        Checkpoint[] storage checkpoints = _self.balances[_owner];
        //  requested before a check point was ever created for this token
        if (checkpoints.length == 0 || checkpoints[0].fromBlock > _blockNumber) {
            return 0;
        }

        // Shortcut for the actual value
        if (_blockNumber >= checkpoints[checkpoints.length-1].fromBlock) {
            return checkpoints[checkpoints.length-1].value;
        }

        return getValueAt(_self.balances[_owner], _blockNumber);
    }

    /// @notice Total amount of tokens at a specific `_blockNumber`.
    /// @param _blockNumber The block number when the totalSupply is queried
    /// @return The total amount of tokens at `_blockNumber`
    function totalSupplyAt(Supply storage _self, uint _blockNumber) public view returns(uint) {
        //  requested before a check point was ever created for this token
        if (_self.totalSupplyHistory.length == 0 || _self.totalSupplyHistory[0].fromBlock > _blockNumber) {
            return 0;
        }

        // Shortcut for the actual value
        if (_blockNumber >= _self.totalSupplyHistory[_self.totalSupplyHistory.length-1].fromBlock) {
            return _self.totalSupplyHistory[_self.totalSupplyHistory.length-1].value; //ERROR: move shortcut into method bellow
        }

        return getValueAt(_self.totalSupplyHistory, _blockNumber);
    }

////////////////
// Internal helper functions to query and set a value in a snapshot array
////////////////

    /// @dev `getValueAt` retrieves the number of tokens at a given block number
    /// @param checkpoints The history of values being queried
    /// @param _block The block number to retrieve the value at
    /// @return The number of tokens being queried
    function getValueAt(Checkpoint[] storage checkpoints, uint _block) private view returns (uint) { 
        // Binary search of the value in the array
        uint min = 0;
        uint max = checkpoints.length-1;
        while (max > min) {
            uint mid = (max + min + 1)/2;
            if (checkpoints[mid].fromBlock<=_block) {
                min = mid;
            } else {
                max = mid-1;
            }
        }
        return checkpoints[min].value;
    }

    /// @dev `updateValueAtNow` used to update the `balances` map and the
    ///  `totalSupplyHistory`
    /// @param checkpoints The history of data being updated
    /// @param _value The new number of tokens
    function updateValueAtNow(Checkpoint[] storage checkpoints, uint256 _value) private {
        if ((checkpoints.length == 0) || (checkpoints[checkpoints.length-1].fromBlock < block.number)) {
            Checkpoint storage newCheckPoint = checkpoints[checkpoints.length++];
            newCheckPoint.fromBlock = uint128(block.number);
            newCheckPoint.value = uint128(_value);
        } else {
            revert("Update in same block is not allowed. Please retry."); //improvement idea: use nonce instead of block number
        }
    }

    ///  @dev Function to stop minting new tokens.
    ///  @return True if the operation was successful.
    function finishMinting(Availability storage _self) public returns (bool) {
        if(_self.mintingPhaseFinished) {
            return false;
        }

        _self.mintingPhaseFinished = true;
        emit MintFinished();
        return true;
    }

    function reopenCrowdsale(Availability storage _self) public returns (bool) {
        if(_self.mintingPhaseFinished == false) {
            return false;
        }

        _self.mintingPhaseFinished = false;
        emit Reopened(msg.sender);
        return true;
    }

    function setPauseControl(Availability storage _self, address _pauseControl) public {
        require(_pauseControl != address(0));
        
        _self.pauseControl = _pauseControl;
    }

    function setTokenConfigured(Availability storage _self) public {
        _self.tokenConfigured = true;
    }

////////////////
// Pausing token for unforeseen reasons
////////////////

    /// @dev `pauseTransfer` is an alias for `enableTransfers` using the pauseControl modifier
    /// @param _transfersEnabled False if transfers are allowed
    function pauseTransfer(Availability storage _self, bool _transfersEnabled) public
    {
        _self.transfersPaused = !_transfersEnabled;

        if(_transfersEnabled) {
            emit TransferResumed(msg.sender);
        } else {
            emit TransferPaused(msg.sender);
        }
    }

    /// @dev `pauseMinting` can pause mint
    /// @param _mintingEnabled False if minting is allowed
    function pauseCapitalIncreaseOrDecrease(Availability storage _self, bool _mintingEnabled) public
    {
        _self.mintingPaused = (_mintingEnabled == false);
    }

    /** @dev Receives ether to be distriubted to all token owners*/
    function depositDividend(Store storage _self, uint256 msgValue, uint256 _currentSupply) //ERROR: msgValue ok?
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

    function claimDividend(Store storage _self, Supply storage _supply, uint256 _dividendIndex) public {
        // Loads the details for the specific Dividend payment
        Dividend storage dividend = _self.dividends[_dividendIndex];

        // Devidends should not have been claimed already
        require(dividend.claimed[msg.sender] == false);

         // Devidends should not have been recycled already
        require(dividend.recycled == false);

        // get the token balance at the time of the dividend distribution
        uint256 balance = balanceOfAt(_supply, msg.sender, dividend.blockNumber);

        // calculates the amount of dividends that can be claimed
        uint256 claim = balance.mul(dividend.amount).div(dividend.totalSupply);

        // flag that dividends have been claimed
        dividend.claimed[msg.sender] = true;
        dividend.claimedAmount = SafeMath.add(dividend.claimedAmount, claim);

        claimThis(dividend.dividendType, _dividendIndex, msg.sender, claim, dividend.dividendToken);
    }

    /** @dev Claim all dividiends
      * @notice In case function call runs out of gas run single address calls against claimDividend function
      */
    function claimDividendAll(Store storage _self, Supply storage _supply) public {
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
    function claimInBatches(Store storage _self, Supply storage _supply, uint256 startIndex, uint256 endIndex) public {
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

    //Error: geht zurück an wallet des owner
    function recycleDividend(Store storage _self, uint256 _dividendIndex, uint256 recycleLockedTimespan, uint256 _currentSupply) public {
        // Get the dividend distribution
        Dividend storage dividend = _self.dividends[_dividendIndex];

        // should not have been recycled already
        require(dividend.recycled == false);

        // The recycle time has to be over
        require(dividend.timestamp < SafeMath.sub(block.timestamp, recycleLockedTimespan));

        // Devidends should not have been claimed already
        require(dividend.claimed[msg.sender] == false);

        //
        //refund
        //

        // The amount, which has not been claimed is distributed to all other token owners
        _self.dividends[_dividendIndex].recycled = true;

        // calculates the amount of dividends that can be claimed
        uint256 claim = SafeMath.sub(dividend.amount, dividend.claimedAmount);

        // flag that dividends have been claimed
        dividend.claimed[msg.sender] = true;
        dividend.claimedAmount = SafeMath.add(dividend.claimedAmount, claim);

        claimThis(dividend.dividendType, _dividendIndex, msg.sender, claim, dividend.dividendToken);
        
        uint256 remainingAmount = SafeMath.sub(dividend.amount, dividend.claimedAmount);
        uint256 blockNumber = SafeMath.sub(block.number, 1);

        emit DividendRecycled(msg.sender, blockNumber, remainingAmount, _currentSupply, _dividendIndex);
    }

    function claimThis(DividendType _dividendType, uint256 _dividendIndex, address _beneficiary, uint256 _claim, address _dividendToken) 
    private 
    {
        // transfer the dividends to the token holder
        if (_claim > 0) {
            if (_dividendType == DividendType.Ether) { 
                _beneficiary.transfer(_claim);
            } 
            else if (_dividendType == DividendType.ERC20) { 
                require(ERC20(_dividendToken).transfer(_beneficiary, _claim));
            }
            else {
                revert("unknown type");
            }

            emit DividendClaimed(_beneficiary, _dividendIndex, _claim);
        }
    }

    //if this contract gets a balance in some other ERC20 contract - or even iself - then we can rescue it.
    function rescueToken(Availability storage _self, address _foreignTokenAddress, address _to) internal
    {
        require(_self.mintingPhaseFinished);
        ERC20(_foreignTokenAddress).transfer(_to, ERC20(_foreignTokenAddress).balanceOf(this));
    }

    event Transfer(address indexed from, address indexed to, uint256 value);
    event SelfApprovedTransfer(address indexed initiator, address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event MintDetailed(address indexed initiator, address indexed to, uint256 amount);
    event MintFinished();
    // event Burn(address indexed burner, uint256 value);
    // event BurnDetailed(address indexed initiator, address indexed burner, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TransferPaused(address indexed initiator);
    event TransferResumed(address indexed initiator);
    event Reopened(address indexed initiator);
    event DividendDeposited(address indexed _depositor, uint256 _blockNumber, uint256 _amount, uint256 _totalSupply, uint256 _dividendIndex);
    event DividendClaimed(address indexed _claimer, uint256 _dividendIndex, uint256 _claim);
    event DividendRecycled(address indexed _recycler, uint256 _blockNumber, uint256 _amount, uint256 _totalSupply, uint256 _dividendIndex);
}