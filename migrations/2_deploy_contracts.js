const CRWDAssetToken = artifacts.require("./token/CRWDAssetToken.sol")
const BasicAssetToken = artifacts.require("./token/BasicAssetToken.sol")
const DividendAssetToken = artifacts.require("./token/DividendAssetToken.sol")

const AssetTokenPauseL = artifacts.require("./token/library/AssetTokenPauseL.sol")

const AssetTokenGenerator = artifacts.require("./AssetTokenGenerator.sol")

module.exports = (deployer, network, accounts) => {
    //deploy libraries
    deployer.deploy(AssetTokenPauseL)

    //link libraries
    deployer.link(AssetTokenPauseL, BasicAssetToken)
    deployer.link(AssetTokenPauseL, DividendAssetToken)
    deployer.link(AssetTokenPauseL, CRWDAssetToken)

    deployer.link(AssetTokenPauseL, AssetTokenGenerator)

    //deploy contracts
    deployer.deploy(BasicAssetToken)    
    deployer.deploy(DividendAssetToken)
    deployer.deploy(CRWDAssetToken)
    
    deployer.deploy(AssetTokenGenerator)
}