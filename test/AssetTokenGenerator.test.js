const AssetTokenGenerator = artifacts.require('AssetTokenGenerator.sol');
const BasicAssetToken = artifacts.require('BasicAssetToken.sol');

contract('AssetTokenGenerator', function (accounts) {

    let token = null;
  
    beforeEach(async function () {
        token = await AssetTokenGenerator.new();
    });

    contract('validating token generation', function () {
        it('no tokens in the beginning', async function () {
            let tokensOfUser = await token.getOwnTokens();
    
            assert.equal(tokensOfUser.length, 0);
        });

        it('generateToken without arguments creates a token and assigns it to user', async function () {
            await token.generateToken();
            let tokensOfUser = await token.getOwnTokens();
    
            assert.equal(tokensOfUser.length, 1);
        });

        it('generateToken with arguments creates a token and assigns it to user', async function () {
            const name ="MyName";
            const symbol ="SYM";
            const shortDescription ="My token description.";
            
            await token.generateTokenWithAttributes(name, symbol, shortDescription);
            let tokensOfUser = await token.getOwnTokens();

            let tokenOfUser = BasicAssetToken.at(tokensOfUser[0]);
            assert.equal(await tokenOfUser.name.call(), name);
            assert.equal(await tokenOfUser.symbol.call(), symbol);
            assert.equal(await tokenOfUser.shortDescription.call(), shortDescription);

            assert.equal(tokensOfUser.length, 1);
        });
    });

});
