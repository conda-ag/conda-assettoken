let EVMRevert = require('openzeppelin-solidity/test/helpers/assertRevert')
let timeTravel = require('./helper/timeTravel.js')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const DividendAssetToken = artifacts.require('DividendAssetToken.sol')
const ERC20TestToken = artifacts.require('ERC20TestToken.sol')
const ERC20TestTokenRetFalse = artifacts.require('ERC20TestTokenRetValueSimulator.sol')

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('DividendAssetToken', (accounts) => {

    let token = null
    let erc20 = null
    let erc20RetFalse = null
    let owner = null

    const ONETOKEN  = 1
    const ONETHOUSANDTOKEN  = ONETOKEN * 1000
    const SECONDS_IN_A_YEAR = 86400 * 366
    const gasPrice = 0

    let buyerA = accounts[1]
    let buyerB = accounts[2]
    let buyerC = accounts[3]
    let buyerD = accounts[4]
    let buyerE = accounts[5]
    
    beforeEach(async () => {
        token = await DividendAssetToken.new()
        erc20 = await ERC20TestToken.new()
        erc20RetFalse = await ERC20TestTokenRetFalse.new()
        owner = await token.owner()
        
        //set basecurrency
        await token.setBaseCurrency(erc20.address)

        //split
        await token.mint(buyerA, 100) //10%
        await token.mint(buyerB, 250) //25%
        await token.mint(buyerD, 500) //50%
        await token.mint(buyerE, 150) //15%

        //Make a deposit
        await erc20.mint(owner, ONETHOUSANDTOKEN)
        await erc20.approve(token.address, ONETHOUSANDTOKEN, { from: owner })
        await token.depositERC20Dividend(erc20.address, ONETHOUSANDTOKEN, {from: owner })
        let balance = await erc20.balanceOf(token.address)

        assert.equal(balance, ONETHOUSANDTOKEN)
    })

    let claimDividendA = async () => {
        return await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice})
    }

    let claimDividendB = async () => {
        return await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice})
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
            let txId1 = await claimDividendA()
            let afterBalanceOne = await erc20.balanceOf(buyerA)
            let gasCostTxId1 = txId1.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceOne.add(0.1 * ONETHOUSANDTOKEN).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim 0.1 of dividend")
        })

        it('buyer B should claim 0.25 of dividend', async () => {
            let beforeBalanceTwo = await erc20.balanceOf(buyerB)
            let txId2 = await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice})
            let afterBalanceTwo = await erc20.balanceOf(buyerB)
            let gasCostTxId2 = txId2.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceTwo.add(0.25 * ONETHOUSANDTOKEN).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim 0.25 of dividend")        
        })

        it('Make sure further claims on this dividend fail for buyer A', async () => {
            await claimDividendA()
            await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert)
        })

        it('Make sure further claims on this dividend fail for buyer B', async () => {
            await claimDividendB()
            await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert)
        })

        it('Make sure zero balances give no value', async () => {
            let beforeBalanceThree = await erc20.balanceOf(buyerC)
            let txId3 = await token.claimDividend(0, {from: buyerC, gasPrice: gasPrice})
            let afterBalanceThree = await erc20.balanceOf(buyerC)
            let gasCostTxId3 = txId3.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceThree.toNumber(), afterBalanceThree.toNumber(), "buyer C should have no claim")
        })
    })

    contract('validating recycle', () => {
        it('Add a new token balance for account C', async () => {
            await token.mint(buyerC, 800)
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

        it('Check everyone can claim recycled dividend', async () => {
            //claim all but buyerD
            const txIdA = await claimDividendA()
            const txIdB = await claimDividendB()
            const txIdC = await token.claimDividendAll({from: buyerC, gasPrice: gasPrice})
            //const txIdD = await token.claimDividendAll({from: buyerD, gasPrice: gasPrice})
            const txIdE = await token.claimDividendAll({from: buyerE, gasPrice: gasPrice})

            const beforeBalanceA = await erc20.balanceOf(buyerA)
            const beforeBalanceB = await erc20.balanceOf(buyerB)
            const beforeBalanceC = await erc20.balanceOf(buyerC)
            const beforeBalanceD = await erc20.balanceOf(buyerD)
            const beforeBalanceE = await erc20.balanceOf(buyerE)

            await timeTravel(SECONDS_IN_A_YEAR) //1 year time lock passes

            await token.recycleDividend(0, {from: owner}) //act

            await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(0, {from: buyerC, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(0, {from: buyerD, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert)
            await token.claimDividend(0, {from: buyerE, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert)

            const newDividendIndexAfterRecycle = 1

            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerA, gasPrice: gasPrice})
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerB, gasPrice: gasPrice})
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerC, gasPrice: gasPrice})
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerD, gasPrice: gasPrice})
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerE, gasPrice: gasPrice})

            const afterBalanceA = await erc20.balanceOf(buyerA)
            const afterBalanceB = await erc20.balanceOf(buyerB)
            const afterBalanceC = await erc20.balanceOf(buyerC)
            const afterBalanceD = await erc20.balanceOf(buyerD)
            const afterBalanceE = await erc20.balanceOf(buyerE)

            const gasCostTxIdA = txIdA.receipt.gasUsed * gasPrice
            const gasCostTxIdB = txIdB.receipt.gasUsed * gasPrice
            const gasCostTxIdC = txIdC.receipt.gasUsed * gasPrice
            const gasCostTxIdD = 0 //txIdD.receipt.gasUsed * gasPrice
            const gasCostTxIdE = txIdE.receipt.gasUsed * gasPrice

            //Balances for recycled dividend 1 are 100, 250, 500, 150, total = 1000, recycled dividend is 50% of total
            assert.equal(beforeBalanceA.add((100 / 1000) * (ONETHOUSANDTOKEN / 2)).sub(gasCostTxIdA).toNumber(), afterBalanceA.toNumber(), "buyer A should claim dividend")
            assert.equal(beforeBalanceB.add((250 / 1000) * (ONETHOUSANDTOKEN / 2)).sub(gasCostTxIdB).toNumber(), afterBalanceB.toNumber(), "buyer B should claim dividend")
            assert.equal(beforeBalanceC.add(0).sub(gasCostTxIdC).toNumber(), afterBalanceC.toNumber(), "buyer C should claim dividend")
            assert.equal(beforeBalanceD.add((500 / 1000) * (ONETHOUSANDTOKEN / 2)).sub(gasCostTxIdD).toNumber(), afterBalanceD.toNumber(), "buyer D recycled his dividend")
            assert.equal(beforeBalanceE.add((150 / 1000) * (ONETHOUSANDTOKEN / 2)).sub(gasCostTxIdE).toNumber(), afterBalanceE.toNumber(), "buyer E should claim dividend")
        })
    })

    
})
