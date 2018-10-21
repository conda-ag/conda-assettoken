const CRWDAssetToken = artifacts.require("CRWDAssetToken.sol")
const BasicAssetToken = artifacts.require("BasicAssetToken.sol")

const DividendAssetToken = artifacts.require("DividendAssetToken.sol")
const EquityAssetToken = artifacts.require("EquityAssetToken.sol")

const DividendEquityAssetToken = artifacts.require("DividendEquityAssetToken.sol")

const FeatureCapitalControl = artifacts.require("FeatureCapitalControl.sol")
const FeatureCapitalControlWithForcedTransferFrom = artifacts.require("FeatureCapitalControlWithForcedTransferFrom.sol")

const AssetTokenL = artifacts.require("AssetTokenL.sol")

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const fs = require("fs");
const configFilename = "../deployment_config.json";

const getDeploymentJsonConfig = () => {
    let jsonConfig = {}
    if(!fs.existsSync(configFilename)) {
        return jsonConfig; //needs to be manually created once
    }
    const fileContent = fs.readFileSync(configFilename)
    if(fileContent != "") {
        jsonConfig = JSON.parse(fileContent);
    }
    
    return jsonConfig
}

const updateDeploymentConfig = (selectiveUpdateObject) => {
    let jsonConfig = getDeploymentJsonConfig()

    // console.log("Output Content before : \n"+ JSON.stringify(jsonConfig)); 
    
    jsonConfig = Object.assign(jsonConfig, selectiveUpdateObject)
    // console.log("Output Content : \n"+ JSON.stringify(jsonConfig))
    
    fs.writeFileSync(configFilename, JSON.stringify(jsonConfig, null, 2), 'utf8')
}

module.exports = (deployer, network, accounts) => {
    deployer.then(async () => { //fake async await support: https://github.com/trufflesuite/truffle/issues/501

        if (accounts[1] === undefined || accounts[1] == null) {
            console.log("accounts[1]: " + accounts[1])
            throw new Error('HDWalletProvider needs to specify num_addresses (default is 1)')
        }

        // deploy libraries
        await deployer.deploy(AssetTokenL)

        //link libraries
        await deployer.link(AssetTokenL, BasicAssetToken)
        await deployer.link(AssetTokenL, DividendAssetToken)
        await deployer.link(AssetTokenL, CRWDAssetToken)
        await deployer.link(AssetTokenL, EquityAssetToken)
        await deployer.link(AssetTokenL, FeatureCapitalControl)
        await deployer.link(AssetTokenL, DividendEquityAssetToken)
        await deployer.link(AssetTokenL, FeatureCapitalControlWithForcedTransferFrom)

        //deploy contracts
        // deployer.deploy(MockCRWDClearing)

        const owner = accounts[0]
        const capitalControl = accounts[1]
        const pauseControl = accounts[2]
        const tokenRescueControl = accounts[3]

        console.log("OWNER:::::"+owner)
        console.log("CAPITALCONTROL:::::"+capitalControl)
        console.log("PAUSECONTROL:::::"+pauseControl)
        console.log("TOKENRESCUECONTROL:::::"+tokenRescueControl)

        await deployer.deploy(DividendEquityAssetToken, capitalControl, {from: owner})
        const token = await DividendEquityAssetToken.at(DividendEquityAssetToken.address)

        await token.setMetaData("AssetToken1", "AT1", ZERO_ADDRESS, (1000000 * 1e18), {from: owner})

        const deploymentConfig = getDeploymentJsonConfig()
        let clearingAddress = ZERO_ADDRESS
        if(deploymentConfig.hasOwnProperty('clearingAddress')) {
            clearingAddress = deploymentConfig.clearingAddress
        }

        console.log("=> Used clearing address: " + clearingAddress)

        await token.setClearingAddress(clearingAddress, {from: owner})

        await token.setRoles(pauseControl, tokenRescueControl, {from: owner})

        // await token.finishMinting({from: owner})
        // await token.setTokenAlive({from: owner})

        updateDeploymentConfig({ assetToken1: DividendEquityAssetToken.address })
    })
}