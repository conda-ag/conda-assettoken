let EVMRevert = require('openzeppelin-solidity/test/helpers/assertRevert')

const BasicAssetToken = artifacts.require('BasicAssetToken.sol')
const ERC20TestToken = artifacts.require('ERC20TestToken.sol')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('BasicAssetToken', (accounts) => {
    let token = null
    let owner = null

    const buyerA = accounts[1]
    const buyerB = accounts[2]
    const buyerC = accounts[3]

    const pauseControl = accounts[4]

    const unknown = accounts[9]
  
    beforeEach(async () => {
        token = await BasicAssetToken.new()
        owner = await token.owner()
        owner.should.not.eq(ZERO_ADDRESS)
        assert.equal(await token.totalSupply(), 0)
    })

    contract('validating setting of crowdsale address', () => {
        it('address 0x0 is reverted', async () => {
            await token.setCrowdsaleAddress(ZERO_ADDRESS).should.be.rejectedWith(EVMRevert)
        })

        it('can set erc20 address as crowdsale address', async () => {
            let anyErc20Token = await ERC20TestToken.new()

            await token.setCrowdsaleAddress(anyErc20Token.address)

            assert.notEqual(anyErc20Token.address, ZERO_ADDRESS)
            assert.equal(await token.crowdsale.call(), anyErc20Token.address)
        })
    })

    contract('validating totalSupply', () => {
        it('0 totalSupply in the beginning', async () => {
            let totalSupply = await token.totalSupply()
    
            assert.equal(totalSupply, 0)
        })

        it('when A mints 100 totalSupply should be 100', async () => {
            await token.mint(buyerA, 100)

            let totalSupply = await token.totalSupply()
    
            assert.equal(totalSupply, 100)
        })

        it('when A and B both mint 100 totalSupply should be 200', async () => {
            await token.mint(buyerA, 100)
            await token.mint(buyerB, 100)

            let totalSupply = await token.totalSupply()
    
            assert.equal(totalSupply, 200)
        })
    })

    contract('validating mint', () => {
        it('instant call of balances ', async () => {
            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 0)
        })

        it('should return correct balances after mint ', async () => {
            await token.mint(buyerA, 100)
            await token.mint(buyerA, 100)
      
            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 200)
        })

        it('should throw an error when trying to mint but finished minting', async () => {
            await token.finishMinting()
            await token.mint(buyerA, 100).should.be.rejectedWith(EVMRevert)
        })

        contract('validating mint when paused', () => {
            it('trying to mint when minting is paused should fail', async () => {
                await token.mint(buyerA, 10) //works
                await token.setPauseControl(pauseControl, {from: owner})
                await token.pauseCapitalIncreaseOrDecrease(false, {from: pauseControl}) //now disabled
                assert.equal(await token.mintingAndBurningPaused(), true, "as precondition minting must be paused")

                await token.mint(buyerA, 10).should.be.rejectedWith(EVMRevert)
            })
        })
    })

    contract('validating burn', () => {

        it('should return correct balances after burn ', async () => {
            await token.mint(buyerA, 100)
            await token.burn(buyerA, 100)
      
            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 0)

            let totalSupply = await token.totalSupply()
            assert.equal(totalSupply, 0)
        })

        it('burn should throw an error after finishing mint', async () => {
            await token.mint(buyerA, 100)
            await token.finishMinting()
            await token.burn(buyerA, 100).should.be.rejectedWith(EVMRevert)
        })

        it('only owner can burn', async () => {
            await token.mint(buyerA, 100)
            await token.burn(buyerA, 100, {'from': buyerA}).should.be.rejectedWith(EVMRevert)
        })

        contract('validating burn when paused', () => {
            it('trying to burn when minting is paused should fail', async () => {
                await token.mint(buyerA, 100)
                await token.setPauseControl(pauseControl, {from: owner})
                await token.pauseCapitalIncreaseOrDecrease(false, {from: pauseControl}) //now disabled
                assert.equal(await token.mintingAndBurningPaused(), true, "as precondition burning must be paused")

                await token.burn(buyerA, 1).should.be.rejectedWith(EVMRevert)
            })
        })
    })

    contract('validating transfer', () => {
        it('should return correct balances after transfer', async () => {
            await token.mint(buyerA, 100)

            let startAccountBalance = await token.balanceOf(buyerA)
            assert.equal(startAccountBalance, 100)

            await token.transfer(buyerB, 100, { from: buyerA })

            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 0)

            let secondAccountBalance = await token.balanceOf(buyerB)
            assert.equal(secondAccountBalance, 100)
        })

        it('should throw an error when trying to transfer more than balance', async () => {
            await token.mint(buyerA, 100)
            await token.transfer(buyerB, 101).should.be.rejectedWith(EVMRevert)
        })

        it('should throw an error when trying to transfer to 0x0', async () => {
            await token.mint(buyerA, 100)
            await token.transfer(0x0, 100).should.be.rejectedWith(EVMRevert)
        })

        it('should throw when trying to transfer but transfer is disabled', async () => {
            await token.mint(buyerA, 100)
            await token.enableTransfers(false)
            assert.equal(await token.balanceOf(buyerA), 100)

            await token.transfer(buyerB, 100, { from: buyerA }).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating approve and allowance', () => {
        it('should return the correct allowance amount after approval', async () => {
            await token.mint(buyerA, 100)
            await token.approve(buyerB, 100, { from: buyerA })
            let allowance = await token.allowance(buyerA, buyerB)

            assert.equal(allowance, 100)
        })
    })

    contract('validating transferFrom', () => {
        it('should return correct balances after transfering from another account', async () => {
            await token.mint(buyerA, 100)

            await token.approve(buyerB, 100, { from: buyerA })
            await token.transferFrom(buyerA, buyerC, 100, { from: buyerB })

            let balance0 = await token.balanceOf(buyerA)
            assert.equal(balance0, 0)

            let balance1 = await token.balanceOf(buyerC)
            assert.equal(balance1, 100)

            let balance2 = await token.balanceOf(buyerB)
            assert.equal(balance2, 0)
        })

        it('should throw an error when trying to transfer more than allowed', async () => {
            await token.mint(buyerA, 100)

            await token.approve(buyerB, 99 , { from: buyerA })
            await token.transferFrom(buyerA, buyerB, 100, { from: buyerB }).should.be.rejectedWith(EVMRevert)
        })

        it('should throw an error when trying to transferFrom more than _from has', async () => {
            await token.mint(buyerA, 100)

            let balance0 = await token.balanceOf(buyerA)
            await token.approve(buyerB, 99, { from: buyerA })
            await token.transferFrom(buyerA, buyerC, balance0 + 1, { from: buyerB }).should.be.rejectedWith(EVMRevert)
        })

        it('should increase by 50 then set to 0 when decreasing by more than 50', async () => {
            await token.mint(buyerA, 100)

            await token.approve(buyerB, 50, { from: buyerA })
            await token.decreaseApproval(buyerB, 60 , { from: buyerA })
            let postDecrease = await token.allowance(buyerA, buyerB)
            assert.equal(postDecrease, 0)
        })
        
        it('should throw an error when trying to transferFrom to 0x0', async () => {
            await token.mint(buyerA, 100)

            await token.approve(buyerB, 100, { from: buyerA })
            await token.transferFrom(buyerA, 0x0, 100, { from: buyerB }).should.be.rejectedWith(EVMRevert)
        })

        it('should throw when trying to approve but transfer disabled', async () => {
            await token.mint(buyerA, 100)

            await token.enableTransfers(false)

            assert.equal(await token.balanceOf(buyerA), 100)
            await token.approve(buyerB, 100, { from: buyerA }).should.be.rejectedWith(EVMRevert)
        })

        it('should throw when trying to transferFrom but transfer disabled', async () => {
            await token.mint(buyerA, 100)

            assert.equal(await token.balanceOf(buyerA), 100)
            await token.approve(buyerB, 100, { from: buyerA })
            assert.equal(await token.allowance(buyerA, buyerB), 100)

            await token.enableTransfers(false)

            await token.transferFrom(buyerA, buyerC, 100, { from: buyerB }).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating allowance', () => {
        it('should start with zero', async () => {
            await token.mint(buyerA, 100)
            
            let preApproved = await token.allowance(buyerA, buyerB)
            assert.equal(preApproved, 0)
        })
    })

    contract('validating increaseApproval', () => {

        it('should increase by 50', async () => {
            await token.mint(buyerA, 100)

            await token.increaseApproval(buyerB, 50, { from: buyerA })
            let postIncrease = await token.allowance(buyerA, buyerB)
            assert.equal(postIncrease, 50)
        })
    })

    contract('validating decreaseApproval', () => {
        it('should increase by 50 then decrease by 10', async () => {
            await token.mint(buyerA, 100)

            await token.increaseApproval(buyerB, 50, { from: buyerA })
            let postIncrease = await token.allowance(buyerA, buyerB)
            assert.equal(postIncrease, 50)
            await token.decreaseApproval(buyerB, 10, { from: buyerA })
            let postDecrease = await token.allowance(buyerA, buyerB)
            assert.equal(postDecrease, 40)
        })

        it('should increase by 50 then decrease by 51', async () => {
            await token.mint(buyerA, 100)

            await token.increaseApproval(buyerB, 50, { from: buyerA })
            let postIncrease = await token.allowance(buyerA, buyerB)
            assert.equal(postIncrease, 50)
            await token.decreaseApproval(buyerB, 51, { from: buyerA })
            let postDecrease = await token.allowance(buyerA, buyerB)
            assert.equal(postDecrease, 0)
        })
    })

    contract('validating setName', () => {
        it('owner can change name when canMintOrBurn not finished', async () => {
            await token.setName("changed name")
            assert.equal(await token.name.call(), "changed name")
        })

        it('non owner cannot change name even if canMintOrBurn not finished', async () => {
            owner.should.not.eq(buyerA)
            await token.setName("changed name", { 'from': buyerA }).should.be.rejectedWith(EVMRevert)
        })

        it('owner can change name when canMintOrBurn not finished', async () => {
            await token.finishMinting()
            await token.setName("changed name").should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating setSymbol', () => {
        it('owner can change symbol when canMintOrBurn not finished', async () => {
            await token.setSymbol("SYM")
            assert.equal(await token.symbol.call(), "SYM")
        })

        it('non owner cannot change symbol even if canMintOrBurn not finished', async () => {
            owner.should.not.eq(buyerA)
            await token.setSymbol("SYM", {'from': buyerA}).should.be.rejectedWith(EVMRevert)
        })

        it('owner cannot change symbol when canMintOrBurn has finished', async () => {
            await token.finishMinting()
            await token.setSymbol("SYM").should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating setShortDescription', () => {
        it('owner can change description when canMintOrBurn not finished', async () => {
            await token.setShortDescription("My short description from test.")
            assert.equal(await token.shortDescription.call(), "My short description from test.")
        })

        it('non owner cannot change description even if canMintOrBurn not finished', async () => {
            owner.should.not.eq(buyerA)
            await token.setShortDescription("My short description from test.", {'from': buyerA}).should.be.rejectedWith(EVMRevert)
        })

        it('owner cannot change description when canMintOrBurn has finished', async () => {
            await token.finishMinting()
            await token.setShortDescription("My short description from test.").should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating setBaseRate', () => {
        it('owner can change setBaseRate when canMintOrBurn not finished', async () => {
            await token.setBaseRate(3, { from: owner })
            assert.equal(await token.baseRate.call(), 3)
        })

        it('non owner cannot change setBaseRate even if canMintOrBurn not finished', async () => {
            owner.should.not.eq(buyerA)
            await token.setBaseRate(3, { from: buyerA }).should.be.rejectedWith(EVMRevert)
        })

        it('owner cannot change setBaseRate when canMintOrBurn has finished', async () => {
            await token.finishMinting()
            await token.setBaseRate(3, { from: owner }).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating setBaseCurrency', () => {
        it('owner can change setBaseCurrency when canMintOrBurn not finished', async () => {
            let erc20TestToken = await ERC20TestToken.new()
            
            await token.setBaseCurrency(erc20TestToken.address, { from: owner })
            assert.equal(await token.baseCurrency.call(), erc20TestToken.address)
        })

        it('non owner cannot change setBaseCurrency even if canMintOrBurn not finished', async () => {
            buyerA.should.not.eq(owner)
            let erc20TestToken = await ERC20TestToken.new()
            
            await token.setBaseCurrency(erc20TestToken.address, { from: buyerA }).should.be.rejectedWith(EVMRevert)
        })

        it('owner cannot change setBaseCurrency when canMintOrBurn has finished', async () => {
            await token.finishMinting()

            let erc20TestToken = await ERC20TestToken.new()
            
            await token.setBaseCurrency(erc20TestToken.address, { from: owner }).should.be.rejectedWith(EVMRevert)
        })

        it('owner cannot change setBaseCurrency to 0x0', async () => {
            await token.setBaseCurrency(ZERO_ADDRESS, { from: owner }).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating balanceOfAt', () => {
        it('buyerA has 100 after minting 100 ', async () => {
            await token.mint(buyerA, 100)

            let blockNumber = await web3.eth.blockNumber

            assert.equal(await token.balanceOfAt(buyerA, blockNumber), 100)
        })

        it('buyerA had 100 and has 50 after sending 50', async () => {
            await token.mint(buyerA, 100)

            await token.transfer(buyerB, 50, {'from': buyerA})

            let blockNumber = await web3.eth.blockNumber
            assert.equal(await token.balanceOfAt(buyerA, blockNumber), 50)
        })

        it('buyerA had 100 then sends 50 verify that he had 100 before', async () => {
            await token.mint(buyerA, 100)

            let blockNumberBeforeSend = await web3.eth.blockNumber

            await token.transfer(buyerB, 50, {'from': buyerA})

            assert.equal(await token.balanceOfAt(buyerA, blockNumberBeforeSend), 100)
        })

        it('buyerA had 100 then sends 50 then 20', async () => {
            await token.mint(buyerA, 100)

            await token.transfer(buyerB, 50, {'from': buyerA})
            await token.transfer(buyerB, 20, {'from': buyerA})

            let blockNumberAfterSend20 = await web3.eth.blockNumber

            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend20), 30)
        })

        it('instant balanceOfAt', async () => {
            let blockNumber = await web3.eth.blockNumber
            assert.equal(await token.balanceOfAt(buyerA, blockNumber), 0)
        })

        it('buyerA had 100 then quickly sends 50 20 10 validate different blocks', async () => {
            await token.mint(buyerA, 100)

            let blockNumberBeforeSend = await web3.eth.blockNumber
            let res1 = await token.transfer(buyerB, 50, {'from': buyerA})
            let res2 = await token.transfer(buyerB, 20, {'from': buyerA})
            let res3 = await token.transfer(buyerB, 10, {'from': buyerA})

            let res4 = await token.transfer(buyerB, 10, {'from': buyerA}) //delayed transfer

            let blockNumberAfterSend = await web3.eth.blockNumber

            assert.equal(blockNumberAfterSend, blockNumberBeforeSend+4)
            assert.notEqual(blockNumberBeforeSend, blockNumberAfterSend)

            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend-0), 10)
            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend-1), 20)
            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend-2), 30)
            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend-3), 50)
            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend-4), 100)
        })
    })

        /*it('buyerA had 100 then QUICKLY sends 50 20 10 validate different blocks', async () => {
            await token.mint(buyerA, 100)

            let blockNumberBeforeSend = await web3.eth.blockNumber
            let res1 = token.transfer(buyerB, 50, {'from': buyerA}) //no await
            let res2 = token.transfer(buyerB, 20, {'from': buyerA}) //no await
            let res3 = token.transfer(buyerB, 10, {'from': buyerA}) //no await

             //now await all
            await res1
            await res2
            await res3

            let res4 = await token.transfer(buyerB, 10, {'from': buyerA}) //delayed transfer

            let blockNumberAfterSend = await web3.eth.blockNumber

            assert.equal(blockNumberAfterSend, blockNumberBeforeSend+4)
            assert.notEqual(blockNumberBeforeSend, blockNumberAfterSend)

            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend-0), 10)
            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend-1), 20)
            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend-2), 30)
            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend-3), 50)
            assert.equal(await token.balanceOfAt(buyerA, blockNumberAfterSend-4), 100)
        })
    })*/

    contract('validating totalSupplyAt', () => {
        it('totalSupplyAt after first mint block number 0 returns zero', async () => {
            await token.mint(buyerA, 100)

            assert.equal(await token.totalSupplyAt(0), 0)
        })

        it('buyerA gets 5x10 minted then requesting totalSupplyAt upper half', async () => {
            let blockNumberBeforeSend = await web3.eth.blockNumber
            await token.mint(buyerA, 10)
            await token.mint(buyerA, 10)
            await token.mint(buyerA, 10)
            await token.mint(buyerA, 10)
            await token.mint(buyerA, 10)
            let blockNumberAfterSend = await web3.eth.blockNumber

            assert.equal(blockNumberAfterSend, blockNumberBeforeSend+5)
            assert.notEqual(blockNumberBeforeSend, blockNumberAfterSend)

            assert.equal(await token.totalSupplyAt(blockNumberBeforeSend+4), 40)
        })

        it('buyerA gets 5x10 minted then requesting totalSupplyAt lower half', async () => {
            let blockNumberBeforeSend = await web3.eth.blockNumber
            await token.mint(buyerA, 10)
            await token.mint(buyerA, 10)
            await token.mint(buyerA, 10)
            await token.mint(buyerA, 10)
            await token.mint(buyerA, 10)
            let blockNumberAfterSend = await web3.eth.blockNumber

            assert.equal(blockNumberAfterSend, blockNumberBeforeSend+5)
            assert.notEqual(blockNumberBeforeSend, blockNumberAfterSend)

            assert.equal(await token.totalSupplyAt(blockNumberBeforeSend+1), 10)
        })
    })

    contract('validating setPauseControl()', () => {
        it('setPauseControl() can set pauseControl address as owner', async () => {
            assert.equal(await token.pauseControl(), ZERO_ADDRESS) //precondition

            await token.setPauseControl(pauseControl, {from: owner})

            assert.equal(await token.pauseControl(), pauseControl)
        })

        it('setPauseControl() cannot set pauseControl address as not-owner', async () => {
            assert.equal(await token.pauseControl(), ZERO_ADDRESS) //precondition

            await token.setPauseControl(pauseControl, {from: unknown}).should.be.rejectedWith(EVMRevert)

            assert.equal(await token.pauseControl(), ZERO_ADDRESS)
        })
    })

    contract('validating pauseTransfer()', () => {
        it('pauseTransfer() can pause as pauseControl', async () => {
            await token.setPauseControl(pauseControl, {from: owner})

            await token.pauseTransfer(false, {from: pauseControl})

            assert.equal(await token.transfersEnabled(), false)
        })

        it('pauseTransfer() can resume as pauseControl', async () => {
            await token.setPauseControl(pauseControl, {from: owner})
            await token.pauseTransfer(false, {from: pauseControl})
            assert.equal(await token.transfersEnabled(), false)

            await token.pauseTransfer(true, {from: pauseControl})

            assert.equal(await token.transfersEnabled(), true)
        })

        it('pauseTransfer() cannot be set as not-pauseControl', async () => {
            await token.setPauseControl(pauseControl, {from: unknown}).should.be.rejectedWith(EVMRevert)

            await token.pauseTransfer(false, { from: unknown }).should.be.rejectedWith(EVMRevert)

            assert.equal(await token.transfersEnabled(), true)
        })
    })

    contract('validating pauseCapitalIncreaseOrDecrease()', () => {
        it('pauseCapitalIncreaseOrDecrease() can pause as pauseControl', async () => {
            await token.setPauseControl(pauseControl, {from: owner})

            await token.pauseCapitalIncreaseOrDecrease(false, {from: pauseControl})

            assert.equal(await token.mintingAndBurningPaused(), true)
        })

        it('pauseCapitalIncreaseOrDecrease() can resume as pauseControl', async () => {
            await token.setPauseControl(pauseControl, {from: owner})
            await token.pauseCapitalIncreaseOrDecrease(false, {from: pauseControl})
            assert.equal(await token.mintingAndBurningPaused(), true)

            await token.pauseCapitalIncreaseOrDecrease(true, {from: pauseControl})

            assert.equal(await token.mintingAndBurningPaused(), false)
        })

        it('pauseCapitalIncreaseOrDecrease() cannot be set as not-pauseControl', async () => {
            await token.setPauseControl(pauseControl, {from: unknown}).should.be.rejectedWith(EVMRevert)

            await token.pauseCapitalIncreaseOrDecrease(false, { from: unknown }).should.be.rejectedWith(EVMRevert)

            assert.equal(await token.mintingAndBurningPaused(), false)
        })
    })
})
