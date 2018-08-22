const EquityAssetTokenGenerator = artifacts.require('EquityAssetTokenGenerator.sol');
const BasicAssetToken = artifacts.require('BasicAssetToken.sol');

contract('EquityAssetTokenGenerator', (accounts) => {

    let token = null
  
    const capitalControl = accounts[1]

    beforeEach(async () => {
        token = await EquityAssetTokenGenerator.new()
    })

    contract('validating token generation', () => {
        it('no tokens in the beginning', async () => {
            let tokensOfUser = await token.getOwnTokens()
    
            assert.equal(tokensOfUser.length, 0)
        })

        it('generateToken with little arguments creates a token and assigns it to user', async () => {
            await token.generateToken(capitalControl)
            let tokensOfUser = await token.getOwnTokens()
    
            assert.equal(tokensOfUser.length, 1)
        })

        it('generateToken with many arguments creates a token and assigns it to user', async () => {
            const name ="MyName"
            const symbol ="SYM"
            const shortDescription ="My token description."
            
            await token.generateTokenWithAttributes(capitalControl, name, symbol, shortDescription)
            let tokensOfUser = await token.getOwnTokens()

            let tokenOfUser = BasicAssetToken.at(tokensOfUser[0])
            assert.equal(await tokenOfUser.name.call(), name)
            assert.equal(await tokenOfUser.symbol.call(), symbol)
            assert.equal(await tokenOfUser.shortDescription.call(), shortDescription)

            assert.equal(tokensOfUser.length, 1)
        })
    })

})
