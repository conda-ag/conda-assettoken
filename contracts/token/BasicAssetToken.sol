pragma solidity ^0.4.24;

/*
    Copyright 2018, CONDA
    This contract is a fork from Jordi Baylina
    https://github.com/Giveth/minime/blob/master/contracts/MiniMeToken.sol

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

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./library/AssetTokenPauseL.sol";

/** @title Basic AssetToken. */
contract BasicAssetToken is Ownable {
    /*
    * @title This contract includes the basic AssetToken features
    * @author Paul Pöltner / Conda
    * @dev DividendAssetToken inherits from CRWDAssetToken which inherits from BasicAssetToken
    */

    using SafeMath for uint256;
    using AssetTokenPauseL for AssetTokenPauseL.Availability;

///////////////////
// Variables
///////////////////

    string public name;                 //The Token's name

    uint8 public decimals = 0;          //Number of decimals of the smallest unit

    string public symbol;               //An identifier

    string public version = "CRWD_0.1_alpha"; //An arbitrary versioning scheme

    // defines the baseCurrency of the token
    address public baseCurrency;

    // defines the base conversion of number of tokens to the initial rate
    // this amount will be used for regulatory checks. 
    uint256 public baseRate;

    string public shortDescription;

    /// @dev `Checkpoint` is the structure that attaches a block number to a
    ///  given value, the block number attached is the one that last changed the
    ///  value
    struct Checkpoint {

        // `fromBlock` is the block number that the value was generated from
        uint128 fromBlock;

        // `value` is the amount of tokens at a specific block number
        uint128 value;
    }

    // `balances` is the map that tracks the balance of each address, in this
    //  contract when the balance changes the block number that the change
    //  occurred is also included in the map
    mapping (address => Checkpoint[]) balances;

    // `allowed` tracks any extra transfer rights as in all ERC20 tokens
    mapping (address => mapping (address => uint256)) allowed;

    // Tracks the history of the `totalSupply` of the token
    Checkpoint[] totalSupplyHistory;
    
    // Crowdsale Contract
    address public crowdsale;

    //if set can mint/burn after finished. E.g. a notary.
    address public capitalControl;

    //availability: what's paused
    AssetTokenPauseL.Availability availability;
    function mintingAndBurningPaused() public view returns (bool) {
        return availability.mintingAndBurningPaused;
    }

    function pauseControl() public view returns (address) {
        return availability.pauseControl;
    }

    function transfersPaused() public view returns (bool) {
        return availability.transfersPaused;
    }

///////////////////
// Events
///////////////////

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event MintDetailed(address indexed initiator, address indexed to, uint256 amount);
    event MintFinished();
    event Burn(address indexed burner, uint256 value);
    event BurnDetailed(address indexed initiator, address indexed burner, uint256 value);
    event TransferPaused(address indexed initiator);
    event TransferResumed(address indexed initiator);
    event Reopened(address indexed initiator);

///////////////////
// Modifiers
///////////////////
    modifier onlyPauseControl() {
        require(msg.sender == availability.pauseControl);
        _;
    }

    modifier canMintOrBurn() {
        require(availability.tokenAlive);

        if (availability.crowdsalePhaseFinished == false) {
            require(msg.sender == owner);
            require(!availability.mintingAndBurningPaused);
            require(!availability.crowdsalePhaseFinished);
        }
        else {
            require(msg.sender == capitalControl);
        }
        _;
    }

    modifier canSetMetadata() {
        require(!availability.tokenAlive);
        require(!availability.crowdsalePhaseFinished);
        _;
    }

    modifier onlyCapitalControl() {
        require(msg.sender == capitalControl);
        _;
    }

    modifier onlyAlive() {
        require(availability.tokenAlive);
        _;
    }

    modifier onlyOwnerOrCrowdsale() {
        require(msg.sender == owner || msg.sender == crowdsale);
        _;
    }

///////////////////
// Set / Get Metadata
///////////////////

    /** @dev Change the token's metadata.
      * @param _name The name of the token.
      * @param _symbol The symbol of the token.
      * @param _shortDescription The description of the token.
      */
    function setMetaData(string _name, string _symbol, string _shortDescription) public 
    onlyOwner
    canSetMetadata 
    {
        name = _name;
        symbol = _symbol;
        shortDescription = _shortDescription;
    }

    /** @dev Change the token's currency metadata.
      * @param _tokenBaseCurrency Address of the token used as underlying base currency.
      * @param _baseRate Base conversion of number of tokens to the initial rate.
      */
    function setCurrencyMetaData(address _tokenBaseCurrency, uint256 _baseRate) public 
    onlyOwner
    canSetMetadata
    {
        require(_tokenBaseCurrency != address(0));
        require(_tokenBaseCurrency != address(this));
        require(_baseRate != 0);

        baseCurrency = _tokenBaseCurrency;
        baseRate = _baseRate;
    }

    /** @dev Set the address of the crowdsale contract.
      * @param _crowdsale The address of the crowdsale.
      */
    function setCrowdsaleAddress(address _crowdsale) public onlyOwner canSetMetadata {
        require(_crowdsale != address(0));

        crowdsale = _crowdsale;
    }

    function setCapitalControl(address _capitalControl) public onlyOwner canSetMetadata {
        capitalControl = _capitalControl;
    }

    function updateCapitalControl(address _capitalControl) public onlyCapitalControl {
        capitalControl = _capitalControl;
    }

    function setPauseControl(address _pauseControl) public 
    onlyOwnerOrCrowdsale
    {
        availability.setPauseControl(_pauseControl);
    }

    function setTokenAlive() public 
    onlyOwnerOrCrowdsale
    {
        availability.setTokenAlive();
    }

///////////////////
// ERC20 Methods
///////////////////

    /// @notice Send `_amount` tokens to `_to` from `msg.sender`
    /// @param _to The address of the recipient
    /// @param _amount The amount of tokens to be transferred
    /// @return Whether the transfer was successful or not
    function transfer(address _to, uint256 _amount) public returns (bool success) {
        require(!availability.transfersPaused);
        doTransfer(msg.sender, _to, _amount);
        return true;
    }

    /// @notice Send `_amount` tokens to `_to` from `_from` on the condition it
    ///  is approved by `_from`
    /// @param _from The address holding the tokens being transferred
    /// @param _to The address of the recipient
    /// @param _amount The amount of tokens to be transferred
    /// @return True if the transfer was successful
    function transferFrom(address _from, address _to, uint256 _amount) public returns (bool success) {
        require(!availability.transfersPaused);

        // The standard ERC 20 transferFrom functionality
        require(allowed[_from][msg.sender] >= _amount);
        allowed[_from][msg.sender].sub(_amount);

        doTransfer(_from, _to, _amount);
        return true;
    }

    /// @dev This is the actual transfer function in the token contract, it can
    ///  only be called by other functions in this contract.
    /// @param _from The address holding the tokens being transferred
    /// @param _to The address of the recipient
    /// @param _amount The amount of tokens to be transferred
    /// @return True if the transfer was successful
    function doTransfer(address _from, address _to, uint256 _amount) internal {

        // Do not allow transfer to 0x0 or the token contract itself
        require(_to != address(0));
        require(_to != address(this));

        // If the amount being transfered is more than the balance of the
        //  account the transfer throws
        uint256 previousBalanceFrom = balanceOfAt(_from, block.number);
        require(previousBalanceFrom >= _amount);

        // First update the balance array with the new value for the address
        //  sending the tokens
        updateValueAtNow(balances[_from], previousBalanceFrom.sub(_amount));

        // Then update the balance array with the new value for the address
        //  receiving the tokens
        uint256 previousBalanceTo = balanceOfAt(_to, block.number);
        require(previousBalanceTo + _amount >= previousBalanceTo); // Check for overflow
        
        updateValueAtNow(balances[_to], previousBalanceTo.add(_amount));

        // An event to make the transfer easy to find on the blockchain
        emit Transfer(_from, _to, _amount);

    }

    /// @param _owner The address that's balance is being requested
    /// @return The balance of `_owner` at the current block
    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balanceOfAt(_owner, block.number);
    }

    /// @notice `msg.sender` approves `_spender` to spend `_amount` tokens on
    ///  its behalf. This is a modified version of the ERC20 approve function
    ///  to be a little bit safer
    /// @param _spender The address of the account able to transfer the tokens
    /// @param _amount The amount of tokens to be approved for transfer
    /// @return True if the approval was successful
    function approve(address _spender, uint256 _amount) public returns (bool success) {
        require(!availability.transfersPaused);

        // To change the approve amount you first have to reduce the addresses`
        //  allowance to zero by calling `approve(_spender,0)` if it is not
        //  already 0 to mitigate the race condition described here:
        //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
        require((_amount == 0) || (allowed[msg.sender][_spender] == 0));

        allowed[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    /// @dev This function makes it easy to read the `allowed[]` map
    /// @param _owner The address of the account that owns the token
    /// @param _spender The address of the account able to transfer the tokens
    /// @return Amount of remaining tokens of _owner that _spender is allowed
    ///  to spend
    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

     /// @dev This function makes it easy to get the total number of tokens
    /// @return The total number of tokens
    function totalSupply() public view returns (uint) {
        return totalSupplyAt(block.number);
    }


    /// @dev Increase the amount of tokens that an owner allowed to a spender.
    /// 
    /// approve should be called when allowed[_spender] == 0. To increment
    ///  allowed value is better to use this function to avoid 2 calls (and wait until
    ///  the first transaction is mined)
    ///  From MonolithDAO Token.sol
    /// @param _spender The address which will spend the funds.
    ///  @param _addedValue The amount of tokens to increase the allowance by.
    function increaseApproval(address _spender, uint _addedValue) public returns (bool) {
        allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
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
    function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool) {
        uint oldValue = allowed[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowed[msg.sender][_spender] = 0;
        } else {
            allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

////////////////
// Miniting 
////////////////

    /// @dev Function to mint tokens
    /// @param _to The address that will receive the minted tokens.
    /// @param _amount The amount of tokens to mint.
    /// @return A boolean that indicates if the operation was successful.
    function mint(address _to, uint256 _amount) public canMintOrBurn returns (bool) {
        uint256 curTotalSupply = totalSupply();

        // Check for overflow
        require(curTotalSupply + _amount >= curTotalSupply); 
        uint256 previousBalanceTo = balanceOf(_to);

        // Check for overflow
        require(previousBalanceTo + _amount >= previousBalanceTo); 

        updateValueAtNow(totalSupplyHistory, curTotalSupply.add(_amount));
        updateValueAtNow(balances[_to], previousBalanceTo.add(_amount));

        emit Mint(_to, _amount); //zeppelin compliant
        emit MintDetailed(msg.sender, _to, _amount);
        emit Transfer(address(0), _to, _amount);

        return true;
    }

    ///  @dev Function to stop minting new tokens and also disables burning so it finishes crowdsale. 
    ///  @return True if the operation was successful.
    function finishMinting() public onlyOwner canMintOrBurn returns (bool) {
        return availability.finishMinting();
    }

////////////////
// Burn - only during minting 
////////////////

    /** @dev Burn someone's tokens (only allowed during minting phase). 
      * @param _who Eth address of person who's tokens should be burned.
      */
    function burn(address _who, uint256 _value) public canMintOrBurn {
        uint256 curTotalSupply = totalSupply();

        // Check for overflow
        require(curTotalSupply - _value <= curTotalSupply); 

        uint256 previousBalanceWho = balanceOf(_who);

        require(_value <= previousBalanceWho);

        updateValueAtNow(totalSupplyHistory, curTotalSupply.sub(_value));
        updateValueAtNow(balances[_who], previousBalanceWho.sub(_value));

        emit Burn(_who, _value); //zeppelin compliant
        emit BurnDetailed(msg.sender, _who, _value);
        emit Transfer(_who, address(0), _value);
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
        
        require(availability.reopenCrowdsale());
    }

////////////////
// Query balance and totalSupply in History
////////////////

    /// @dev Queries the balance of `_owner` at a specific `_blockNumber`
    /// @param _owner The address from which the balance will be retrieved
    /// @param _blockNumber The block number when the balance is queried
    /// @return The balance at `_blockNumber`
    function balanceOfAt(address _owner, uint _blockNumber) public view returns (uint256) {
        Checkpoint[] storage checkpoints = balances[_owner];
        //  requested before a check point was ever created for this token
        if (checkpoints.length == 0 || checkpoints[0].fromBlock > _blockNumber) {
            return 0;
        }

        // Shortcut for the actual value
        if (_blockNumber >= checkpoints[checkpoints.length-1].fromBlock) {
            return checkpoints[checkpoints.length-1].value;
        }

        return getValueAt(balances[_owner], _blockNumber);
    }

    /// @notice Total amount of tokens at a specific `_blockNumber`.
    /// @param _blockNumber The block number when the totalSupply is queried
    /// @return The total amount of tokens at `_blockNumber`
    function totalSupplyAt(uint _blockNumber) public view returns(uint) {
        //  requested before a check point was ever created for this token
        if (totalSupplyHistory.length == 0 || totalSupplyHistory[0].fromBlock > _blockNumber) {
            return 0;
        }

        // Shortcut for the actual value
        if (_blockNumber >= totalSupplyHistory[totalSupplyHistory.length-1].fromBlock) {
            return totalSupplyHistory[totalSupplyHistory.length-1].value;
        }

        return getValueAt(totalSupplyHistory, _blockNumber);
    }

////////////////
// Enable tokens transfers
////////////////

    /// @notice Enables token holders to transfer their tokens freely if true
    /// @param _transfersEnabled True if transfers are allowed
    function enableTransfers(bool _transfersEnabled) public onlyOwner {
        availability.transfersPaused = (_transfersEnabled == false);
    }

////////////////
// Pausing token for unforeseen reasons
////////////////

    /// @dev `pauseTransfer` is an alias for `enableTransfers` using the pauseControl modifier
    /// @param _transfersEnabled False if transfers are allowed
    function pauseTransfer(bool _transfersEnabled) public
    onlyPauseControl
    {
        availability.transfersPaused = (_transfersEnabled == false);
    }

    /// @dev `pauseMinting` can pause mint/burn
    /// @param _mintingAndBurningEnabled False if minting/burning is allowed
    function pauseCapitalIncreaseOrDecrease(bool _mintingAndBurningEnabled) public
    onlyPauseControl
    {
        availability.pauseCapitalIncreaseOrDecrease(_mintingAndBurningEnabled);
    }

////////////////
// Internal helper functions to query and set a value in a snapshot array
////////////////

    /// @dev `getValueAt` retrieves the number of tokens at a given block number
    /// @param checkpoints The history of values being queried
    /// @param _block The block number to retrieve the value at
    /// @return The number of tokens being queried
    function getValueAt(Checkpoint[] storage checkpoints, uint _block) view private returns (uint) {
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

}