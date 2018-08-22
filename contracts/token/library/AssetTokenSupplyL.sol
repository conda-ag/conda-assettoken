pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

library AssetTokenSupplyL {

    using SafeMath for uint256;

    struct Supply {
        // `balances` is the map that tracks the balance of each address, in this
        //  contract when the balance changes the block number that the change
        //  occurred is also included in the map
        mapping (address => Checkpoint[]) balances;

        // Tracks the history of the `totalSupply` of the token
        AssetTokenSupplyL.Checkpoint[] totalSupplyHistory;

        // `allowed` tracks any extra transfer rights as in all ERC20 tokens
        mapping (address => mapping (address => uint256)) allowed;
    }

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
    function doTransfer(Supply storage _self, address _from, address _to, uint256 _amount) internal {

        // Do not allow transfer to 0x0 or the token contract itself
        require(_to != address(0));
        require(_to != address(this));

        // If the amount being transfered is more than the balance of the
        //  account the transfer throws
        uint256 previousBalanceFrom = balanceOfAt(_self, _from, block.number);
        require(previousBalanceFrom >= _amount);

        // First update the balance array with the new value for the address
        //  sending the tokens
        updateValueAtNow(_self.balances[_from], previousBalanceFrom.sub(_amount));

        // Then update the balance array with the new value for the address
        //  receiving the tokens
        uint256 previousBalanceTo = balanceOfAt(_self, _to, block.number);
        require(previousBalanceTo + _amount >= previousBalanceTo); // Check for overflow
        
        updateValueAtNow(_self.balances[_to], previousBalanceTo.add(_amount));

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
    function transferFrom(Supply storage _self, address _from, address _to, uint256 _amount) public returns (bool success) {
        // The standard ERC 20 transferFrom functionality
        require(_self.allowed[_from][msg.sender] >= _amount);
        _self.allowed[_from][msg.sender].sub(_amount);

        doTransfer(_self, _from, _to, _amount);
        return true;
    }

    /// @notice Send `_amount` tokens to `_to` from `_from` WITHOUT approval. UseCase: notar transfers from lost wallet
    /// @param _from The address holding the tokens being transferred
    /// @param _to The address of the recipient
    /// @param _amount The amount of tokens to be transferred
    /// @return True if the transfer was successful
    function enforcedTransferFrom(Supply storage _self, address _from, address _to, uint256 _amount) internal returns (bool success) {
        doTransfer(_self, _from, _to, _amount);

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

////////////////
// Burn - only during minting 
////////////////

    /** @dev Burn someone's tokens (only allowed during minting phase). 
      * @param _who Eth address of person who's tokens should be burned.
      */
    function burn(Supply storage _self, address _who, uint256 _value) public {
        uint256 curTotalSupply = totalSupplyAt(_self, block.number);

        // Check for overflow
        require(curTotalSupply - _value <= curTotalSupply); 

        uint256 previousBalanceWho = balanceOfAt(_self, _who, block.number);

        require(_value <= previousBalanceWho);

        updateValueAtNow(_self.totalSupplyHistory, curTotalSupply.sub(_value));
        updateValueAtNow(_self.balances[_who], previousBalanceWho.sub(_value));

        emit Burn(_who, _value); //zeppelin compliant
        emit BurnDetailed(msg.sender, _who, _value);
        emit Transfer(_who, address(0), _value);
    }

////////////////
// Query balance and totalSupply in History
////////////////

    /// @dev Queries the balance of `_owner` at a specific `_blockNumber`
    /// @param _owner The address from which the balance will be retrieved
    /// @param _blockNumber The block number when the balance is queried
    /// @return The balance at `_blockNumber`
    function balanceOfAt(Supply storage _self, address _owner, uint _blockNumber) public view returns (uint256) {
        AssetTokenSupplyL.Checkpoint[] storage checkpoints = _self.balances[_owner];
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
            return _self.totalSupplyHistory[_self.totalSupplyHistory.length-1].value;
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
    function updateValueAtNow(Checkpoint[] storage checkpoints, uint256 _value) internal {
        if ((checkpoints.length == 0) || (checkpoints[checkpoints.length-1].fromBlock < block.number)) {
            Checkpoint storage newCheckPoint = checkpoints[checkpoints.length++];
            newCheckPoint.fromBlock = uint128(block.number);
            newCheckPoint.value = uint128(_value);
        } else { //TODO: ERROR?
            Checkpoint storage oldCheckPoint = checkpoints[checkpoints.length-1];
            oldCheckPoint.value = uint128(_value);
        }
    }

    event Transfer(address indexed from, address indexed to, uint256 value);
    event SelfApprovedTransfer(address indexed initiator, address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event MintDetailed(address indexed initiator, address indexed to, uint256 amount);
    event MintFinished();
    event Burn(address indexed burner, uint256 value);
    event BurnDetailed(address indexed initiator, address indexed burner, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}