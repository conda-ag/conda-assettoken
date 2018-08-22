const CRWDAssetToken = artifacts.require("CRWDAssetToken.sol")
const BasicAssetToken = artifacts.require("BasicAssetToken.sol")
const DividendAssetToken = artifacts.require("DividendAssetToken.sol")
const EquityAssetToken = artifacts.require("EquityAssetToken.sol")

const AssetTokenPauseL = artifacts.require("AssetTokenPauseL.sol")
const AssetTokenSupplyL = artifacts.require("AssetTokenSupplyL.sol")

const DividendAssetTokenGenerator = artifacts.require("DividendAssetTokenGenerator.sol")
const EquityAssetTokenGenerator = artifacts.require("EquityAssetTokenGenerator.sol")

module.exports = (deployer, network, accounts) => {
    //deploy libraries
    deployer.deploy(AssetTokenPauseL)
    deployer.deploy(AssetTokenSupplyL)

    //link libraries
    deployer.link(AssetTokenPauseL, [BasicAssetToken, DividendAssetToken, CRWDAssetToken, DividendAssetTokenGenerator, EquityAssetTokenGenerator, EquityAssetToken])
    deployer.link(AssetTokenSupplyL, [BasicAssetToken, DividendAssetToken, CRWDAssetToken, DividendAssetTokenGenerator, EquityAssetTokenGenerator, EquityAssetToken])

    //deploy contracts
    deployer.deploy(DividendAssetTokenGenerator) //knows all the others
    deployer.deploy(EquityAssetTokenGenerator) //knows all the others
}