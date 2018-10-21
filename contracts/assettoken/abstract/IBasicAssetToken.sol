pragma solidity ^0.4.24;

contract IBasicAssetToken {
    function checkCanSetMetadata() internal returns (bool);

    function setMetaData(string _name, string _symbol) public;
    function setCurrencyMetaData(address _tokenBaseCurrency) public;
    function setMintControl(address _mintControl) public;
    
    function getPauseControl() public view returns (address);
    function isTransfersPaused() public view returns (bool);

    function setRoles(address _pauseControl, address _tokenRescueControl) public;

    function setTokenAlive() public;
    function isTokenAlive() public view returns (bool);

    function balanceOf(address _owner) public view returns (uint256 balance);

    function approve(address _spender, uint256 _amount) public returns (bool success);

    function allowance(address _owner, address _spender) public view returns (uint256 remaining);

    function totalSupply() public view returns (uint);

    function increaseApproval(address _spender, uint _addedValue) public returns (bool);

    function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool);

    function finishMinting() public returns (bool);

    function rescueToken(address _foreignTokenAddress, address _to) public;

    function balanceOfAt(address _owner, uint _blockNumber) public view returns (uint256);

    function totalSupplyAt(uint _blockNumber) public view returns(uint);

    function enableTransfers(bool _transfersEnabled) public;

    function pauseTransfer(bool _transfersEnabled) public;

    function pauseCapitalIncreaseOrDecrease(bool _mintingEnabled) public;    

    function isMintingPaused() public view returns (bool);

    function mint(address _to, uint256 _amount) public returns (bool);

    function transfer(address _to, uint256 _amount) public returns (bool success);

    function transferFrom(address _from, address _to, uint256 _amount) public returns (bool success);

    function enableTransferInternal(bool _transfersEnabled) internal;

    function reopenCrowdsaleInternal() internal returns (bool);

    function enforcedTransferFromInternal(address _from, address _to, uint256 _value, bool _fullAmountRequired) internal returns (bool);

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event MintDetailed(address indexed initiator, address indexed to, uint256 amount);
    event MintFinished();
    event TransferPaused(address indexed initiator);
    event TransferResumed(address indexed initiator);
    event Reopened(address indexed initiator);
}