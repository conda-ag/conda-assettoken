const CRWDAssetToken = artifacts.require("CRWDAssetToken.sol")
const BasicAssetToken = artifacts.require("BasicAssetToken.sol")
const DividendAssetToken = artifacts.require("DividendAssetToken.sol")

const AssetTokenPauseL = artifacts.require("AssetTokenPauseL.sol")
const AssetTokenSupplyL = artifacts.require("AssetTokenSupplyL.sol")

const AssetTokenGenerator = artifacts.require("AssetTokenGenerator.sol")

module.exports = (deployer, network, accounts) => {
    //deploy libraries
    deployer.deploy(AssetTokenPauseL)
    deployer.deploy(AssetTokenSupplyL)

    //link libraries
    deployer.link(AssetTokenPauseL, [BasicAssetToken, DividendAssetToken, CRWDAssetToken, AssetTokenGenerator])
    deployer.link(AssetTokenSupplyL, [BasicAssetToken, DividendAssetToken, CRWDAssetToken, AssetTokenGenerator])

    //deploy contracts
    deployer.deploy(AssetTokenGenerator) //knows all the others
}