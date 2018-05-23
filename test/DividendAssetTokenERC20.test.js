let EVMRevert = require('zeppelin-solidity/test/helpers/assertRevert');

const time = require('zeppelin-solidity/test/helpers/increaseTime');
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const DividendAssetToken = artifacts.require('DividendAssetToken.sol');
const ERC20TestToken = artifacts.require('ERC20TestToken.sol');
const ERC20TestTokenRetFalse = artifacts.require('ERC20TestTokenRetFalse.sol');

require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('DividendAssetToken', function (accounts) {

    let token = null;
    let erc20 = null;
    let erc20RetFalse = null;

    const ONEETHER  = 1000000000000000000;
    const YEAR = 86400 * 366;
    const gasPrice = 0;

    let buyerA = accounts[1];
    let buyerB = accounts[2];
    let buyerC = accounts[3];
    let buyerD = accounts[4];

    
  
    before(async function () {
        token = await DividendAssetToken.new();
        erc20 = await ERC20TestToken.new();
        erc20RetFalse = await ERC20TestTokenRetFalse.new();
        
        await token.mint(buyerA, 100);
        await token.mint(buyerB, 300);
        await token.mint(buyerD, 400);

    });

    describe('validating deposit ERC20Token', function () {
        it('balance of contract should be 1 ERC20 Token', async function () {
            await erc20.mint(accounts[0], ONEETHER);
            await erc20.approve(token.address, ONEETHER, { from: accounts[0] });
            await token.depositERC20Dividend(erc20.address, ONEETHER, {from: accounts[0] });
            let balance = await erc20.balanceOf(token.address);

            assert.equal(balance, ONEETHER);
        });

        it('depositing dividend token 0x0 reverts', async function () {
            await token.depositERC20Dividend(ZERO_ADDRESS, ONEETHER, {from: accounts[0] }).should.be.rejectedWith(EVMRevert);
        });

        it('depositing dividend token returning false on transfer reverts', async function () {
            await token.depositERC20Dividend(erc20RetFalse.address, ONEETHER, {from: accounts[0] }).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('validating claim', function () {
        it('buyer A should claim 0.125 of dividend', async function () {
            let beforeBalanceOne = await erc20.balanceOf(buyerA);
            let txId1 = await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice});
            let afterBalanceOne = await erc20.balanceOf(buyerA);
            let gasCostTxId1 = txId1.receipt.gasUsed * gasPrice;
            assert.equal(beforeBalanceOne.add(0.125 * ONEETHER).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim 0.125 of dividend");
        });

        it('buyer B should claim 0.375 of dividend', async function () {
            let beforeBalanceTwo = await erc20.balanceOf(buyerB);
            let txId2 = await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice});
            let afterBalanceTwo = await erc20.balanceOf(buyerB);
            let gasCostTxId2 = txId2.receipt.gasUsed * gasPrice;
            assert.equal(beforeBalanceTwo.add(0.375 * ONEETHER).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim 0.375 of dividend");        
        });

        it('Make sure further claims on this dividend fail for buyer A', async function () {
            await token.claimDividend(0, {from: buyerA, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert);
        });

        it('Make sure further claims on this dividend fail for buyer B', async function () {
            await token.claimDividend(0, {from: buyerB, gasPrice: gasPrice}).should.be.rejectedWith(EVMRevert);
        });

        it('Make sure zero balances give no value', async function () {
            let beforeBalanceThree = await erc20.balanceOf(buyerC);
            let txId3 = await token.claimDividend(0, {from: buyerC, gasPrice: gasPrice});
            let afterBalanceThree = await erc20.balanceOf(buyerC);
            let gasCostTxId3 = txId3.receipt.gasUsed * gasPrice;
            assert.equal(beforeBalanceThree.toNumber(), afterBalanceThree.toNumber(), "buyer C should have no claim");
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

            const beforeBalanceOne = await erc20.balanceOf(buyerA);
            const beforeBalanceTwo = await erc20.balanceOf(buyerB);
            const beforeBalanceThree = await erc20.balanceOf(buyerC);
            const beforeBalanceFour = await erc20.balanceOf(buyerD);
        
            const txId1 = await token.claimDividendAll({from: buyerA, gasPrice: gasPrice});
            const txId2 = await token.claimDividendAll({from: buyerB, gasPrice: gasPrice});
            const txId3 = await token.claimDividendAll({from: buyerC, gasPrice: gasPrice});
            const txId4 = await token.claimDividendAll({from: buyerD, gasPrice: gasPrice});
        
            const afterBalanceOne = await erc20.balanceOf(buyerA);
            const afterBalanceTwo = await erc20.balanceOf(buyerB);
            const afterBalanceThree = await erc20.balanceOf(buyerC);
            const afterBalanceFour = await erc20.balanceOf(buyerD);
        
            const gasCostTxId1 = txId1.receipt.gasUsed * gasPrice;
            const gasCostTxId2 = txId2.receipt.gasUsed * gasPrice;
            const gasCostTxId3 = txId3.receipt.gasUsed * gasPrice;
            const gasCostTxId4 = txId3.receipt.gasUsed * gasPrice;
        
            //Balances for recycled dividend 1 are 100, 300, 800, 400, total = 16, recycled dividend is 0.5 ETH
            assert.equal(beforeBalanceOne.add((100 / 1600) * (ONEETHER / 2)).toNumber(), afterBalanceOne.toNumber(), "buyer A should claim dividend");
            assert.equal(beforeBalanceTwo.add((300 / 1600) * (ONEETHER / 2)).toNumber(), afterBalanceTwo.toNumber(), "buyer B should claim dividend");
            assert.equal(beforeBalanceThree.add((800 / 1600) * (ONEETHER / 2)).toNumber(), afterBalanceThree.toNumber(), "buyer C should claim dividend");
            assert.equal(beforeBalanceFour.add((400 / 1600) * (ONEETHER / 2)).toNumber(), afterBalanceFour.toNumber(), "buyer D should claim dividend");
        
        });
    });

    
});
