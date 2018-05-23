
require('babel-register')({
  ignore: /node_modules\/(?!zeppelin-solidity\/test\/helpers)/
});
require('babel-polyfill');

var HDWalletProvider = require("truffle-hdwallet-provider");

function getMnemonic() {
  try{
    const mnemonic = JSON.parse(require('fs').readFileSync("./mnemonic.json", "utf8"));
    return mnemonic.mnemonic;
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
      gas: 6700000 
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,         // <-- 8555 and not 8545! If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(getMnemonic(), "https://ropsten.infura.io/YXH1Jwgfs2Gzfm3IJdmR")
      },
      gas: 4000000,
      network_id: 3
    }   
  }
};
