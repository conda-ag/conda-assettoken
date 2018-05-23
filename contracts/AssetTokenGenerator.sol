pragma solidity ^0.4.23;

import "./token/BasicAssetToken.sol";


contract AssetTokenGenerator {

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

    function generateToken() public returns (address tokenAddress) {
        // create the company Token
        BasicAssetToken token = new BasicAssetToken();
        token.transferOwnership(msg.sender);
        assetToken[msg.sender].push(address(token));
        emit TokenCreated(token, msg.sender);

        return address(token);
    }

    function generateTokenWithAttributes(
        string _name, 
        string _symbol, 
        string _shortDescription) 
        public returns (address tokenAddress) 
    {
        // create the company Token
        BasicAssetToken token = new BasicAssetToken();
        token.setName(_name);
        token.setSymbol(_symbol);
        token.setShortDescription(_shortDescription);
        token.transferOwnership(msg.sender);
        assetToken[msg.sender].push(address(token));
        emit TokenCreated(token, msg.sender);

        return address(token);
    }

    function getOwnTokens() public view returns (address[]) {
        return assetToken[msg.sender];
    }
}