
const AssetTokenGenerator = artifacts.require("./AssetTokenGenerator.sol")

module.exports = (deployer, network, accounts) => {
   deployer.deploy(AssetTokenGenerator)
}