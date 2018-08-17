const CRWDAssetToken = artifacts.require("CRWDAssetToken.sol")
const BasicAssetToken = artifacts.require("BasicAssetToken.sol")
const DividendAssetToken = artifacts.require("DividendAssetToken.sol")

const AssetTokenPauseL = artifacts.require("AssetTokenPauseL.sol")

const AssetTokenGenerator = artifacts.require("AssetTokenGenerator.sol")

module.exports = (deployer, network, accounts) => {
    //deploy libraries
    deployer.deploy(AssetTokenPauseL)

    //link libraries
    deployer.link(AssetTokenPauseL, BasicAssetToken)
    deployer.link(AssetTokenPauseL, DividendAssetToken)
    deployer.link(AssetTokenPauseL, CRWDAssetToken)

    deployer.link(AssetTokenPauseL, AssetTokenGenerator)

    //deploy contracts
    deployer.deploy(AssetTokenGenerator) //knows all the others
}