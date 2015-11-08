#! /usr/bin/env node

var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var prompt = Promise.promisifyAll(require('prompt')); 

var cmd = require('../lib/cmd.js');
var key = require('../lib/keygen');
var scaffold = require('../lib/scaffold.js');
var yamlConfig = require('../lib/yaml-config.js');

var compile = require('../lib/compile.js');
var upload = require('../lib/upload.js');
var codegen = require('../lib/codegen.js');

var promptSchema = require('../lib/prompt-schema.js');
var requestPassword = require('../lib/prompt-schema.js').requestPassword;
var registerPassword = require('../lib/prompt-schema.js').registerPassword;
var createPassword = require('../lib/prompt-schema.js').createPassword;
var scaffoldApp = require('../lib/prompt-schema.js').scaffoldApp;
var transfer = require('../lib/prompt-schema.js').transfer;

var api = require("blockapps-js");
var Transaction = api.ethbase.Transaction;
var units = api.ethbase.Units;
var Int = api.ethbase.Int;

function main (){
    var cmdArr = cmd.argv._;
    if (cmdArr[0] == "init") {

        prompt.start();
        prompt.getAsync(scaffoldApp).then(function(result) {
            scaffold(result.appName, result.developer);
            yamlConfig.writeYaml(result.appName + "/config.yaml", result);
        });

        return;
    }

    try {
        var config = yamlConfig.readYaml('config.yaml');
    } catch (e){
        throw 'Cannot open config.yaml - are you in the project directory?';
    }
    
    api.query.serverURI = config.apiURL;

    var doScaffold = (cmd.argv.s !== undefined);

    switch(cmdArr[0]) {
    case 'compile':
        console.log("compiling sources");
        if (cmdArr[1] === undefined) {
            // compile all files
            var solSrcDir = path.normalize('./contracts');
            var config = yamlConfig.readYaml('config.yaml');
            var srcFiles = fs.readdirSync(solSrcDir).filter(function(filename) {
                return path.extname(filename) === '.sol';
            });
            var solSrc = srcFiles.map(function (filename) {
                console.log(path.join(solSrcDir, filename));
                return fs.readFileSync(path.join(solSrcDir, filename)).toString()
            });

            solObjs = compile(solSrc,config.appName);
        }
        else if (cmdArr[1] && path.parse(cmdArr[1]).ext === '.sol') {
            // compile < filename >
            console.log('compiling single file: ' + cmdArr[1]);
            var contents = fs.readFileSync(cmdArr[1]);
            solObjs = compile([contents], config.appName);
        }

        if (doScaffold) {
            Promise.each(solObjs,codegen.writeHTML.bind(null, config.appName));
        }
        break;

      case 'upload':
        var contractName = cmdArr[1];
        if (contractName === undefined) {
            console.log("contract name required");
            break;
        }
        
        var store = key.readKeystore();
        var address = store.addresses[0];

        prompt.start();
        prompt.getAsync(requestPassword).then(function(result) {
            var privkey = store.exportPrivateKey(address, result.password);
            return upload(contractName, privkey);
        }).then(function (solObjWAddr) {
            console.log("adding address to meta/" + contractName + ".json");
            if (doScaffold) {
                codegen.writeJS(contractName, solObjWAddr);
            }
        });

        break;

    case 'genkey':
        prompt.start();
        prompt.getAsync(createPassword).get("password").then(key.generateKey);
        break;

    case 'register':
        prompt.start();
        prompt.getAsync(registerPassword).get("password").then(function(password) {
            var loginObj = {
                "email": config.email,
                "app": config.appName,
                "loginpass": password
            };
            var appObj = {
                "developer": config.developer,
                "appurl": config.appURL,
                "repourl": config.repo
            };
            return api.routes.register(loginObj, appObj);
        }).tap(function() {
            console.log("registered, confirm via email")
        });
        break;

    case 'send':
        var config = yamlConfig.readYaml('config.yaml');
        var transferObj = transfer;

        transferObj.properties.gasLimit.default = config.transferGasLimit;
        transferObj.properties.gasPrice.default = config.gasPrice;

        prompt.start();
        prompt.get(transferObj, function(err,result) {
            prompt.get(promptSchema.confirmTransfer(result), function(err2, result2) {

              var store = key.readKeystore();
              var address = store.addresses[0];
      
              var privkeyFrom = store.exportPrivateKey(address, result.password);
              var valueTX = Transaction({"value" : Int((parseInt(result.value) * units.stringToEthUnit(result.unit))), 
                                         "gasLimit" : Int(result.gasLimit),
                                         "gasPrice" : Int(result.gasPrice)}); 

              var addressTo = result.to;

              valueTX(privkeyFrom, addressTo).then(function(txResult) {
                 console.log("transaction result: " + txResult.message);
              });                            
            });
        });
        break;

    case 'start':
        var server = spawn('gulp');
        server.stdout.on('data', function(data) {
           console.log(data.toString("utf-8"));
        });

        break;
    default:
        console.log("unrecognized command");
    }
}

if (require.main === module) {
    main();
}
