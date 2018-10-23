let EVMRevert = require('openzeppelin-solidity/test/helpers/assertRevert')

let timeTravel = require('./helper/timeTravel.js')
const time = require('openzeppelin-solidity/test/helpers/increaseTime')
import latestTime from 'openzeppelin-solidity/test/helpers/latestTime'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const DividendAssetToken = artifacts.require('DividendAssetToken.sol')
const ERC20TestToken = artifacts.require('ERC20TestToken.sol')
const ERC20TestTokenRetFalse = artifacts.require('ERC20TestTokenRetValueSimulator.sol')
const MOCKCRWDClearing = artifacts.require('MOCKCRWDClearing.sol')

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('DividendAssetToken', (accounts) => {

    let token = null
    let erc20 = null
    let erc20RetFalse = null
    let owner = null

    let clearing = null

    const ONETOKEN  = 1
    const ONETHOUSANDTOKEN  = ONETOKEN * 1000
    const SECONDS_IN_A_YEAR = 86400 * 366

    let buyerA = accounts[1]
    let buyerB = accounts[2]
    let buyerC = accounts[3]
    let buyerD = accounts[4]
    let buyerE = accounts[5]

    let condaAccount = accounts[6]
    let companyAccount = accounts[7]

    let mintControl = accounts[8]
    
    let nowTime = null
    let startTime = null
    let endTime = null
    let afterEndTime = null

    beforeEach(async () => {
        nowTime = await latestTime()
        startTime = nowTime
        endTime = startTime + time.duration.weeks(2)
        afterEndTime = endTime + time.duration.seconds(1)

        token = await DividendAssetToken.new()
        await token.setMintControl(mintControl)
        erc20 = await ERC20TestToken.new()
        erc20RetFalse = await ERC20TestTokenRetFalse.new()
        owner = await token.owner()
        
        //mock clearing so it doesn't cost money
        clearing = await MOCKCRWDClearing.new()
        await clearing.setFee((await ERC20TestToken.new()).address, 0, 0, condaAccount, companyAccount)
        await token.setClearingAddress(clearing.address)

        await token.setMetaData("", "", erc20.address, (1000000 * 1e18), (100 * 1e18), startTime, endTime)

        await token.setTokenAlive()

        //split
        await token.mint(buyerA, 100, {from: mintControl}) //10%
        await token.mint(buyerB, 250, {from: mintControl}) //25%
        await token.mint(buyerD, 500, {from: mintControl}) //50%
        await token.mint(buyerE, 150, {from: mintControl}) //15%

        //Make a deposit
        await erc20.mint(owner, ONETHOUSANDTOKEN)
        await erc20.approve(token.address, ONETHOUSANDTOKEN, { from: owner })
        await token.depositERC20Dividend(erc20.address, ONETHOUSANDTOKEN, {from: owner })
        let balance = await erc20.balanceOf(token.address)

        assert.equal(balance, ONETHOUSANDTOKEN)
    })

    let claimDividendA = async () => {
        return await token.claimDividend(0, {from: buyerA, gasPrice: 0})
    }

    let claimDividendB = async () => {
        return await token.claimDividend(0, {from: buyerB, gasPrice: 0})
    }

    contract('validating deposit ERC20Token', () => {
        it('depositing dividend token 0x0 reverts', async () => {
            await token.depositERC20Dividend(ZERO_ADDRESS, ONETHOUSANDTOKEN, {from: owner }).should.be.rejectedWith(EVMRevert)
        })

        it('depositing dividend token returning false on transfer reverts', async () => {
            await erc20RetFalse.setReturnValue(false)
            await token.depositERC20Dividend(erc20RetFalse.address, ONETHOUSANDTOKEN, {from: owner }).should.be.rejectedWith(EVMRevert)
        })

        it('depositing other than baseCurrency reverts', async () => {
            await erc20RetFalse.setReturnValue(true)
            await token.depositERC20Dividend(erc20RetFalse.address, ONETHOUSANDTOKEN, {from: owner }).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating claim', () => {
        it('buyer A should claim 0.1 of dividend', async () => {
            let beforeBalanceOne = await erc20.balanceOf(buyerA)
            await claimDividendA()
            let afterBalanceOne = await erc20.balanceOf(buyerA)
            assert.equal(beforeBalanceOne.add(0.1 * ONETHOUSANDTOKEN).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim 0.1 of dividend")
        })

        it('buyer B should claim 0.25 of dividend', async () => {
            let beforeBalanceTwo = await erc20.balanceOf(buyerB)
            await token.claimDividend(0, {from: buyerB, gasPrice: 0})
            let afterBalanceTwo = await erc20.balanceOf(buyerB)
            assert.equal(beforeBalanceTwo.add(0.25 * ONETHOUSANDTOKEN).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim 0.25 of dividend")        
        })

        it('Make sure further claims on this dividend fail for buyer A', async () => {
            await claimDividendA()
            await token.claimDividend(0, {from: buyerA, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
        })

        it('Make sure further claims on this dividend fail for buyer B', async () => {
            await claimDividendB()
            await token.claimDividend(0, {from: buyerB, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
        })

        it('Make sure zero balances give no value', async () => {
            let beforeBalanceThree = await erc20.balanceOf(buyerC)
            await token.claimDividend(0, {from: buyerC, gasPrice: 0})
            let afterBalanceThree = await erc20.balanceOf(buyerC)
            assert.equal(beforeBalanceThree.toNumber(), afterBalanceThree.toNumber(), "buyer C should have no claim")
        })
    })

    contract('validating recycle', () => {
        it('Add a new token balance for account C', async () => {
            await token.mint(buyerC, 800, {from: mintControl})
            const balance = await token.balanceOf(buyerC)
            assert.equal(balance, 800)
        })

        it('Recycle remainder of dividend distribution 0 should fail within one year ', async () => {
            await token.recycleDividend(0, {from: owner}).should.be.rejectedWith(EVMRevert)
        })

        it('Recycle remainder of dividend distribution 0', async () => {
            await timeTravel(SECONDS_IN_A_YEAR) //1 year time lock passes

            await token.recycleDividend(0, {from: owner})
        })

        it('Check noone can claim recycled dividend', async () => {
            //claim all but buyerD
            await claimDividendA()
            await claimDividendB()
            await token.claimDividendAll({from: buyerC, gasPrice: 0})
            //await token.claimDividendAll({from: buyerD, gasPrice: 0})
            await token.claimDividendAll({from: buyerE, gasPrice: 0})

            const beforeBalanceA = await erc20.balanceOf(buyerA)
            const beforeBalanceB = await erc20.balanceOf(buyerB)
            const beforeBalanceC = await erc20.balanceOf(buyerC)
            const beforeBalanceD = await erc20.balanceOf(buyerD)
            const beforeBalanceE = await erc20.balanceOf(buyerE)

            await timeTravel(SECONDS_IN_A_YEAR) //1 year time lock passes

            await token.recycleDividend(0, {from: owner}) //act

            await token.claimDividend(0, {from: buyerA, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(0, {from: buyerB, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(0, {from: buyerC, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(0, {from: buyerD, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(0, {from: buyerE, gasPrice: 0}).should.be.rejectedWith(EVMRevert)

            const newDividendIndexAfterRecycle = 1

            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerA, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerB, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerC, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerD, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerE, gasPrice: 0}).should.be.rejectedWith(EVMRevert)

            const afterBalanceA = await erc20.balanceOf(buyerA)
            const afterBalanceB = await erc20.balanceOf(buyerB)
            const afterBalanceC = await erc20.balanceOf(buyerC)
            const afterBalanceD = await erc20.balanceOf(buyerD)
            const afterBalanceE = await erc20.balanceOf(buyerE)

            //Balances for recycled dividend 1 are 100, 250, 500, 150, total = 1000, recycled dividend is 50% of total
            assert.equal(afterBalanceA.toNumber(), beforeBalanceA.toNumber())
            assert.equal(afterBalanceB.toNumber(), beforeBalanceB.toNumber())
            assert.equal(afterBalanceC.toNumber(), beforeBalanceC.toNumber())
            assert.equal(afterBalanceD.toNumber(), beforeBalanceD.toNumber())
            assert.equal(afterBalanceE.toNumber(), beforeBalanceE.toNumber())
        })

        it('Check owner can claim recycled dividend', async () => {
            //claim all but buyerD
            await token.claimDividendAll({from: buyerD, gasPrice: 0}) //claims his 50%

            const beforeBalanceA = await erc20.balanceOf(buyerA)
            const beforeBalanceOwner = await erc20.balanceOf(owner)
        
            await timeTravel(SECONDS_IN_A_YEAR) //1 year time lock passes

            await token.recycleDividend(0, {from: owner, gasPrice: 0}) //act
            
            await token.claimDividend(0, {from: buyerA, gasPrice: 0}).should.be.rejectedWith(EVMRevert)

            const newDividendIndexAfterRecycle = 1

            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerA, gasPrice: 0}).should.be.rejectedWith(EVMRevert)
            
            const afterBalanceA = await erc20.balanceOf(buyerA)
            const afterBalanceOwner = await erc20.balanceOf(owner)
            
            //Balances for recycled dividend 1 are 100, 250, 500, 150, total = 1000, recycled dividend is 50% of total
            assert.equal(afterBalanceA.toNumber(), beforeBalanceA.toNumber(), "buyer A should claim dividend")
            assert.notEqual(afterBalanceOwner, beforeBalanceOwner, "owner balance didn't change")
            assert.equal(afterBalanceOwner.toNumber(), beforeBalanceOwner.add(ONETHOUSANDTOKEN/2).toNumber(), "owner should claim dividend")
        })
    })

    
})
