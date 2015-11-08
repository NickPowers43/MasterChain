var lw = require('ethlightjs');
var fs = require('fs');
var faucet = require("blockapps-js").routes.faucet;

module.exports = {
    generateKey : generateKey,
    readKeystore : readKeystore
}

function generateKey (password) {
    var seed = lw.keystore.generateRandomSeed();
    var store = new lw.keystore(seed, password);
    store.generateNewAddress(password);
    fs.writeFileSync('key.json', store.serialize());
    return faucet(store.addresses[0]);
}

function readKeystore() {
  return new lw.keystore.deserialize(fs.readFileSync('key.json'));
}
