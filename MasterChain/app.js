var crypto = require('crypto');

var DUO_PREFIX = "TX",
    APP_PREFIX = "APP",
    AUTH_PREFIX = "AUTH";

var DUO_EXPIRE = 300,
    APP_EXPIRE = 3600,
    IKEY_LEN = 20,
    SKEY_LEN = 40,
    AKEY_LEN = 40;

/* Exception Messages */
var ERR_USER = 'ERR|The username passed to sign_request() is invalid.',
    ERR_IKEY = 'ERR|The Duo integration key passed to sign_request() is invalid',
    ERR_SKEY = 'ERR|The Duo secret key passed to sign_request() is invalid',
    ERR_AKEY = 'ERR|The application secret key passed to sign_request() must be at least ' + String(AKEY_LEN) + ' characters.';

ERR_USER = ERR_USER;
ERR_IKEY = ERR_IKEY;
ERR_SKEY = ERR_SKEY;
ERR_AKEY = ERR_AKEY;

/**
 * @function sign a value
 * 
 * @param {String} key Integration's Secret Key
 * @param {String} vals Value(s) to sign
 * @param {String} prefix DUO/APP/AUTH Prefix
 * @param {Integer} expire time till expiry
 * 
 * @return {String} Containing the signed value in sha1-hmac with prefix 
 * 
 * @api private
 */
function _sign_vals(key, vals, prefix, expire) {
    var exp = Math.round((new Date()).getTime() / 1000) + expire;
    
    var val = vals + '|' + exp;
    var b64 = new Buffer(val).toString('base64');
    var cookie = prefix + '|' + b64;

    var sig = crypto.createHmac('sha1', key)
        .update(cookie)
        .digest('hex');
    
    return cookie + '|' + sig;
}

/**
 * @function parses a value
 * 
 * @param {String} key Integration's Secret Key
 * @param {String} val Value to unpack
 * @param {String} prefix DUO/APP/AUTH Prefix
 * @param {String} ikey Integration Key
 *
 * @return {String/Null} Returns a username on successful parse. Null if not
 * 
 * @api private
 */
function _parse_vals(key, val, prefix, ikey) {
    var ts = Math.round((new Date()).getTime() / 1000);
    var parts = val.split('|');
    if (parts.length != 3) {
        return null;
    }

    var u_prefix = parts[0];
    var u_b64 = parts[1];
    var u_sig = parts[2];

    var sig = crypto.createHmac('sha1', key)
        .update(u_prefix + '|' + u_b64)
        .digest('hex');
    
    if (crypto.createHmac('sha1', key).update(sig).digest('hex') != crypto.createHmac('sha1', key).update(u_sig).digest('hex')) {
        return null;   
    }
    
    if (u_prefix != prefix) {
        return null;
    }    

    var cookie_parts = new Buffer(u_b64, 'base64').toString('utf8').split('|');
    if (cookie_parts.length != 3) {
        return null;
    }

    var user = cookie_parts[0];
    var u_ikey = cookie_parts[1];
    var exp = cookie_parts[2];

    if (u_ikey != ikey) {
        return null;
    }

    if (ts >= parseInt(exp)) {
        return null;
    }

    return user;
}

/**
 * @function sign's a login request to be passed onto Duo Security
 * 
 * @param {String} ikey Integration Key
 * @param {String} skey Secret Key
 * @param {String} akey Application Security Key
 * @param {String} username Username 
 * 
 * @return {String} Duo Signature
 * 
 * @api public
 */
sign_request = function (ikey, skey, akey, username) {
    if (!username || username.length < 1) {
        return ERR_USER;
    }
    if (username.indexOf('|') !== -1) {
        return ERR_USER;
    }
    if (!ikey || ikey.length != IKEY_LEN) {
        return ERR_IKEY;
    }
    if (!skey || skey.length != SKEY_LEN) {
        return ERR_SKEY;
    }
    if (!akey || akey.length < AKEY_LEN) {
        return ERR_AKEY;
    }

    var vals = username + '|' + ikey;

    var duo_sig = _sign_vals(skey, vals, DUO_PREFIX, DUO_EXPIRE);
    var app_sig = _sign_vals(akey, vals, APP_PREFIX, APP_EXPIRE);

    var sig_request = duo_sig + ':' + app_sig;
    return sig_request;
}

/**
 * @function verifies a response from Duo Security
 * 
 * @param {String} ikey Integration Key
 * @param {String} skey Secret Key
 * @param {String} akey Application Security Key
 * @param {String} sig_response Signature Response from Duo
 * 
 * @param (String/Null} Returns a string containing the username if the response checks out. Returns null if it does not.
 * 
 * @api public
 */
verify_response = function (ikey, skey, akey, sig_response) {
    var parts = sig_response.split(':');
    if (parts.length != 2) {
        return null;
    }

    var auth_sig = parts[0];
    var app_sig = parts[1];
    var auth_user = _parse_vals(skey, auth_sig, AUTH_PREFIX, ikey);
    var app_user = _parse_vals(akey, app_sig, APP_PREFIX, ikey);

    if (auth_user != app_user) {
        return null;
    }

    return auth_user;
}

//our code

//var Duo = require('duo');
var Solidity = require('blockapps-js').Solidity
var shellJs = require('shelljs/global');
var duo = require('duo_web');
var ntpClient = require('ntp-client');
var express = require('express');
var exphbs = require('express-handlebars');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');

var yaml = require('js-yaml');
var path = require('path');
var fs = require('fs');

var home = require('./routes/home.js');
var login = require('./routes/login.js');
var contract = require('./routes/contract.js');
var examples = require('./routes/examples.js');

var blocRootDir = path.normalize(path.join(__dirname, '..'));
var configFile = yaml.safeLoad(fs.readFileSync('config.yaml'));

var app = express();

app.engine('.hbs', exphbs({defaultLayout: 'main', extname: '.hbs'}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({resave: true, 
                 saveUninitialized: true,
                 secret: 'session-to-track-global-wallet-pass-in-memory', 
                 cookie: { maxAge: 60000 }}));

app.use('/', home);
app.use('/css', express.static('css'));

ntpClient.getNetworkTime("pool.ntp.org", 123, function(err, date) {
    if(err) {
        console.error(err);
        return;
    }
 
    console.log("Current time : ");
    console.log(date);
});

var dl = 439218490398;

var pan = 432432;

var hashI = 0;
var hashes = [
	0x493e5ec1,
	0xc08c7ab6,
	0xf6278d61,
	0x8a28ca9a,
	0xf854486a,
	0x30f0cb6c,
	0x8a28ca9a
];

app.post('/signupfinger/', function (req, res) {
	
	var code = fs.open('contracts/Identity.sol', 'r', function (err) { if(err) throw err; });
	var privkey = "1dd885a423f4e212740f116afa66d40aafdbb3a381079150371801871d9ea281";
	Solidity(code).newContract(privkey, {"value": 100}).then(function(contract) {
		contract.state.Identity(pan++, [1, 3, 2, 1], 2, 2, [0, 1, 0, 0], 2, 2, dl, 1).callFrom(privkey);
	});
	
	sign_request('DIP1JBOY2KB9HVSLN400', 'iXEmBMj3szAACWWmYZtahKwT2ceGfOYkeiEC40wQ', "useacustomerprovidedapplicationsecretkey", "needham.patrick@gmail.com");
	
	console.log(req.body);
	console.log(req.params);
	console.log(req.query);
	
	req.on('image', function(chunk) {
		fs.writeFile('a.bmp', chunk, function (err) { if(err) throw err; });
		console.log("writing image \'a\'");
    });
	
	//push new contract that initializes identity
	
	res.send("" + {"hash":hashes[hashI], "PAN":pan});
	
	res.status(200);
	
	hashI++;
});

app.post('/signupselfie/', function (req, res) {
	
	var code = fs.open('contracts/Identity.sol', 'r', function (err) { if(err) throw err; });
	var privkey = "1dd885a423f4e212740f116afa66d40aafdbb3a381079150371801871d9ea281";
	Solidity(code).newContract(privkey, {"value": 100}).then(function(contract) {
		contract.state.Identity(pan++, [1, 3, 2, 1], 2, 2, [0, 1, 0, 0], 2, 2, dl, 1).callFrom(privkey);
	});
	
	//Duo.sign_request('DIP1JBOY2KB9HVSLN400', 'iXEmBMj3szAACWWmYZtahKwT2ceGfOYkeiEC40wQ', "useacustomerprovidedapplicationsecretkey", "needham.patrick@gmail.com");
	
	console.log(req.body);
	console.log(req.params);
	console.log(req.query);
	
	req.on('image', function(chunk) {
		fs.writeFile('a.bmp', chunk, function (err) { if(err) throw err; });
		console.log("writing image \'a\'");
    });
	
	//push new contract that initializes identity
	
	res.send("" + {"hash":hashes[hashI], "PAN":pan});
	
	res.status(200);
	
	hashI++;
});

app.get('/loginfinger/', function (req, res) {
	
	//ask user if they want to approve attempt
	
	req.on('image', function(chunk) {
		fs.writeFile('a.jpg', chunk, function (err) { if(err) throw err; });
    });
	
	var output = "" + exec('br -algorithm FaceRecognition -compare a.jpg b.jpg', {silent:false}).output;
	var lines = output.split("\n");
	
	var sendoutput = "";
	
	sendoutput += (lines[lines.length - 2]);
	
	res.send(sendoutput);
	
	if(sendoutput < 1.0 && sendoutput > -1.0)
	{
		//res.body("True");
		res.status(200);
	}
	else
	{
		//res.body("False");
		res.status(500);
	}
});

app.get('/loginselfie/', function (req, res) {
	
	req.on('image', function(chunk) {
		fs.writeFile('a.jpg', chunk, function (err) { if(err) throw err; });
    });
	
	var output = exec('br -algorithm FaceRecognition -compare a.jpg b.jpg', {silent:false}).output;
	var lines = output.split("\n");
	
	var sendoutput = "";
	
	sendoutput += (lines[lines.length - 2]);
	
	res.send(sendoutput);
	
	if(sendoutput < 1.0 && sendoutput > -1.0)
	{
		//res.body("True");
		res.status(200);
	}
	else
	{
		//res.body("False");
		res.status(500);
	}
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('bloc is listening on http://%s:%s', host, port);
  
  
});
