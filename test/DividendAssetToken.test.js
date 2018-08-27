let EVMRevert = require('openzeppelin-solidity/test/helpers/assertRevert')
let timeTravel = require('./helper/timeTravel.js')

const time = require('openzeppelin-solidity/test/helpers/increaseTime')
import latestTime from 'openzeppelin-solidity/test/helpers/latestTime'

const DividendAssetToken = artifacts.require('DividendAssetToken.sol')
const MOCKCRWDClearing = artifacts.require('MOCKCRWDClearing.sol')
const StandardToken = artifacts.require('StandardToken.sol')

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('DividendAssetToken', (accounts) => {
    let token = null
    let owner = null

    let clearing = null
    
    const ONEETHER  = 1000000000000000000
    const HALFETHER = ONEETHER / 2
    const QUARTERETHER = HALFETHER / 2
    const SECONDS_IN_A_YEAR = 86400 * 366
    const SECONDS_IN_A_MONTH = 86400 * 30
    const gasPrice = 0

    let buyerA = accounts[1]
    let buyerB = accounts[2]
    let buyerC = accounts[3]
    let buyerD = accounts[4]
    let buyerE = accounts[5]

    let condaAccount = accounts[6]
    let companyAccount = accounts[7]
    
    let capitalControl = accounts[8]

    beforeEach(async () => {
        token = await DividendAssetToken.new()
        await token.setMintControl(capitalControl)
        await token.setTokenAlive()
        owner = await token.owner()
        
        //mock clearing so it doesn't cost money
        clearing = await MOCKCRWDClearing.new()
        await clearing.setFee((await StandardToken.new()).address, 0, 0, condaAccount, companyAccount)
        await token.setClearingAddress(clearing.address)
        
        //split
        await token.mint(buyerA, 100, {from: capitalControl}) //10%
        await token.mint(buyerB, 250, {from: capitalControl}) //25%
        await token.mint(buyerD, 500, {from: capitalControl}) //50%
        await token.mint(buyerE, 150, {from: capitalControl}) //15%

        //Make a deposit
        await token.depositDividend({from: owner, value: ONEETHER})
        let balance = await web3.eth.getBalance(token.address)
        assert.equal(balance, ONEETHER)
    })

    let claimDividendAAll = async () => {
        return await token.claimDividendAll({from: buyerA, gasPrice: gasPrice})
    }

    let claimDividendA = async () => {
        return await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice})
    }

    let claimDividendB = async () => {
        return await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice})
    }

    let claimAll = async () => {
        await claimDividendA()
        await claimDividendB()
        await token.claimDividendAll({from: buyerC, gasPrice: gasPrice})
        await token.claimDividendAll({from: buyerD, gasPrice: gasPrice})
        await token.claimDividendAll({from: buyerE, gasPrice: gasPrice})
    }

    let claimInBatch = async (years) => {
        let gasCostTxs = 0
        for(let yearCount = 0; yearCount < years; yearCount++) {
            const fromIdx = 1 + yearCount*12
            const tillIdx = 12 + yearCount*12

            let txId = await token.claimInBatches(fromIdx, tillIdx, {from: buyerA, gasPrice: gasPrice})
            gasCostTxs = gasCostTxs + txId.receipt.gasUsed * gasPrice
        }

        return gasCostTxs
    }

    let claimAllButD = async () => {
        await claimDividendA()
        await claimDividendB()
        await token.claimDividendAll({from: buyerC, gasPrice: gasPrice})
        //await token.claimDividendAll({from: buyerD, gasPrice: gasPrice})
        await token.claimDividendAll({from: buyerE, gasPrice: gasPrice})
    }

    contract('validating claim', () => {
        it('buyer A should claim 0.1 of dividend', async () => {
            let beforeBalanceOne = await web3.eth.getBalance(buyerA)
            let txId1 = await claimDividendA()
            let afterBalanceOne = await web3.eth.getBalance(buyerA)
            let gasCostTxId1 = txId1.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceOne.add(0.1 * ONEETHER).sub(gasCostTxId1).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim 0.1 of dividend")
        })

        it('buyer B should claim 0.25 of dividend', async () => {
            let beforeBalanceTwo = await web3.eth.getBalance(buyerB)
            let txId2 = await claimDividendB()
            let afterBalanceTwo = await web3.eth.getBalance(buyerB)
            let gasCostTxId2 = txId2.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceTwo.add(0.25 * ONEETHER).sub(gasCostTxId2).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim 0.25 of dividend")
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
            let beforeBalanceThree = await web3.eth.getBalance(buyerC)
            let txId3 = await token.claimDividend(0, {from: buyerC, gasPrice: gasPrice})
            let afterBalanceThree = await web3.eth.getBalance(buyerC)
            let gasCostTxId3 = txId3.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceThree.sub(gasCostTxId3).toNumber(), afterBalanceThree.toNumber(), "buyer C should have no claim")
        })
    })

    contract('validating claim when transfered', () => {
        it('buyer A claimed, then transfered to buyer B -> buyer B should claim original 0.25 of dividend', async () => {
            //buyer A claims
            let beforeBalanceOne = await web3.eth.getBalance(buyerA)
            let txId1 = await claimDividendA()
            let afterBalanceOne = await web3.eth.getBalance(buyerA)
            let gasCostTxId1 = txId1.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceOne.add(0.1 * ONEETHER).sub(gasCostTxId1).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim 0.1 of dividend")

            //buyer A transfers all his share to buyer B (after claiming)
            await token.transfer(buyerB, 100, {from: buyerA, gasPrice: gasPrice})

            //buyer B claims
            let beforeBalanceTwo = await web3.eth.getBalance(buyerB)
            let txId2 = await claimDividendB()
            let afterBalanceTwo = await web3.eth.getBalance(buyerB)
            let gasCostTxId2 = txId2.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceTwo.add(0.25 * ONEETHER).sub(gasCostTxId2).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim 0.25 of dividend")
        })

        it('buyer A unclaimed, then transfered to buyer B. buyer A claims, buyer B claims -> unchainged: buyer A gets 0.1 buyer B gets 0.25', async () => {
            let beforeBalanceOne = await web3.eth.getBalance(buyerA)

            //buyer A transfers all his share to buyer B (before claiming)
            await token.transfer(buyerB, 100, {from: buyerA, gasPrice: gasPrice})

            //buyer A can still claim first deposit
            let txId1 = await claimDividendA()
            let afterBalanceOne = await web3.eth.getBalance(buyerA)
            let gasCostTxId1 = txId1.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceOne.add(0.1 * ONEETHER).sub(gasCostTxId1).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim 0.1 of dividend")

            //buyer B claims (gets original share of first deposit)
            let beforeBalanceTwo = await web3.eth.getBalance(buyerB)
            let txId2 = await claimDividendB()
            let afterBalanceTwo = await web3.eth.getBalance(buyerB)
            let gasCostTxId2 = txId2.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceTwo.add(0.25 * ONEETHER).sub(gasCostTxId2).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim 0.25 of dividend")
        })

        it('buyer A claimed, then transfered to buyer B. then new deposit -> buyer B should claim 0.25 then 0.25+0.1', async () => {
            //buyer A claims
            let beforeBalanceOne = await web3.eth.getBalance(buyerA)
            let txId1 = await claimDividendA()
            let afterBalanceOne = await web3.eth.getBalance(buyerA)
            let gasCostTxId1 = txId1.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceOne.add(0.1 * ONEETHER).sub(gasCostTxId1).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim 0.1 of dividend")

            //buyer A transfers
            await token.transfer(buyerB, 100, {from: buyerA, gasPrice: gasPrice})

            let beforeBalanceTwo = await web3.eth.getBalance(buyerB)
            let txId2 = await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice})
            let afterBalanceTwo = await web3.eth.getBalance(buyerB)
            let gasCostTxId2 = txId2.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceTwo.add(0.25 * ONEETHER).sub(gasCostTxId2).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim 0.25 of first dividend")

            //second deposit after token transfer
            await token.depositDividend({from: owner, value: ONEETHER})

            //byuer B claims second deposit
            let beforeBalanceThree = await web3.eth.getBalance(buyerB)
            let txId3 = await token.claimDividend(1, {from: buyerB, gasPrice: gasPrice})
            let afterBalanceThree = await web3.eth.getBalance(buyerB)
            let gasCostTxId3 = txId3.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceThree.add((0.25+0.1) * ONEETHER).sub(gasCostTxId3).toNumber(), afterBalanceThree.toNumber(), "buyer B should claim 0.25+0.1 of second dividend")

            //byuer A claims second deposit (without luck)
            let beforeBalanceFour = await web3.eth.getBalance(buyerA)
            let txId4 = await token.claimDividend(1, {from: buyerA, gasPrice: gasPrice})
            let afterBalanceFour = await web3.eth.getBalance(buyerA)
            let gasCostTxId4 = txId4.receipt.gasUsed * gasPrice
            assert.equal(beforeBalanceFour.sub(gasCostTxId4).toNumber(), afterBalanceFour.toNumber(), "buyer A has nothing to claim")
        })
    })

    contract('validating claimAll (can take a bit longer)', () => {
        it('claimAll does not run out of gas: 5 years, monthly dividends', async () => {
            let beforeBalanceA = await web3.eth.getBalance(buyerA)

            const dividendPaymentCount = 5*12
            for(let i=0; i<dividendPaymentCount; i++) {
                await token.depositDividend({from: owner, value: QUARTERETHER})
                await timeTravel(SECONDS_IN_A_MONTH) //1 month passes
            }
            
            let txId1 = await claimDividendAAll()
            let gasCostTxId1 = txId1.receipt.gasUsed * gasPrice

            let afterBalanceA = await web3.eth.getBalance(buyerA)

            const expectedTotalEther = ONEETHER + (QUARTERETHER*dividendPaymentCount)
            assert.equal(beforeBalanceA.add(0.1 * expectedTotalEther).sub(gasCostTxId1).toNumber(), afterBalanceA.toNumber(), "buyer A should claim 0.1 of dividend")
        })
    })

    contract('validating claimInBatches (can take a bit longer)', () => {
        it('claimInBatches does not run out of gas: 11 years, monthly dividends, yearly batches', async () => {
            let beforeBalanceA = await web3.eth.getBalance(buyerA)

            const years = 11

            const dividendPaymentCount = years*12
            let gasCostTxs = 0
            for(let i=0; i<dividendPaymentCount; i++) {
                await token.depositDividend({from: owner, value: QUARTERETHER})
                await timeTravel(SECONDS_IN_A_MONTH) //1 month passes
            }

            gasCostTxs = gasCostTxs + await claimInBatch(years)

            //trying to claim again before claimed all shouldn't affect the expected result
            gasCostTxs = gasCostTxs + await claimInBatch(years)

            let txId1 = await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice}) //from beforeEach
            gasCostTxs = gasCostTxs + txId1.receipt.gasUsed * gasPrice

            let afterBalanceA = await web3.eth.getBalance(buyerA)

            const expectedTotalEther = ONEETHER + (QUARTERETHER*dividendPaymentCount)
            assert.equal(beforeBalanceA.add(0.1 * expectedTotalEther).sub(gasCostTxs).toNumber(), afterBalanceA.toNumber(), "buyer A should claim 0.1 of dividend")
        })
    })

    contract('validating recycle', () => {
        it('Add a new token balance for account C', async () => {
            await token.mint(buyerC, 800, {from: capitalControl})
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

            const beforeBalanceA = await web3.eth.getBalance(buyerA)
            const beforeBalanceB = await web3.eth.getBalance(buyerB)
            const beforeBalanceC = await web3.eth.getBalance(buyerC)
            const beforeBalanceD = await web3.eth.getBalance(buyerD)
            const beforeBalanceE = await web3.eth.getBalance(buyerE)
        
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

            const afterBalanceA = await web3.eth.getBalance(buyerA)
            const afterBalanceB = await web3.eth.getBalance(buyerB)
            const afterBalanceC = await web3.eth.getBalance(buyerC)
            const afterBalanceD = await web3.eth.getBalance(buyerD)
            const afterBalanceE = await web3.eth.getBalance(buyerE)
        
            const gasCostTxIdA = txIdA.receipt.gasUsed * gasPrice
            const gasCostTxIdB = txIdB.receipt.gasUsed * gasPrice
            const gasCostTxIdC = txIdC.receipt.gasUsed * gasPrice
            const gasCostTxIdD = 0 //txIdD.receipt.gasUsed * gasPrice
            const gasCostTxIdE = txIdE.receipt.gasUsed * gasPrice

            //Balances for recycled dividend 1 are 100, 250, 500, 150, total = 1000, recycled dividend is 50% of total
            assert.equal(beforeBalanceA.add((100 / 1000) * (ONEETHER / 2)).sub(gasCostTxIdA).toNumber(), afterBalanceA.toNumber(), "buyer A should claim dividend")
            assert.equal(beforeBalanceB.add((250 / 1000) * (ONEETHER / 2)).sub(gasCostTxIdB).toNumber(), afterBalanceB.toNumber(), "buyer B should claim dividend")
            assert.equal(beforeBalanceC.add(0).sub(gasCostTxIdC).toNumber(), afterBalanceC.toNumber(), "buyer C should claim dividend")
            assert.equal(beforeBalanceD.add((500 / 1000) * (ONEETHER / 2)).sub(gasCostTxIdD).toNumber(), afterBalanceD.toNumber(), "buyer D recycled his dividend")
            assert.equal(beforeBalanceE.add((150 / 1000) * (ONEETHER / 2)).sub(gasCostTxIdE).toNumber(), afterBalanceE.toNumber(), "buyer E should claim dividend")
        })
    })
    
})
