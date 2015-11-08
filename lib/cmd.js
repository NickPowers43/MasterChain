

var argv = require('yargs')
               .usage('Usage: $0 <command> (options)')
               .demand(1)
               .command('init', 'start a new project')
               .command('compile', 'compile contracts in contract folder')
               .command('upload [contract]', 'upload contract to blockchain')
               .command('genkey', 'generate a new private key and fill it at the faucet')
               .command('register', 'register your app with BlockApps')
               .command('send', 'start prompt, transfer (amount*unit) to (address)')
               .alias('s','scaffold')
               .describe('s', 'scaffold html / js / css from your contracts when compiling or uploading')
               .argv;

module.exports.argv = argv;
