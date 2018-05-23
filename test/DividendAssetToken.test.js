let EVMRevert = require('zeppelin-solidity/test/helpers/assertRevert');

const time = require('zeppelin-solidity/test/helpers/increaseTime');
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';

const DividendAssetToken = artifacts.require('DividendAssetToken.sol');

require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('DividendAssetToken', function (accounts) {

    let token = null;

    const ONEETHER  = 1000000000000000000;
    const YEAR = 86400 * 366;
    const gasPrice = 0;

    let buyerA = accounts[1];
    let buyerB = accounts[2];
    let buyerC = accounts[3];
    let buyerD = accounts[4];

    before(async function () {
        token = await DividendAssetToken.new();
        
        await token.mint(buyerA, 100);
        await token.mint(buyerB, 300);
        await token.mint(buyerD, 400);

    });

    describe('validating deposit ether', function () {
        it('balance of contract should be 1 ETH', async function () {
            //Make a deposit
            await token.depositDividend({from: accounts[0], value: ONEETHER});
            let balance = await web3.eth.getBalance(token.address);

            assert.equal(balance, ONEETHER);
        });
    });

    describe('validating claim', function () {
        it('buyer A should claim 0.125 of dividend', async function () {
            let beforeBalanceOne = await web3.eth.getBalance(buyerA);
            let txId1 = await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice});
            let afterBalanceOne = await web3.eth.getBalance(buyerA);
            let gasCostTxId1 = txId1.receipt.gasUsed * gasPrice;
            assert.equal(beforeBalanceOne.add(0.125 * ONEETHER).sub(gasCostTxId1).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim 0.125 of dividend");
        });

        it('buyer B should claim 0.375 of dividend', async function () {
            let beforeBalanceTwo = await web3.eth.getBalance(buyerB);
            let txId2 = await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice});
            let afterBalanceTwo = await web3.eth.getBalance(buyerB);
            let gasCostTxId2 = txId2.receipt.gasUsed * gasPrice;
            assert.equal(beforeBalanceTwo.add(0.375 * ONEETHER).sub(gasCostTxId2).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim 0.375 of dividend");        
        });

        it('Make sure further claims on this dividend fail for buyer A', async function () {
            await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert);
        });

        it('Make sure further claims on this dividend fail for buyer B', async function () {
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

    describe('validating recycle', function () {
        it('Add a new token balance for account C', async function () {
            await token.mint(buyerC, 800);
            const balance = await token.balanceOf(buyerC);
            assert.equal(balance, 800);
        });

        it('Recycle remainder of dividend distribution 0 should fail within one year ', async function () {
            await token.recycleDividend(0, {from: accounts[0]}).should.be.rejectedWith(EVMRevert);
        });

        it('Recycle remainder of dividend distribution 0', async function () {
            let nowTime = latestTime();
            let startTime = latestTime() + time.duration.years(1);
            await time.increaseTimeTo(startTime);
            await token.recycleDividend(0, {from: accounts[0]});
        });

        it('Check everyone can claim recycled dividend', async function () {

            const beforeBalanceOne = await web3.eth.getBalance(buyerA);
            const beforeBalanceTwo = await web3.eth.getBalance(buyerB);
            const beforeBalanceThree = await web3.eth.getBalance(buyerC);
            const beforeBalanceFour = await web3.eth.getBalance(buyerD);
        
            const txId1 = await token.claimDividendAll({from: buyerA, gasPrice: gasPrice});
            const txId2 = await token.claimDividendAll({from: buyerB, gasPrice: gasPrice});
            const txId3 = await token.claimDividendAll({from: buyerC, gasPrice: gasPrice});
            const txId4 = await token.claimDividendAll({from: buyerD, gasPrice: gasPrice});
        
            const afterBalanceOne = await web3.eth.getBalance(buyerA);
            const afterBalanceTwo = await web3.eth.getBalance(buyerB);
            const afterBalanceThree = await web3.eth.getBalance(buyerC);
            const afterBalanceFour = await web3.eth.getBalance(buyerD);
        
            const gasCostTxId1 = txId1.receipt.gasUsed * gasPrice;
            const gasCostTxId2 = txId2.receipt.gasUsed * gasPrice;
            const gasCostTxId3 = txId3.receipt.gasUsed * gasPrice;
            const gasCostTxId4 = txId3.receipt.gasUsed * gasPrice;
        
            //Balances for recycled dividend 1 are 100, 300, 800, 400, total = 16, recycled dividend is 0.5 ETH
            assert.equal(beforeBalanceOne.add((100 / 1600) * (ONEETHER / 2)).sub(gasCostTxId1).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim dividend");
            assert.equal(beforeBalanceTwo.add((300 / 1600) * (ONEETHER / 2)).sub(gasCostTxId2).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim dividend");
            assert.equal(beforeBalanceThree.add((800 / 1600) * (ONEETHER / 2)).sub(gasCostTxId2).toNumber(), afterBalanceThree.toNumber(), "buyer C should claim dividend");
            assert.equal(beforeBalanceFour.add((400 / 1600) * (ONEETHER / 2)).sub(gasCostTxId2).toNumber(), afterBalanceFour.toNumber(), "buyer D should claim dividend");
        

        });
    });
    
});
