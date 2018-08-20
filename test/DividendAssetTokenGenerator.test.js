const DividendAssetTokenGenerator = artifacts.require('DividendAssetTokenGenerator.sol');
const BasicAssetToken = artifacts.require('BasicAssetToken.sol');

contract('DividendAssetTokenGenerator', (accounts) => {

    let token = null
  
    beforeEach(async () => {
        token = await DividendAssetTokenGenerator.new()
    })

    contract('validating token generation', () => {
        it('no tokens in the beginning', async () => {
            let tokensOfUser = await token.getOwnTokens()
    
            assert.equal(tokensOfUser.length, 0)
        })

        it('generateToken without arguments creates a token and assigns it to user', async () => {
            await token.generateToken()
            let tokensOfUser = await token.getOwnTokens()
    
            assert.equal(tokensOfUser.length, 1)
        })

        it('generateToken with arguments creates a token and assigns it to user', async () => {
            const name ="MyName"
            const symbol ="SYM"
            const shortDescription ="My token description."
            
            await token.generateTokenWithAttributes(name, symbol, shortDescription)
            let tokensOfUser = await token.getOwnTokens()

            let tokenOfUser = BasicAssetToken.at(tokensOfUser[0])
            assert.equal(await tokenOfUser.name.call(), name)
            assert.equal(await tokenOfUser.symbol.call(), symbol)
            assert.equal(await tokenOfUser.shortDescription.call(), shortDescription)

            assert.equal(tokensOfUser.length, 1)
        })
    })

})
