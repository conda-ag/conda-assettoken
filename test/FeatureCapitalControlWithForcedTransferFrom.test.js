let EVMRevert = require('openzeppelin-solidity/test/helpers/assertRevert')

const FeatureCapitalControlWithForcedTransferFrom = artifacts.require('EquityAssetToken.sol')
const ERC20TestToken = artifacts.require('ERC20TestToken.sol')
const MOCKCRWDClearing = artifacts.require('MOCKCRWDClearing.sol')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('FeatureCapitalControlWithForcedTransferFrom', (accounts) => {
    let token = null
    let owner = null

    let clearing = null

    let eurt = null

    let buyerA = accounts[1]
    let buyerB = accounts[2]
    let buyerC = accounts[3]
    let buyerD = accounts[4]
    let buyerE = accounts[5]
    
    const capitalControl = accounts[6]

    let mintControl = accounts[7]

    const unknown = accounts[9]
  
    beforeEach(async () => {
        token = await FeatureCapitalControlWithForcedTransferFrom.new(capitalControl)
        await token.setMintControl(mintControl)
        owner = await token.owner()
        
        //mock clearing so it doesn't cost money
        clearing = await MOCKCRWDClearing.new()
        await clearing.setFee((await ERC20TestToken.new()).address, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS)
        await token.setClearingAddress(clearing.address)
        await token.setMetaData("", "", ZERO_ADDRESS, (1000000 * 1e18))

        assert.equal((await token.decimals()).toString(), 0)

        //split
        await token.mint(buyerA, 100, { from: capitalControl }) //10%
        await token.mint(buyerB, 250, { from: capitalControl }) //25%
        await token.mint(buyerD, 500, { from: capitalControl }) //50%
        await token.mint(buyerE, 150, { from: capitalControl }) //15%
        assert.equal((await token.totalSupply()).toString(), '1000')
    })

    // contract('validating updateCapitalControl()', () => {
    //     it('updateCapitalControl() cannot be set by owner when not yet alive', async () => {
    //         await token.updateCapitalControl(buyerA, {from: owner}).should.be.rejectedWith(EVMRevert)
    //     })

    //     it('updateCapitalControl() cannot be set by unknown', async () => {
    //         await token.updateCapitalControl(buyerA, {from: unknown}).should.be.rejectedWith(EVMRevert)
    //     })

    //     it('updateCapitalControl() can be set by capitalControl when alive', async () => {
    //         await token.setCapitalControl(capitalControl, {from: owner})
    //         await token.setTokenAlive({from: owner})
    //         await token.updateCapitalControl(buyerA, {from: owner}).should.be.rejectedWith(EVMRevert)
    //     })

    //     it('updateCapitalControl() cannot be set by owner even when alive', async () => {
    //         await token.setTokenAlive({from: owner})
    //         await token.updateCapitalControl(buyerA, {from: owner}).should.be.rejectedWith(EVMRevert)
    //     })

    //     it('updateCapitalControl() cannot be set by unknown when alive', async () => {
    //         await token.setTokenAlive({from: owner})
    //         await token.updateCapitalControl(buyerA, {from: unknown}).should.be.rejectedWith(EVMRevert)
    //     })
    // })

    // contract('validating setCapitalControl()', () => {
    //     it('setCapitalControl() can be set by owner when not alive', async () => {
    //         await token.setCapitalControl(capitalControl, {from: owner})
    //     })

    //     it('setCapitalControl() cannot be set by unknown', async () => {
    //         await token.setCapitalControl(capitalControl, {from: unknown}).should.be.rejectedWith(EVMRevert)
    //     })

    //     it('setCapitalControl() cannot be set when alive', async () => {
    //         await token.setTokenAlive({from: owner})
    //         await token.setCapitalControl(capitalControl, {from: owner}).should.be.rejectedWith(EVMRevert)
    //     })
    // })

    // contract('mint as capitalControl', () => {
    //     it('can mint as capitalControl even when finished capital increase/decrease phase', async () => {
    //         await token.setCapitalControl(capitalControl, {from: owner})
    //         await token.setTokenAlive({from: owner})
    //         await token.finishMinting({from: owner})
    //         await token.mint(buyerA, 10, {from: capitalControl}) //works because capitalControl
    //     })
    // })

    // contract('validating reopenCrowdsale()', () => {
    //     it('can reopen crowdsale as capitalControl', async () => {
    //         await token.setCapitalControl(capitalControl, {from: owner})
    //         await token.setTokenAlive({from: owner})
    //         await token.finishMinting({from: owner})
    //         await token.mint(buyerA, 10, {from: capitalControl}) //works because capitalControl
    //         await token.mint(buyerA, 10, {from: mintControl}).should.be.rejectedWith(EVMRevert) //not possible when finished
            
    //         await token.reopenCrowdsale({from: capitalControl})

    //         await token.mint(buyerA, 10, {from: unknown}).should.be.rejectedWith(EVMRevert)

    //         let firstAccountBalance = await token.balanceOf(buyerA)
    //         assert.equal(firstAccountBalance.toString(), '110')
    //     })

    //     it('cannot reopen crowdsale as owner', async () => {
    //         await token.setTokenAlive({from: owner})
    //         await token.finishMinting({from: owner})
            
    //         await token.reopenCrowdsale({from: owner}).should.be.rejectedWith(EVMRevert)
    //     })

    //     it('cannot reopen crowdsale as non-capitalControl', async () => {
    //         await token.setTokenAlive({from: owner})
    //         await token.finishMinting({from: owner})
            
    //         await token.reopenCrowdsale({from: unknown}).should.be.rejectedWith(EVMRevert)
    //     })
    // })

    // contract('validating forced transferFrom() for lost wallet', () => {
    //     it('can transfer full amount of someone ', async () => {
    //     })
    // })

    it('lost wallet: enforced transferFrom() without approval as capitalControl ', async () => {
        const transfersEnabled = true
        const finishMinting = true
        await forcedTransferFromTest(transfersEnabled, finishMinting, 100, {from: capitalControl}, false)
    })

    it('lost wallet(transfer disabled): enforced transferFrom() without approval as capitalControl', async () => {
        const transfersEnabled = false
        const finishMinting = true
        await forcedTransferFromTest(transfersEnabled, finishMinting, 100, {from: capitalControl}, false)
    })

    it('lost wallet(transfer disabled): enforced transferFrom() without approval as capitalControl ', async () => {
        const transfersEnabled = true
        const finishMinting = false
        await forcedTransferFromTest(transfersEnabled, finishMinting, 100, {from: capitalControl}, false)
    })

    it('lost wallet(transfer disabled): not possible as owner', async () => {
        const transfersEnabled = true
        const finishMinting = true
        await forcedTransferFromTest(transfersEnabled, finishMinting, 0, {from: owner}, true)
    })

    const forcedTransferFromTest = async (transfersEnabled, finishMinting, expectedChangeAmount, options, expectFail) => {
        const tmpToken = await FeatureCapitalControlWithForcedTransferFrom.new(capitalControl)
        await tmpToken.setClearingAddress(clearing.address)
    
        await tmpToken.setMetaData("", "", ZERO_ADDRESS, (1000000 * 1e18))

        await tmpToken.setTokenAlive()
    
        await tmpToken.mint(buyerA, 100, { from: capitalControl }) //buyerA has 100
    
        await tmpToken.enableTransfers(transfersEnabled, options)
    
        if(finishMinting){
            await tmpToken.finishMinting()
        }
    
        const balanceBuyerABefore = await tmpToken.balanceOf(buyerA)
        const balanceBuyerBBefore = await tmpToken.balanceOf(buyerB)
        const balanceBuyerCBefore = await tmpToken.balanceOf(buyerC)
        assert.equal(balanceBuyerABefore.toString(), '100', 'prerequisit: buyerA needs tokens')
    
        // await tmpToken.approve(capitalControl, 100, {from: buyerA}) //DON'T
        if(expectFail) {
            await tmpToken.transferFrom(buyerA, buyerC, 100, options).should.be.rejectedWith(EVMRevert)
        } else {
            await tmpToken.transferFrom(buyerA, buyerC, 100, options) //capitalControl passes money without approval
        }

        const balanceBuyerAAfter = await tmpToken.balanceOf(buyerA)
        const balanceBuyerBAfter = await tmpToken.balanceOf(buyerB)
        const balanceBuyerCAfter = await tmpToken.balanceOf(buyerC)
    
        assert.equal(balanceBuyerAAfter.toString(), (balanceBuyerABefore.toNumber()-expectedChangeAmount).toString(), "balanceBuyerA was unexpected")
        assert.equal(balanceBuyerBAfter.toString(), balanceBuyerBBefore.toString(), "balanceBuyerB was unexpected")
        assert.equal(balanceBuyerCAfter.toString(), (balanceBuyerCBefore.toNumber()+expectedChangeAmount).toString(), "balanceBuyerC was unexpected")
    }
})