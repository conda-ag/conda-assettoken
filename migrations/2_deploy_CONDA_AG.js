const CRWDAssetToken = artifacts.require("CRWDAssetToken.sol")
const BasicAssetToken = artifacts.require("BasicAssetToken.sol")

const DividendAssetToken = artifacts.require("DividendAssetToken.sol")
const EquityAssetToken = artifacts.require("EquityAssetToken.sol")

const DividendEquityAssetToken = artifacts.require("DividendEquityAssetToken.sol")

const FeatureCapitalControl = artifacts.require("FeatureCapitalControl.sol")
const FeatureCapitalControlWithForcedTransferFrom = artifacts.require("FeatureCapitalControlWithForcedTransferFrom.sol")

const AssetTokenL = artifacts.require("AssetTokenL.sol")

const MockCRWDClearing = artifacts.require("MockCRWDClearing.sol")

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const equity =
    [
    {addr: "0x8846f6A9c956BB4BB5716D36F3A8275941Afca36", tokens: 14701},
    {addr: "0xD82695f4314726c472abE2e470B4EF58b5cA79d8", tokens: 20581},
    {addr: "0xaa84240e8f1d34029005935Ec08B78F38201636C", tokens: 11029},
    {addr: "0xC5d22B58C6A88e811e02473839dd0B0FBC8B2b4b", tokens: 12510},
    {addr: "0xE0dc5304fdAD430bE76494E5e2E8728622c71D25", tokens: 7945},
    {addr: "0xd98f05370EB15e69bd157156A1699cD30711D7b0", tokens: 4368},
    {addr: "0xA4223e49ee037c64720215Ce1F0482911ccD164a", tokens: 1614},
    {addr: "0xCF8f5f1512CC61c9d53C0dCB1faCb90890b0ab2E", tokens: 2180},
    {addr: "0x238479042084C0A5B38d9C346ec57c247c0c28a9", tokens: 250},
    {addr: "0x7BF60a100d1102Fce63b5888637b15D7FF52eA4D", tokens: 334},
    {addr: "0x4342e6834500784EDdaa3B5F7C6e4C8a7B2ED858", tokens: 250},
    {addr: "0x1eA0294991344Df3d59E2b2648cc7534E4E81267", tokens: 250},
    {addr: "0x1509e1A6eE0eB910b548b4932FF511186B3A0F37", tokens: 5631},
    {addr: "0xcd6D1bDfDe1900078348264D4BDe218b31E09B97", tokens: 182},
    {addr: "0x1BF53Ea8dF817c2F3626b390d4d8c1e9F9469914", tokens: 450},
    {addr: "0x26353aC57C18F09538Caf2E6caac7f1D1e4E531E", tokens: 450},
    {addr: "0x8579E650b0B8865a04E1d13c1dC8f6aAb239D19B", tokens: 273},
    {addr: "0x033AF1bAC5172ee30e01Cf2dF36930ff934D9778", tokens: 100},
    {addr: "0xEd9036FA2CfD851f6f6d3f7A36317A398D147e8E", tokens: 100},
    {addr: "0x59Aa91EEf72b361D3E70c166eb267D4dD80350B3", tokens: 100},
    {addr: "0xa5E294767Fd2D5f81CEB6d888b3937243784Cd93", tokens: 91},
    {addr: "0x88622DdBF7FBF8Ae522860aD28dA86dE0e85283B", tokens: 100},
    {addr: "0x247Fb55cab4841DC3D2191Fc1b3313946E2025Ca", tokens: 273},
    {addr: "0xB66b0F09cD400df7bD51367FE3E6cc458A5fBb35", tokens: 91},
    {addr: "0x93651185E335d422599DC28591d96993909295a5", tokens: 91},
    {addr: "0xC559620Ba78b18116A2aFb1070891d5D31359c9f", tokens: 91},
    {addr: "0xC86f8764FAa39CF5d61566Ebb7D8d6d12856EB6E", tokens: 100},
    {addr: "0x1e523F0f9E056edc93aB0F01747c3B2dAaCA8A53", tokens: 91},
    {addr: "0xc4463215a0CCd6fFED763b84a16800545c6CFf9C", tokens: 182},
    {addr: "0x84Cc817AeB12401cB64A2A370aAB5FA4AD353987", tokens: 91},
    {addr: "0x17f23b4181Eb28C23a3Bd55C971fcbc8cb7Cdb60", tokens: 182},
    {addr: "0x8731FCF99A2A34af8800A5acef4ad855De0fd0f3", tokens: 454},
    {addr: "0x6254e16EbcbB96b012d2e7C1B650710bD5ec75A4", tokens: 90},
    {addr: "0xFb774B4298C0d01ea378e2044381f536EE8e902B", tokens: 91},
    {addr: "0x65eDBEa90141Cc88B28ab60E162CCE5dB2852448", tokens: 181},
    {addr: "0xA9AB116cd38756defb3f0C5770155BC806Da72B3", tokens: 91},
    {addr: "0xC6D7F670925D50694Ab2daFCA40eb7dC27A636B6", tokens: 91},
    {addr: "0x76A74fa92D9B744228219F8F8F23f73555aa4683", tokens: 91},
    {addr: "0x33ebd836299B50021BD3805804cfB344bb724488", tokens: 91}]

let getMnemonic = () => {
    try{
        const mnemonic = JSON.parse(require('fs').readFileSync("./mnemonic.json", "utf8"));
        return mnemonic.mnemonic;
    } catch(err){
        return "";
    }
}

module.exports = (deployer, network, accounts) => {
    // deployer.then(async () => { //fake async await support: https://github.com/trufflesuite/truffle/issues/501

    //     if (accounts[1] === undefined || accounts[1] == null) {
    //         console.log("accounts[1]: " + accounts[1])
    //         throw new Error('HDWalletProvider needs to specify num_addresses (default is 1)')
    //     }

    //     // deploy libraries
    //     await deployer.deploy(AssetTokenL)

    //     //link libraries
    //     await deployer.link(AssetTokenL, BasicAssetToken)
    //     await deployer.link(AssetTokenL, DividendAssetToken)
    //     await deployer.link(AssetTokenL, CRWDAssetToken)
    //     await deployer.link(AssetTokenL, EquityAssetToken)
    //     await deployer.link(AssetTokenL, FeatureCapitalControl)
    //     await deployer.link(AssetTokenL, DividendEquityAssetToken)
    //     await deployer.link(AssetTokenL, FeatureCapitalControlWithForcedTransferFrom)

    //     //deploy contracts
    //     await deployer.deploy(MockCRWDClearing)

    //     const owner = accounts[0]
    //     const capitalControl = accounts[1]
    //     const pauseControl = accounts[2]
    //     const tokenRescueControl = accounts[3]

    //     console.log("OWNER:::::"+owner)
    //     console.log("CAPITALCONTROL:::::"+capitalControl)
    //     console.log("PAUSECONTROL:::::"+pauseControl)
    //     console.log("TOKENRESCUECONTROL:::::"+tokenRescueControl)

    //     await deployer.deploy(DividendEquityAssetToken, capitalControl, {from: owner})
        
    //     const token = await DividendEquityAssetToken.at(DividendEquityAssetToken.address)

    //     // DividendEquityAssetToken.web3.eth.defaultAccount=owner

    //     await token.setMetaData("CONDA AG Equity Token", "CONDA", ZERO_ADDRESS, {from: owner})

    //     await token.setClearingAddress(MockCRWDClearing.address, {from: owner})

    //     await token.setRoles(pauseControl, tokenRescueControl, {from: owner})

    //     await token.finishMinting({from: owner})

    //     await token.setTokenAlive({from: owner})

    //     for(let i=0; i < equity.length; i++) {
    //         // DividendEquityAssetToken.web3.eth.defaultAccount=owner
    //         await token.mint(equity[i].addr, equity[i].tokens, {from: capitalControl})
    //     }
    // })
}