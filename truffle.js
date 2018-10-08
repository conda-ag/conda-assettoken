
require('babel-register')({
  ignore: /node_modules\/(?!openzeppelin-solidity\/test\/helpers)/
});
require('babel-polyfill');

var HDWalletProvider = require("truffle-hdwallet-provider");

let getMnemonic = () => {
  try{
    const mnemonicJson = JSON.parse(require('fs').readFileSync("./mnemonic.json", "utf8"))
    return mnemonicJson.mnemonic
  } catch(err){
    return "";
  }
}

let getNode = () => {
  try{
    const mnemonicJson = JSON.parse(require('fs').readFileSync("./mnemonic.json", "utf8"))
    return mnemonicJson.node
  } catch(err){
    return "";
  }
}

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4700000 
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,         // <-- 8555 and not 8545! If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    },
    ropsten: {
      provider: () => new HDWalletProvider(getMnemonic(), getNode(), 0, 10),
      gas: 4700000,
      gasPrice: 100000000000,
      network_id: 3
    },
    kovan: {
      provider: () => new HDWalletProvider(getMnemonic(), getNode(), 0, 10),
      gas: 4700000,
      gasPrice: 100000000000,
      network_id: 42
    }
  }
};
