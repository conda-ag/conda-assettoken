pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./library/AssetTokenPauseL.sol";
import "./library/AssetTokenSupplyL.sol";

import "./BasicAssetToken.sol";
import "../interfaces/ICRWDClearing.sol";

/** @title CRWD AssetToken. */
contract CRWDAssetToken is BasicAssetToken {
    /*
    * @title This contract is the Crwd AssetToken created for each project via an AssetTokenGenerator
    * @author Paul Pöltner / Conda
    * @dev DividendAssetToken inherits from CRWDAssetToken which inherits from BasicAssetToken
    */

    using SafeMath for uint256;
    using AssetTokenPauseL for AssetTokenPauseL.Availability;
    using AssetTokenSupplyL for AssetTokenSupplyL.Supply;

    address public clearingAddress;

    /** @dev ERC20 transfer function overlay to transfer tokens and do clearing.
      * @param _to The recipient address.
      * @param _amount The amount.
      * @return A boolean that indicates if the operation was successful.
      */
    function transfer(address _to, uint256 _amount) public returns (bool success) {
        uint256 transferValue = _amount.mul(baseRate).div(1000);
        ICRWDClearing(clearingAddress).clearFunds(baseCurrency, msg.sender, _to, transferValue);
        return super.transfer(_to, _amount);
    }

    /** @dev ERC20 transferFrom function overlay to transfer tokens and do clearing.
      * @param _from The sender address (requires approval).
      * @param _to The recipient address.
      * @param _amount The amount.
      * @return A boolean that indicates if the operation was successful.
      */
    function transferFrom(address _from, address _to, uint256 _amount) public returns (bool success) {
        uint256 transferValue = _amount.mul(baseRate).div(1000);
        ICRWDClearing(clearingAddress).clearFunds(baseCurrency, _from, _to, transferValue);
        return super.transferFrom(_from, _to, _amount);
    }

    /** @dev Mint function overlay to mint/create tokens and do clearing.
      * @param _to The address that will receive the minted tokens.
      * @param _amount The amount of tokens to mint.
      * @return A boolean that indicates if the operation was successful.
      */
    function mint(address _to, uint256 _amount) public canMintOrBurn returns (bool) {
        uint256 amountInBaseRate = _amount.mul(baseRate);
        uint256 transferValue = amountInBaseRate.div(1000);
        ICRWDClearing(clearingAddress).clearFunds(baseCurrency, _to, _to, transferValue);
        return super.mint(_to,_amount);
    }

    /** @dev Set clearing address that receives clearing.
      * @param _clearingAddress Address to be used for clearing.
      */
    function setClearingAddress(address _clearingAddress) public onlyOwner {
        clearingAddress = _clearingAddress;
    }
}