pragma solidity ^0.4.24;

interface IBasicAssetToken {
    function getCap() external view returns (uint256);
    function isTokenAlive() external view returns (bool);
}