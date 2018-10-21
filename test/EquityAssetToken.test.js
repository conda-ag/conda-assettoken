let EVMRevert = require('openzeppelin-solidity/test/helpers/assertRevert')
let timeTravel = require('./helper/timeTravel.js')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const EquityAssetToken = artifacts.require('EquityAssetToken.sol')
const ERC20TestToken = artifacts.require('ERC20TestToken.sol')
const ERC20TestTokenRetFalse = artifacts.require('ERC20TestTokenRetValueSimulator.sol')
const MOCKCRWDClearing = artifacts.require('MOCKCRWDClearing.sol')

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('EquityAssetToken', (accounts) => {

    let token = null
    let erc20 = null
    let erc20RetFalse = null
    let originalOwner = null

    let clearing = null

    const ONETOKEN  = 1
    const ONETHOUSANDTOKEN  = ONETOKEN * 1000
    const SECONDS_IN_A_YEAR = 86400 * 366
    const gasPrice = 0

    let buyerA = accounts[1]
    let buyerB = accounts[2]
    let buyerC = accounts[3]
    let buyerD = accounts[4]
    let buyerE = accounts[5]

    const pauseControl = accounts[9]
    const tokenRescueControl = accounts[7]

    let mintControl = accounts[6]

    const capitalControl = accounts[8]

    const unknown = buyerC // reused buyerC to stay bellow 10 accounts
    
    beforeEach(async () => {
        token = await EquityAssetToken.new(capitalControl)
        await token.setMintControl(mintControl)
        erc20 = await ERC20TestToken.new()
        erc20RetFalse = await ERC20TestTokenRetFalse.new()
        originalOwner = await token.owner()
        
        //mock clearing so it doesn't cost money
        clearing = await MOCKCRWDClearing.new()
        await clearing.setFee((await ERC20TestToken.new()).address, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS)
        await token.setClearingAddress(clearing.address)

        assert.equal((await token.decimals()).toString(), 0)

        await token.setTokenAlive()

        //split
        await token.mint(buyerA, 100, { from: capitalControl }) //10%
        await token.mint(buyerB, 250, { from: capitalControl }) //25%
        await token.mint(buyerD, 500, { from: capitalControl }) //50%
        await token.mint(buyerE, 150, { from: capitalControl }) //15%
        assert.equal((await token.totalSupply()).toString(), '1000')
    })

    contract('fixed decimals', () => {
        it('decimals is 0 FIXED', async () => {
            assert.equal((await token.decimals()).toString(), 0)
        })
    })

    contract('validating updateCapitalControl()', () => {
        it('updateCapitalControl() cannot be set by originalOwner (alive or not)', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            await tmpToken.updateCapitalControl(buyerA, {from: originalOwner}).should.be.rejectedWith(EVMRevert)
            await tmpToken.setTokenAlive()
            await tmpToken.updateCapitalControl(buyerA, {from: originalOwner}).should.be.rejectedWith(EVMRevert)
        })

        it('updateCapitalControl() can be set by capitalControl', async () => {
            await token.updateCapitalControl(buyerA, {from: capitalControl})
        })
    })

    contract('validating setCapitalControl()', () => {
        it('setCapitalControl() can be set by owner when not alive', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            await tmpToken.setCapitalControl(buyerA, {from: originalOwner})
        })

        it('setCapitalControl() cannot be set by unknown', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            await tmpToken.setCapitalControl(capitalControl, {from: unknown}).should.be.rejectedWith(EVMRevert)
        })

        it('setCapitalControl() cannot be set when alive', async () => {
            await token.setCapitalControl(buyerA, {from: originalOwner}).should.be.rejectedWith(EVMRevert)
            await token.setCapitalControl(buyerA, {from: capitalControl}) //this works because owner==capitalControl
        })
    })

    contract('validating setTokenAlive()', () => {
        it('owner cannot mint', async () => {
            await token.mint(buyerA, 100, {from: originalOwner}).should.be.rejectedWith(EVMRevert)
        })

        it('setTokenAlive() can be set by owner', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            await tmpToken.setTokenAlive({from: originalOwner})

            assert.equal(await tmpToken.capitalControl(), capitalControl)
            assert.equal(await tmpToken.owner(), originalOwner)
        })

        it('setTokenAlive() cannot be set by investor', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            await tmpToken.setTokenAlive({from: buyerA}).should.be.rejectedWith(EVMRevert)
        })

        it('setTokenAlive() cannot be set by mintControl', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            await tmpToken.setTokenAlive({from: mintControl}).should.be.rejectedWith(EVMRevert)
        })

        it('setCapitalControl() cannot be set when alive', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            await tmpToken.setTokenAlive()
            await tmpToken.setCapitalControl(capitalControl, {from: originalOwner}).should.be.rejectedWith(EVMRevert)
        })

        it('capitalControl can mint (alive or not)', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)

            //mock clearing so it doesn't cost money
            await tmpToken.setClearingAddress(clearing.address)

            await tmpToken.mint(buyerA, 10, {from: capitalControl})
            await tmpToken.setTokenAlive()
            await tmpToken.mint(buyerA, 10, {from: capitalControl})

            assert.equal((await tmpToken.balanceOf(buyerA)).toString(), "20")
        })
    })

    contract('validating setting of mintControl address', () => {
        it('address 0x0 is reverted', async () => {
            await token.setMintControl(ZERO_ADDRESS, {from: capitalControl}).should.be.rejectedWith(EVMRevert)
        })

        it('can set erc20 address as mintControl address', async () => {
            let anyErc20Token = await ERC20TestToken.new()

            await token.setMintControl(anyErc20Token.address, {from: capitalControl})

            assert.notEqual(anyErc20Token.address, ZERO_ADDRESS)
            assert.equal(await token.getMintControl.call(), anyErc20Token.address)
        })
    })

    contract('validating totalSupply', () => {
        it('1000 totalSupply in the beginning', async () => {
            let totalSupply = await token.totalSupply()
    
            assert.equal(totalSupply.toString(), '1000')
        })

        it('when A mints 100 totalSupply should be 1100', async () => {
            await token.mint(buyerA, 100, {from: capitalControl})

            let totalSupply = await token.totalSupply()
    
            assert.equal(totalSupply.toString(), 1100)
        })

        it('when A and B both mint 100 totalSupply should be 1200', async () => {
            await token.mint(buyerA, 100, {from: capitalControl})
            await token.mint(buyerB, 100, {from: capitalControl})

            let totalSupply = await token.totalSupply()
    
            assert.equal(totalSupply.toString(), '1200')
        })
    })

    contract('validating mint()', () => {
        it('instant call of balances ', async () => {
            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 100)
        })

        it('should return correct balances after mint', async () => {
            await token.mint(buyerA, 100, {from: capitalControl})
            await token.mint(buyerA, 100, {from: capitalControl})
      
            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 300)
        })

        it('should NOT throw an error when trying to mint but finished minting as capitalControl', async () => {
            await token.finishMinting({from: originalOwner})
            await token.mint(buyerA, 200, {from: capitalControl})

            assert.equal((await token.balanceOf(buyerA)).toString(), '300')
        })

        it('originalOwner cannot mint after alive', async () => {
            await token.mint(buyerA, 200, {from: originalOwner}).should.be.rejectedWith(EVMRevert)

            assert.equal((await token.balanceOf(buyerA)).toString(), '100')
        })

        contract('validating mint when paused', () => {
            it('trying to mint when minting is paused should still work for capitalControl', async () => {
                const tmpToken = await EquityAssetToken.new(capitalControl)
                await tmpToken.setClearingAddress(clearing.address)
                await tmpToken.setMintControl(mintControl)
                await tmpToken.setRoles(pauseControl, tokenRescueControl, {from: originalOwner})

                await tmpToken.setTokenAlive()

                await tmpToken.mint(buyerA, 10, {from: mintControl}) //works
                await tmpToken.pauseCapitalIncreaseOrDecrease(false, {from: pauseControl}) //now disabled
                assert.equal(await tmpToken.isMintingPaused(), true, "as precondition minting must be paused")

                await tmpToken.mint(buyerA, 10, {from: capitalControl})
            })
        })
    })

    contract('validating reopenCrowdsale()', () => {
        it('can reopen crowdsale as capitalControl', async () => {
            await token.finishMinting({from: originalOwner})
            await token.mint(buyerA, 10, {from: capitalControl}) //works because capitalControl
            await token.mint(buyerA, 10, {from: mintControl}).should.be.rejectedWith(EVMRevert) //not possible anymore
            
            await token.reopenCrowdsale({from: capitalControl})

            await token.mint(buyerA, 10, {from: capitalControl}) //still possible as capitalControl...
            await token.mint(buyerA, 10, {from: mintControl}) //again possible as mintControl...

            let firstAccountBalance = await token.balanceOf(buyerA)
            assert.equal(firstAccountBalance, 130)
        })

        it('cannot reopen crowdsale as non-capitalControl', async () => {
            await token.finishMinting({from: originalOwner})
            
            await token.reopenCrowdsale({from: unknown}).should.be.rejectedWith(EVMRevert)
        })
    })

    // contract('validating burn', () => {
    //     contract('burning should not be possible when alive', () => {
    //         it('cannot burn as capitalControl when finished as capitalcontrol (requires redeployment)', async () => {
    //             await token.mint(buyerA, 100, {from: capitalControl})

    //             await token.finishMinting({from: owner})
    //             await token.burn(buyerA, 10, {from: capitalControl}).should.be.rejectedWith(EVMRevert) //works because capitalControl

    //             let firstAccountBalance = await token.balanceOf(buyerA)
    //             assert.equal(firstAccountBalance.toString(), '200')

    //             let totalSupply = await token.totalSupply()
    //             assert.equal(totalSupply.toString(), '1100')
    //         })
    //     })
    // })

    contract('validating transfer', () => {
        it('transfer should be disabled by default', async () => {
            //buyerA wants to give his share to buyerB
            await token.transfer(buyerB, 100, {from: buyerA}).should.be.rejectedWith(EVMRevert)
        })

        it('transfer should work when enabled by capitalControl', async () => {
            await token.enableTransfers(true, {from: capitalControl})

            //buyerA wants to give his share to buyerB
            await token.transfer(buyerB, 100, {from: buyerA})

            assert.equal(await token.balanceOf(buyerA), 0)
            assert.equal(await token.balanceOf(buyerB), (250+100))
        })

        it('cannot transfer more than I have', async () => {
            await token.enableTransfers(true, {from: capitalControl})

            //buyerA wants to give his share to buyerB
            await token.transfer(buyerB, 101, {from: buyerA}).should.be.rejectedWith(EVMRevert) //only has 100

            assert.equal((await token.balanceOf(buyerA)).toString(), '100') //no change
            assert.equal((await token.balanceOf(buyerB)).toString(), '250') //no change
        })

        it('should throw an error when trying to transfer to 0x0', async () => {
            await token.enableTransfers(true, {from: capitalControl})

            await token.transfer(0x0, 100, {from: buyerA}).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating transferFrom() with approve()', () => {
        it('can send transferFrom() with approval', async () => {
            await token.enableTransfers(true, {from: capitalControl})

            const balanceBuyerABefore = await token.balanceOf(buyerA)
            const balanceBuyerBBefore = await token.balanceOf(buyerB)
            const balanceBuyerCBefore = await token.balanceOf(buyerC)
            
            await token.approve(buyerB, 100, {from: buyerA})
            await token.transferFrom(buyerA, buyerC, 30, {from: buyerB})

            const balanceBuyerAAfter = await token.balanceOf(buyerA)
            const balanceBuyerBAfter = await token.balanceOf(buyerB)
            const balanceBuyerCAfter = await token.balanceOf(buyerC)

            assert.equal(balanceBuyerAAfter.toString(), (balanceBuyerABefore.toNumber()-30).toString(), "balanceBuyerA was unexpected")
            assert.equal(balanceBuyerBAfter.toString(), balanceBuyerBBefore.toString(), "balanceBuyerB was unexpected")
            assert.equal(balanceBuyerCAfter.toString(), (balanceBuyerCBefore.toNumber()+30).toString(), "balanceBuyerC was unexpected")
        })

        it('cannot send transferFrom() without approval', async () => {
            await token.enableTransfers(true, {from: capitalControl})

            const balanceBuyerABefore = await token.balanceOf(buyerA)
            const balanceBuyerBBefore = await token.balanceOf(buyerB)
            const balanceBuyerCBefore = await token.balanceOf(buyerC)
            
            //await token.approve(buyerB, 100, {from: buyerA})
            await token.transferFrom(buyerA, buyerC, 30, {from: buyerB}).should.be.rejectedWith(EVMRevert)

            const balanceBuyerAAfter = await token.balanceOf(buyerA)
            const balanceBuyerBAfter = await token.balanceOf(buyerB)
            const balanceBuyerCAfter = await token.balanceOf(buyerC)

            assert.equal(balanceBuyerAAfter.toString(), balanceBuyerABefore.toString(), "balanceBuyerA was unexpected")
            assert.equal(balanceBuyerBAfter.toString(), balanceBuyerBBefore.toString(), "balanceBuyerB was unexpected")
            assert.equal(balanceBuyerCAfter.toString(), balanceBuyerCBefore.toString(), "balanceBuyerC was unexpected")
        })

        it('can send enforced transferFrom() even without approval as capitalControl when wallet is lost', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            await tmpToken.setClearingAddress(clearing.address)

            await tmpToken.setTokenAlive()

            await tmpToken.mint(buyerA, 100, { from: capitalControl }) //buyerA has 100

            await tmpToken.enableTransfers(true, {from: capitalControl})

            const balanceBuyerABefore = await tmpToken.balanceOf(buyerA)
            const balanceBuyerBBefore = await tmpToken.balanceOf(buyerB)
            const balanceBuyerCBefore = await tmpToken.balanceOf(buyerC)
            assert.equal(balanceBuyerABefore.toString(), '100', 'prerequisit: buyerA needs tokens')

            // await tmpToken.approve(capitalControl, 100, {from: buyerA})
            await tmpToken.transferFrom(buyerA, buyerC, 100, {from: capitalControl}) //capitalControl passes money without approval

            const balanceBuyerAAfter = await tmpToken.balanceOf(buyerA)
            const balanceBuyerBAfter = await tmpToken.balanceOf(buyerB)
            const balanceBuyerCAfter = await tmpToken.balanceOf(buyerC)

            assert.equal(balanceBuyerAAfter.toString(), (balanceBuyerABefore.toNumber()-100).toString(), "balanceBuyerA was unexpected")
            assert.equal(balanceBuyerBAfter.toString(), balanceBuyerBBefore.toString(), "balanceBuyerB was unexpected")
            assert.equal(balanceBuyerCAfter.toString(), (balanceBuyerCBefore.toNumber()+100).toString(), "balanceBuyerC was unexpected")
        })

        it('cannot enforced transferFrom() when wallet is lost if not full amount', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            await tmpToken.setClearingAddress(clearing.address)

            await tmpToken.setTokenAlive()

            await tmpToken.mint(buyerA, 100, { from: capitalControl }) //buyerA has 100

            await tmpToken.enableTransfers(true, {from: capitalControl})

            const balanceBuyerABefore = await tmpToken.balanceOf(buyerA)
            const balanceBuyerBBefore = await tmpToken.balanceOf(buyerB)
            const balanceBuyerCBefore = await tmpToken.balanceOf(buyerC)
            assert.equal(balanceBuyerABefore.toString(), '100', 'prerequisit: buyerA needs tokens')

            // await tmpToken.approve(capitalControl, 100, {from: buyerA})
            await tmpToken.transferFrom(buyerA, buyerC, 30, {from: capitalControl}).should.be.rejectedWith(EVMRevert) //not full amount

            const balanceBuyerAAfter = await tmpToken.balanceOf(buyerA)
            const balanceBuyerBAfter = await tmpToken.balanceOf(buyerB)
            const balanceBuyerCAfter = await tmpToken.balanceOf(buyerC)

            assert.equal(balanceBuyerAAfter.toString(), balanceBuyerABefore.toNumber().toString(), "balanceBuyerA was unexpected")
            assert.equal(balanceBuyerBAfter.toString(), balanceBuyerBBefore.toString(), "balanceBuyerB was unexpected")
            assert.equal(balanceBuyerCAfter.toString(), balanceBuyerCBefore.toNumber().toString(), "balanceBuyerC was unexpected")
        })
    })

    contract('validating approve and allowance', () => {
        it('should return the correct allowance amount after approval', async () => {
            await token.enableTransfers(true, {from: capitalControl})

            await token.approve(buyerB, 100, { from: buyerA })
            let allowance = await token.allowance(buyerA, buyerB)

            assert.equal(allowance, 100)
        })
    })

    contract('validating transferFrom', () => {
        it('should return correct balances after transfering from another account', async () => {
            await token.enableTransfers(true, {from: capitalControl})

            await token.approve(buyerB, 100, { from: buyerA })
            await token.transferFrom(buyerA, buyerC, 100, { from: buyerB })

            let balanceA = await token.balanceOf(buyerA)
            assert.equal(balanceA.toString(), '0')

            let balanceC = await token.balanceOf(buyerC)
            assert.equal(balanceC.toString(), '100')

            let balanceB = await token.balanceOf(buyerB)
            assert.equal(balanceB.toString(), '250') //he also had 250 initially
        })

        it('should be disabled by default', async () => {
            await token.enableTransfers(false, {from: capitalControl})

            await token.approve(buyerB, 100, { from: buyerA })
            await token.transferFrom(buyerA, buyerC, 100, { from: buyerB }).should.be.rejectedWith(EVMRevert)
        })

        it('should throw an error when trying to transfer more than allowed', async () => {
            await token.enableTransfers(true, {from: capitalControl})
            
            await token.approve(buyerB, 99 , { from: buyerA })
            await token.transferFrom(buyerA, buyerB, 100, { from: buyerB }).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating setMetaData()', () => {
        it('owner can change metadata when not alive', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)

            await tmpToken.setMetaData("changed name", "changed symbol", ZERO_ADDRESS, {from: originalOwner})
            assert.equal(await tmpToken.name(), "changed name")
            assert.equal(await tmpToken.symbol(), "changed symbol")
        })

        it('non owner cannot change metadata even if not alive yet', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)

            originalOwner.should.not.eq(buyerA)
            await tmpToken.setMetaData("changed name", "changed symbol", ZERO_ADDRESS, {'from': buyerA }).should.be.rejectedWith(EVMRevert)
        })

        it('owner cannot change metadata when alive', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)

            await tmpToken.setTokenAlive()
            await tmpToken.setMetaData("changed name", "changed symbol", ZERO_ADDRESS, {from: originalOwner}).should.be.rejectedWith(EVMRevert)
        })

        it('capitalControl can change metadata even when alive', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)

            await tmpToken.setTokenAlive()
            await tmpToken.setMetaData("changed name", "changed symbol", ZERO_ADDRESS, {from: capitalControl})
        })
    })

    contract('validating setMetaData()', () => {
        it('owner can change baseRate when not alive', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            const tmpEurt = await ERC20TestToken.new()

            await tmpToken.setMetaData("", "SYM", tmpEurt.address, { from: originalOwner })
            assert.equal(await tmpToken.baseCurrency(), tmpEurt.address)
        })

        it('non owner cannot change baseCurrency even if not yet alive', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            const tmpEurt = await ERC20TestToken.new()

            originalOwner.should.not.eq(unknown)
            await tmpToken.setMetaData("", "SYM", tmpEurt.address, { from: unknown }).should.be.rejectedWith(EVMRevert)
        })

        it('capitalControl can change anytime', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            const tmpEurt1 = await ERC20TestToken.new()
            const tmpEurt2 = await ERC20TestToken.new()

            await tmpToken.setMetaData("", "SYM", tmpEurt1.address, { from: capitalControl })
            assert.equal(await tmpToken.baseCurrency(), tmpEurt1.address)

            await tmpToken.setTokenAlive()

            await tmpToken.setMetaData("", "SYM", tmpEurt2.address, { from: capitalControl })
            assert.equal(await tmpToken.baseCurrency(), tmpEurt2.address)
        })

        it('owner cannot change currencyMetaData when alive', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            const tmpEurt = await ERC20TestToken.new()

            await tmpToken.setTokenAlive()
            await tmpToken.setMetaData("", "SYM", tmpEurt.address, { from: originalOwner }).should.be.rejectedWith(EVMRevert)
        })
    })

    contract('validating setRoles() set pauseControl', () => {
        it('setRoles() set pauseControl can set pauseControl address as capitalControl when alive', async () => {
            assert.equal(await token.getPauseControl(), ZERO_ADDRESS) //precondition

            await token.setRoles(pauseControl, tokenRescueControl, {from: capitalControl})

            assert.equal(await token.getPauseControl(), pauseControl)
        })

        it('setRoles() set pauseControl can be set as owner before alive', async () => {
            const tmpToken = await EquityAssetToken.new(capitalControl)
            assert.equal(await tmpToken.getPauseControl(), ZERO_ADDRESS) //precondition

            await tmpToken.setRoles(pauseControl, tokenRescueControl, {from: originalOwner})

            assert.equal(await tmpToken.getPauseControl(), pauseControl)
        })

        it('setRoles() set pauseControl cannot set pauseControl address as unknown', async () => {
            assert.equal(await token.getPauseControl(), ZERO_ADDRESS) //precondition

            await token.setRoles(pauseControl, tokenRescueControl, {from: unknown}).should.be.rejectedWith(EVMRevert)

            assert.equal(await token.getPauseControl(), ZERO_ADDRESS)
        })

        it('setRoles() set pauseControl cannot set pauseControl address as originalOwner', async () => {
            assert.equal(await token.getPauseControl(), ZERO_ADDRESS) //precondition

            await token.setRoles(pauseControl, tokenRescueControl, {from: originalOwner}).should.be.rejectedWith(EVMRevert)

            assert.equal(await token.getPauseControl(), ZERO_ADDRESS)
        })
    })
})
