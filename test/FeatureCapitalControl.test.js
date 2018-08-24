let EVMRevert = require('openzeppelin-solidity/test/helpers/assertRevert')

const FeatureCapitalControl = artifacts.require('FeatureCapitalControl.sol')
const ERC20TestToken = artifacts.require('ERC20TestToken.sol')
const MOCKCRWDClearing = artifacts.require('MOCKCRWDClearing.sol')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('FeatureCapitalControl', (accounts) => {
    let token = null
    let owner = null

    let clearing = null

    let eurt = null

    const buyerA = accounts[1]
    
    const capitalControl = accounts[5]

    const unknown = accounts[9]
  
    beforeEach(async () => {
        token = await FeatureCapitalControl.new(capitalControl, false)
        owner = await token.owner()

        //mock clearing so it doesn't cost money
        clearing = await MOCKCRWDClearing.new()
        await clearing.setFee((await ERC20TestToken.new()).address, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS)
        await token.setClearingAddress(clearing.address)

        eurt = await ERC20TestToken.new()
        
        owner.should.not.eq(ZERO_ADDRESS)
        assert.equal(await token.totalSupply(), 0)
    })

    contract('validating updateCapitalControl()', () => {
        it('updateCapitalControl() cannot be set by owner when not yet alive', async () => {
            await token.updateCapitalControl(buyerA, {from: owner}).should.be.rejectedWith(EVMRevert)
        })

        it('updateCapitalControl() cannot be set by unknown', async () => {
            await token.updateCapitalControl(buyerA, {from: unknown}).should.be.rejectedWith(EVMRevert)
        })

        it('updateCapitalControl() can be set by capitalControl when alive', async () => {
            await token.setCapitalControl(capitalControl, {from: owner})
            await token.setTokenAlive({from: owner})
            await token.updateCapitalControl(buyerA, {from: owner}).should.be.rejectedWith(EVMRevert)
        })

        it('updateCapitalControl() cannot be set by owner even when alive', async () => {
            await token.setTokenAlive({from: owner})
            await token.updateCapitalControl(buyerA, {from: owner}).should.be.rejectedWith(EVMRevert)
        })

        it('updateCapitalControl() cannot be set by unknown when alive', async () => {
            await token.setTokenAlive({from: owner})
            await token.updateCapitalControl(buyerA, {from: unknown}).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating setCapitalControl()', () => {
        it('setCapitalControl() can be set by owner when not alive', async () => {
            await token.setCapitalControl(capitalControl, {from: owner})
        })

        it('setCapitalControl() cannot be set by unknown', async () => {
            await token.setCapitalControl(capitalControl, {from: unknown}).should.be.rejectedWith(EVMRevert)
        })

        it('setCapitalControl() cannot be set when alive', async () => {
            await token.setTokenAlive({from: owner})
            await token.setCapitalControl(capitalControl, {from: owner}).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('mint as capitalControl', () => {
        it('can mint as capitalControl even when finished capital increase/decrease phase', async () => {
            await token.setCapitalControl(capitalControl, {from: owner})
            await token.setTokenAlive({from: owner})
            await token.finishMinting()
            await token.mint(buyerA, 10, {from: capitalControl}) //works because capitalControl
        })
    })

    contract('validating reopenCrowdsale()', () => {
        it('can reopen crowdsale as capitalControl', async () => {
            await token.setCapitalControl(capitalControl, {from: owner})
            await token.setTokenAlive({from: owner})
            await token.finishMinting()
            await token.mint(buyerA, 10, {from: capitalControl}) //works because capitalControl
            await token.mint(buyerA, 10).should.be.rejectedWith(EVMRevert) //not possible when finished
            
            const newCrowdsale = await ERC20TestToken.new()
            await token.reopenCrowdsale(newCrowdsale.address, {from: capitalControl})

            await token.mint(buyerA, 10) //now possible again...

            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 20)
        })

        it('cannot reopen crowdsale as non-capitalControl', async () => {
            await token.setTokenAlive({from: owner})
            await token.finishMinting()
            
            const newCrowdsale = await ERC20TestToken.new()
            await token.reopenCrowdsale(newCrowdsale.address, {from: unknown}).should.be.rejectedWith(EVMRevert)
        })

        contract('validating burn as capitalControl', () => {
            it('can burn as capitalControl even when finished capital increase/decrease phase', async () => {
                await token.setCapitalControl(capitalControl, {from: owner})
                await token.setTokenAlive({from: owner})
                await token.mint(buyerA, 100)

                await token.finishMinting()
                await token.burn(buyerA, 10, {from: capitalControl}) //works because capitalControl

                let firstAccountBalance = await token.balanceOf(buyerA)
                assert.equal(firstAccountBalance, 90)

                let totalSupply = await token.totalSupply()
                assert.equal(totalSupply, 90)
            })
        })
    })
})