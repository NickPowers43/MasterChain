var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));                                                                     
var yaml = require('js-yaml');

var projectDir = path.normalize(path.join(__dirname, '..'));
var configFile = yaml.safeLoad(fs.readFileSync('config.yaml'));

function contractLookup(contractName) {
    var contractNameSol = contractName + '.sol';
    return fs.statAsync(path.join(projectDir, 'contracts/'+contractNameSol)).then(
         function (res) {
             console.log("contract found, checking if it has been compiled next");

             return { contractExists : true,
                      contractName : contractName,
                      contractNameSol : contractNameSol,
                      serverURI : configFile.apiURL };
         },
         function (err) {
             console.log("contract not found, err: " + err);
             throw Error(
                      JSON.stringify(
                        {  contractExists : false,
                           contractName : contractName,
                           contractNameSol : contractNameSol,
                           contractNotExistMessage : " doesn't exist yet. Maybe you should write it!",
                           serverURI : configFile.apiURL }
                      )
                   );
          }
     );
}

function contractJSONLookup(contractObj) {
    var contractName = contractObj.contractName;

    return fs.readFileAsync(path.join(projectDir, 'meta/'+contractName+'.json')).then(
        function(fileData) {
             console.log("contract has been compiled");
             contractObj.contractIsCompiled = true;
             contractObj.contractIsCompiledMessage = " has been compiled!";

             contractObj.contractData = JSON.parse(fileData);
             contractObj.contractDataString = fileData;

             var symtab = contractObj.contractData.symTab;

             var funcs = Object.keys(symtab).filter(function(name) {
                return symtab[name]["jsType"] === "Function";
             });

             contractObj.funcs = funcs.map(function(funcName) {
                 return {
                     name: funcName,
                     args: symtab[funcName].functionArgs.map(function(arg){
                           return {argName: arg};
                    })};
             });

             if (typeof contractObj.contractData.address !== 'undefined')
                 contractObj.contractDataMessage = "contract has been uploaded with address: " + contractObj.contractData.address;

             return contractObj;
        },
        function (err) {
             console.log("contract has not been compiled: " + err);
             contractObj.contractIsCompiled = false;
             contractObj.contractIsNotCompiledMessage = " has not yet been compiled! Compile it with bloc compile";
             throw Error(JSON.stringify(contractObj));
        }
    );
}

function keyJSONLookup(contractObj) {
    return fs.readFileAsync(path.join(projectDir, 'key.json')).then(
        function(fileData) {
            console.log("key present");
            contractObj.hasKey = true;
            contractObj.developerKeystore = JSON.parse(fileData);
            contractObj.globalKeystore = contractObj.developerKeystore;
            contractObj.walletAddress = contractObj.developerKeystore.addresses[0];

            contractObj.developerKeystoreString = fileData;
            contractObj.globalKeystoreString = fileData;
            contractObj.contractUploadMessage = " has not been uploaded yet. Upload it with bloc upload " + contractObj.contractNameSol;

            return contractObj;
        },
        function (err) {
             console.log("key missing: " + err);
             contractObj.hasKey = false;
             contractObj.generateKeyMessage = " You don't yet have a wallet. Use bloc genkey to create one. You need one to upload and run contracts!";

             throw Error(JSON.stringify(contractObj));
         }

    );
}

module.exports  = {
  contractLookup : contractLookup,
  contractJSONLookup : contractJSONLookup,
  keyJSONLookup : keyJSONLookup
};
