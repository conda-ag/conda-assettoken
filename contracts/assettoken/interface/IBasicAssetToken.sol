pragma solidity ^0.4.24;

interface IBasicAssetToken {
    //AssetToken specific
    function getCap() external view returns (uint256);
    function isTokenAlive() external view returns (bool);

    //Mintable
    function mint(address _to, uint256 _amount) external returns (bool);
    function finishMinting() external returns (bool);

    //ERC20
    function balanceOf(address _owner) external view returns (uint256 balance);
    function approve(address _spender, uint256 _amount) external returns (bool success);
    function allowance(address _owner, address _spender) external view returns (uint256 remaining);
    function totalSupply() external view returns (uint);
    function increaseApproval(address _spender, uint _addedValue) external returns (bool);
    function decreaseApproval(address _spender, uint _subtractedValue) external returns (bool);
    function transfer(address _to, uint256 _amount) external returns (bool success);
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool success);
}