
const AssetTokenGenerator = artifacts.require("./AssetTokenGenerator.sol")

module.exports = function(deployer, network, accounts) {
   deployer.deploy(AssetTokenGenerator)
}