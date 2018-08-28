const CRWDAssetToken = artifacts.require("CRWDAssetToken.sol")
const BasicAssetToken = artifacts.require("BasicAssetToken.sol")

const DividendAssetToken = artifacts.require("DividendAssetToken.sol")
const EquityAssetToken = artifacts.require("EquityAssetToken.sol")

const DividendEquityAssetToken = artifacts.require("DividendEquityAssetToken.sol")

const FeatureCapitalControl = artifacts.require("FeatureCapitalControl.sol")
const FeatureCapitalControlWithForcedTransferFrom = artifacts.require("FeatureCapitalControlWithForcedTransferFrom.sol")
const FeaturePreventBurning = artifacts.require("FeaturePreventBurning.sol")

const AssetTokenSupplyL = artifacts.require("AssetTokenSupplyL.sol")

module.exports = (deployer, network, accounts) => {
    //deploy libraries
    deployer.deploy(AssetTokenSupplyL)

    //link libraries
    deployer.link(AssetTokenSupplyL, [BasicAssetToken, DividendAssetToken, CRWDAssetToken, EquityAssetToken, FeatureCapitalControl, DividendEquityAssetToken, FeatureCapitalControlWithForcedTransferFrom])

    //deploy contracts
    capitalControl = accounts[0];
    deployer.deploy(EquityAssetToken, capitalControl)
    deployer.deploy(DividendAssetToken)
    deployer.deploy(DividendEquityAssetToken, capitalControl)
}