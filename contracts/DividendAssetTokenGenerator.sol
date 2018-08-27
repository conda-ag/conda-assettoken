pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./token/library/AssetTokenSupplyL.sol";

import "./token/DividendAssetToken.sol";

/** @title AssetToken generator. */
contract DividendAssetTokenGenerator {
    /*
    * @title This contract can create project specific Crwd AssetToken
    * @author Paul Pöltner / Conda
    * @dev DividendAssetToken inherits from CRWDAssetToken which inherits from BasicAssetToken
    */

    using SafeMath for uint256;
    using AssetTokenSupplyL for AssetTokenSupplyL.Supply;
    
///////////////////
// Variables
///////////////////

    mapping (address => address[]) public assetToken;

///////////////////
// Events
///////////////////

    event TokenCreated(address tokenAddress, address owner);

////////////////
// AssetToken creation
////////////////

    /** @dev Generate a new AssetToken.
      * @return The token address of the generated token.
      */
    function generateToken() public returns (address tokenAddress) {
        // create the company Token
        DividendAssetToken token = new DividendAssetToken();
        token.transferOwnership(msg.sender);
        assetToken[msg.sender].push(address(token));
        emit TokenCreated(token, msg.sender);

        return address(token);
    }

    /** @dev Generate a token with assigned attributes.
      * @param _name The name of the token.
      * @param _symbol The symbol of the token.
      * @param _shortDescription The description of the token.
      * @return The token address of the generated token.
      */
    function generateTokenWithAttributes(
        string _name, 
        string _symbol, 
        string _shortDescription) 
        public returns (address tokenAddress) 
    {
        // create the company Token
        DividendAssetToken token = new DividendAssetToken();
        token.setMetaData(_name, _symbol, _shortDescription);
        token.transferOwnership(msg.sender);
        assetToken[msg.sender].push(address(token));
        emit TokenCreated(token, msg.sender);

        return address(token);
    }

    /** @dev Get the token addresses of the person executing the function.
        @return The token addresses of the message sender.
    */
    function getOwnTokens() public view returns (address[]) {
        return assetToken[msg.sender];
    }
}