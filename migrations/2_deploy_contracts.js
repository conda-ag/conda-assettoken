const CRWDAssetToken = artifacts.require("CRWDAssetToken.sol")
const BasicAssetToken = artifacts.require("BasicAssetToken.sol")
const DividendAssetToken = artifacts.require("DividendAssetToken.sol")
const EquityAssetToken = artifacts.require("EquityAssetToken.sol")

const FeatureCapitalControl = artifacts.require("FeatureCapitalControl.sol")

const AssetTokenSupplyL = artifacts.require("AssetTokenSupplyL.sol")

module.exports = (deployer, network, accounts) => {
    //deploy libraries
    deployer.deploy(AssetTokenSupplyL)

    //link libraries
    deployer.link(AssetTokenSupplyL, [BasicAssetToken, DividendAssetToken, CRWDAssetToken, EquityAssetToken, FeatureCapitalControl])

    //deploy contracts
    // deployer.deploy(DividendAssetTokenGenerator) //knows all the others
    // deployer.deploy(EquityAssetTokenGenerator) //knows all the others

    capitalControl = accounts[0];
    deployer.deploy(EquityAssetToken, capitalControl, true)
    deployer.deploy(DividendAssetToken)
}