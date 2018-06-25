let EVMRevert = require('zeppelin-solidity/test/helpers/assertRevert');
let timeTravel = require('./helper/timeTravel.js');

const time = require('zeppelin-solidity/test/helpers/increaseTime');
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';

const DividendAssetToken = artifacts.require('DividendAssetToken.sol');

require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('DividendAssetToken', function (accounts) {
    let token = null;
    let owner = null;
    
    const ONEETHER  = 1000000000000000000;
    const SECONDS_IN_A_YEAR = 86400 * 366;
    const gasPrice = 0;

    let buyerA = accounts[1];
    let buyerB = accounts[2];
    let buyerC = accounts[3];
    let buyerD = accounts[4];
    let buyerE = accounts[5];

    beforeEach(async function () {
        token = await DividendAssetToken.new();
        owner = await token.owner();
        
        //split
        await token.mint(buyerA, 100); //10%
        await token.mint(buyerB, 250); //25%
        await token.mint(buyerD, 500); //50%
        await token.mint(buyerE, 150); //15%

        //Make a deposit
        await token.depositDividend({from: owner, value: ONEETHER});
        let balance = await web3.eth.getBalance(token.address);
        assert.equal(balance, ONEETHER);
    });

    let claimDividendA = async () => {
        return await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice});
    }

    let claimDividendB = async () => {
        return await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice});
    }

    let claimAll = async () => {
        await claimDividendA();
        await claimDividendB();
        await token.claimDividendAll({from: buyerC, gasPrice: gasPrice});
        await token.claimDividendAll({from: buyerD, gasPrice: gasPrice});
        await token.claimDividendAll({from: buyerE, gasPrice: gasPrice});
    }

    let claimAllButD = async () => {
        await claimDividendA();
        await claimDividendB();
        await token.claimDividendAll({from: buyerC, gasPrice: gasPrice});
        //await token.claimDividendAll({from: buyerD, gasPrice: gasPrice});
        await token.claimDividendAll({from: buyerE, gasPrice: gasPrice});
    }

    contract('validating claim', function () {
        it('buyer A should claim 0.1 of dividend', async function () {
            let beforeBalanceOne = await web3.eth.getBalance(buyerA);
            let txId1 = await claimDividendA();
            let afterBalanceOne = await web3.eth.getBalance(buyerA);
            let gasCostTxId1 = txId1.receipt.gasUsed * gasPrice;
            assert.equal(beforeBalanceOne.add(0.1 * ONEETHER).sub(gasCostTxId1).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim 0.1 of dividend");
        });

        it('buyer B should claim 0.25 of dividend', async function () {
            let beforeBalanceTwo = await web3.eth.getBalance(buyerB);
            let txId2 = await claimDividendB();
            let afterBalanceTwo = await web3.eth.getBalance(buyerB);
            let gasCostTxId2 = txId2.receipt.gasUsed * gasPrice;
            assert.equal(beforeBalanceTwo.add(0.25 * ONEETHER).sub(gasCostTxId2).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim 0.25 of dividend");
        });

        it('Make sure further claims on this dividend fail for buyer A', async function () {
            await claimDividendA();
            await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert);
        });

        it('Make sure further claims on this dividend fail for buyer B', async function () {
            await claimDividendB();
            await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert);
        });

        it('Make sure zero balances give no value', async function () {
            let beforeBalanceThree = await web3.eth.getBalance(buyerC);
            let txId3 = await token.claimDividend(0, {from: buyerC, gasPrice: gasPrice});
            let afterBalanceThree = await web3.eth.getBalance(buyerC);
            let gasCostTxId3 = txId3.receipt.gasUsed * gasPrice;
            assert.equal(beforeBalanceThree.sub(gasCostTxId3).toNumber(), afterBalanceThree.toNumber(), "buyer C should have no claim");
        });
    });

    contract('validating recycle', function () {
        it('Add a new token balance for account C', async function () {
            await token.mint(buyerC, 800);
            const balance = await token.balanceOf(buyerC);
            assert.equal(balance, 800);
        });

        it('Recycle remainder of dividend distribution 0 should fail within one year ', async function () {
            await token.recycleDividend(0, {from: owner}).should.be.rejectedWith(EVMRevert);
        });

        it('Recycle remainder of dividend distribution 0', async function () {
            await timeTravel(SECONDS_IN_A_YEAR); //1 year time lock passes

            await token.recycleDividend(0, {from: owner});
        });

        it('Check everyone can claim recycled dividend', async function () {
            //claim all but buyerD
            const txIdA = await claimDividendA();
            const txIdB = await claimDividendB();
            const txIdC = await token.claimDividendAll({from: buyerC, gasPrice: gasPrice});
            //const txIdD = await token.claimDividendAll({from: buyerD, gasPrice: gasPrice});
            const txIdE = await token.claimDividendAll({from: buyerE, gasPrice: gasPrice});

            const beforeBalanceA = await web3.eth.getBalance(buyerA);
            const beforeBalanceB = await web3.eth.getBalance(buyerB);
            const beforeBalanceC = await web3.eth.getBalance(buyerC);
            const beforeBalanceD = await web3.eth.getBalance(buyerD);
            const beforeBalanceE = await web3.eth.getBalance(buyerE);
        
            await timeTravel(SECONDS_IN_A_YEAR); //1 year time lock passes

            await token.recycleDividend(0, {from: owner}); //act
            
            await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert);
            await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert);
            await token.claimDividend(0, {from: buyerC, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert);
            await token.claimDividend(0, {from: buyerD, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert);
            await token.claimDividend(0, {from: buyerE, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert);

            const newDividendIndexAfterRecycle = 1;

            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerA, gasPrice: gasPrice});
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerB, gasPrice: gasPrice});
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerC, gasPrice: gasPrice});
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerD, gasPrice: gasPrice});
            await token.claimDividend(newDividendIndexAfterRecycle, {from: buyerE, gasPrice: gasPrice});

            const afterBalanceA = await web3.eth.getBalance(buyerA);
            const afterBalanceB = await web3.eth.getBalance(buyerB);
            const afterBalanceC = await web3.eth.getBalance(buyerC);
            const afterBalanceD = await web3.eth.getBalance(buyerD);
            const afterBalanceE = await web3.eth.getBalance(buyerE);
        
            const gasCostTxIdA = txIdA.receipt.gasUsed * gasPrice;
            const gasCostTxIdB = txIdB.receipt.gasUsed * gasPrice;
            const gasCostTxIdC = txIdC.receipt.gasUsed * gasPrice;
            const gasCostTxIdD = 0; //txIdD.receipt.gasUsed * gasPrice;
            const gasCostTxIdE = txIdE.receipt.gasUsed * gasPrice;

            //Balances for recycled dividend 1 are 100, 250, 500, 150, total = 1000, recycled dividend is 50% of total
            assert.equal(beforeBalanceA.add((100 / 1000) * (ONEETHER / 2)).sub(gasCostTxIdA).toNumber(), afterBalanceA.toNumber(), "buyer A should claim dividend");
            assert.equal(beforeBalanceB.add((250 / 1000) * (ONEETHER / 2)).sub(gasCostTxIdB).toNumber(), afterBalanceB.toNumber(), "buyer B should claim dividend");
            assert.equal(beforeBalanceC.add(0).sub(gasCostTxIdC).toNumber(), afterBalanceC.toNumber(), "buyer C should claim dividend");
            assert.equal(beforeBalanceD.add((500 / 1000) * (ONEETHER / 2)).sub(gasCostTxIdD).toNumber(), afterBalanceD.toNumber(), "buyer D recycled his dividend");
            assert.equal(beforeBalanceE.add((150 / 1000) * (ONEETHER / 2)).sub(gasCostTxIdE).toNumber(), afterBalanceE.toNumber(), "buyer E should claim dividend");
        });
    });
    
});
