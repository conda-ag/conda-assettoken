const CRWDAssetToken = artifacts.require("CRWDAssetToken.sol")
const BasicAssetToken = artifacts.require("BasicAssetToken.sol")
const DividendAssetToken = artifacts.require("DividendAssetToken.sol")
const EquityAssetToken = artifacts.require("EquityAssetToken.sol")

const FeatureCapitalControl = artifacts.require("FeatureCapitalControl.sol")

const AssetTokenPauseL = artifacts.require("AssetTokenPauseL.sol")
const AssetTokenSupplyL = artifacts.require("AssetTokenSupplyL.sol")
const AssetTokenDividendL = artifacts.require("AssetTokenDividendL.sol")

const DividendAssetTokenGenerator = artifacts.require("DividendAssetTokenGenerator.sol")
const EquityAssetTokenGenerator = artifacts.require("EquityAssetTokenGenerator.sol")

module.exports = (deployer, network, accounts) => {
    //deploy libraries
    deployer.deploy(AssetTokenPauseL)
    deployer.deploy(AssetTokenSupplyL)
    deployer.link(AssetTokenSupplyL, [AssetTokenDividendL]) //interlink AssetTokenSupplyL<-AssetTokenDividendL
    deployer.deploy(AssetTokenDividendL)

    //link libraries
    deployer.link(AssetTokenPauseL, [BasicAssetToken, DividendAssetToken, CRWDAssetToken, DividendAssetTokenGenerator, EquityAssetTokenGenerator, EquityAssetToken, FeatureCapitalControl])
    deployer.link(AssetTokenSupplyL, [BasicAssetToken, DividendAssetToken, CRWDAssetToken, DividendAssetTokenGenerator, EquityAssetTokenGenerator, EquityAssetToken, FeatureCapitalControl])
    deployer.link(AssetTokenDividendL, [DividendAssetToken, CRWDAssetToken, DividendAssetTokenGenerator])

    //deploy contracts
    deployer.deploy(DividendAssetTokenGenerator) //knows all the others
    deployer.deploy(EquityAssetTokenGenerator) //knows all the others
}