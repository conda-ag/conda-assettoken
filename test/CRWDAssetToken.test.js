let EVMRevert = require('openzeppelin-solidity/test/helpers/assertRevert')

const CRWDAssetToken = artifacts.require('CRWDAssetToken.sol')
const MOCKCRWDClearing = artifacts.require('MOCKCRWDClearing.sol')
const ERC20TestToken = artifacts.require('ERC20TestToken.sol')

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('CRWDAssetToken', (accounts) => {

    let token = null
    let crwdToken = null
    let clearing = null
    let owner = null

    let buyerA = accounts[1]
    let buyerB = accounts[2]
    let buyerC = accounts[3]
    let companyAccount = accounts[4]
    let condaAccount = accounts[5]

    const crowdsale = accounts[7]

    let unknown = accounts[6]
  
    beforeEach(async () => {
        token = await CRWDAssetToken.new()
        await token.setMintControl(crowdsale)
        await token.enableTransfers(true)
        crwdToken = await ERC20TestToken.new()
        clearing = await MOCKCRWDClearing.new()
        await token.setTokenAlive()
        await token.setClearingAddress(clearing.address)
    })

    contract('validating setClearingAddress()', () => {
        it('can be set by owner', async () => {
            token = await CRWDAssetToken.new()
            owner = await token.owner()
            crwdToken = await ERC20TestToken.new()
            const goodClearing = await MOCKCRWDClearing.new()
            await token.setClearingAddress(goodClearing.address)

            assert.equal(await token.clearingAddress(), goodClearing.address)
        })

        it('cannot be set by unknown', async () => {
            token = await CRWDAssetToken.new()
            crwdToken = await ERC20TestToken.new()
            const badClearing = await MOCKCRWDClearing.new()
            await token.setClearingAddress(badClearing.address, { from: unknown }).should.be.rejectedWith(EVMRevert)

            assert.notEqual(await token.clearingAddress(), badClearing.address)
        })
    })

    contract('validating mint', () => {
        it('totalSupply should be 100', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})

            let totalSupply = await token.totalSupply()
    
            assert.equal(totalSupply, 100)
        })

        it('should return correct balances after mint ', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})
      
            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 100)
        })

        it('should throw an error after finishing mint', async () => {
            await token.finishMinting({from: owner})
            await token.mint(buyerA, 100, {from: crowdsale}).should.be.rejectedWith(EVMRevert)
        })

    })

    contract('validating mint with company fee', () => {
        beforeEach(async () => {
            await clearing.setFee(crwdToken.address, 10, 0, condaAccount, companyAccount)
            await crwdToken.mint(companyAccount, 1)
            await crwdToken.approve(clearing.address, 1, { from: companyAccount })
        })

        it('totalSupply should be 100', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})

            let totalSupply = await token.totalSupply()
    
            assert.equal(totalSupply, 100)
        })

        it('should return correct balances after mint ', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})
      
            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 100)
        })

        it('should throw an error after finishing mint', async () => {
            await token.finishMinting({from: owner})
            await token.mint(buyerA, 100, {from: crowdsale}).should.be.rejectedWith(EVMRevert)
        })

    })

    // contract('validating burn', () => {
    //     it('should return correct balances after burn ', async () => {
    //         await token.mint(buyerA, 100, {from: crowdsale})
    //         await token.burn(buyerA, 100, {from: crowdsale})
      
    //         let firstAccountBalance = await token.balanceOf(buyerA)
    //         assert.equal(firstAccountBalance, 0)

    //         let totalSupply = await token.totalSupply()
    //         assert.equal(totalSupply, 0)
    //     })

    //     it('burn should throw an error after finishing mint', async () => {
    //         await token.mint(buyerA, 100, {from: crowdsale})
    //         await token.finishMinting({from: owner})
    //         await token.burn(buyerA, 100).should.be.rejectedWith(EVMRevert)
    //     })
    // })

    contract('validating transfer', () => {
        it('should return correct balances after transfer', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})

            let startAccountBalance = await token.balanceOf(buyerA)
            assert.equal(startAccountBalance, 100)

            await token.transfer(buyerB, 100, { from: buyerA })

            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 0)

            let secondAccountBalance = await token.balanceOf(buyerB)
            assert.equal(secondAccountBalance, 100)
        })

        it('should throw an error when trying to transfer more than balance', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})
            await token.transfer(buyerB, 101).should.be.rejectedWith(EVMRevert)
        })

        it('should throw an error when trying to transfer to 0x0', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})
            await token.transfer(0x0, 100).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating transferFrom', () => {
        it('should return the correct allowance amount after approval', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})
            await token.approve(buyerB, 100, { from: buyerA })
            let allowance = await token.allowance(buyerA, buyerB)

            assert.equal(allowance, 100)
        })

        it('should return correct balances after transfering from another account', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})
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
            await token.mint(buyerA, 100, {from: crowdsale})
            await token.approve(buyerB, 99 , { from: buyerA })
            await token.transferFrom(buyerA, buyerB, 100, { from: buyerB }).should.be.rejectedWith(EVMRevert)
        })

        it('should throw an error when trying to transferFrom more than _from has', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})
            let balance0 = await token.balanceOf(buyerA)
            await token.approve(buyerB, 99, { from: buyerA })
            await token.transferFrom(buyerA, buyerC, balance0 + 1, { from: buyerB }).should.be.rejectedWith(EVMRevert)
        })

        it('should increase by 50 then set to 0 when decreasing by more than 50', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})
            await token.approve(buyerB, 50, { from: buyerA })
            await token.decreaseApproval(buyerB, 60 , { from: buyerA })
            let postDecrease = await token.allowance(buyerA, buyerB)
            assert.equal(postDecrease, 0)
        })

        it('should throw an error when trying to transferFrom to 0x0', async () => {
            await token.mint(buyerA, 100, {from: crowdsale})
            await token.approve(buyerB, 100, { from: buyerA })
            await token.transferFrom(buyerA, 0x0, 100, { from: buyerB }).should.be.rejectedWith(EVMRevert)
        })

    })


})
