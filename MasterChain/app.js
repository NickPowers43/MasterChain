
var Solidity = require('blockapps-js').Solidity
var Duo = require('duo.js');
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
		contract.state.Identity(1, [1],1,1,[1],1,1,1,1).callFrom(privkey);
	});
	
	Duo.sign_request('DIP1JBOY2KB9HVSLN400', 'iXEmBMj3szAACWWmYZtahKwT2ceGfOYkeiEC40wQ', "1dd885a423f4e212740f116afa66d40aafdbb3a381079150371801871d9ea281", "needham.patrick@gmail.com");
	
	console.log(req.body);
	console.log(req.params);
	console.log(req.query);
	
	req.on('image', function(chunk) {
		fs.writeFile('a.bmp', chunk, function (err) { if(err) throw err; });
		console.log("writing image \'a\'");
    });
	
	//push new contract that initializes identity
	
	res.send("" + {"hash":hashes[hashI]});
	
	res.status(200);
	
	hashI++;
});

app.post('/signupselfie/', function (req, res) {
	
	req.on('image', function(chunk) {
		fs.writeFile('a.bmp', chunk, function (err) { if(err) throw err; });
		console.log("writing image \'b\'");
    });
	
	//push new contract that initializes identity
	
	res.send("It Works!");
	
	res.status(200);
});

app.get('/loginfinger/', function (req, res) {
	
	//ask user if they want to approve attempt
	
	req.on('image', function(chunk) {
		fs.writeFile('a.bmp', chunk, function (err) { if(err) throw err; });
    });
	
	var output = exec('br -algorithm FaceRecognition -compare a.jpg b.jpg', {silent:false}).output;
	var lines = output.split("\n");
	
	var sendoutput = "";
	
	sendoutput += (lines[lines.length - 2]);
	
	res.send(sendoutput);
	
	if(sendoutput < 1.0 && sendoutput > -1.0)
	{
		res.body("True");
		res.status(200);
	}
	else
	{
		res.body("False");
		res.status(500);
	}
});

app.get('/loginselfie/', function (req, res) {
	
	req.on('image', function(chunk) {
		fs.writeFile('a.bmp', chunk, function (err) { if(err) throw err; });
    });
	
	var output = exec('br -algorithm FaceRecognition -compare a.jpg b.jpg', {silent:false}).output;
	var lines = output.split("\n");
	
	var sendoutput = "";
	
	sendoutput += (lines[lines.length - 2]);
	
	res.send(sendoutput);
	
	if(sendoutput < 1.0 && sendoutput > -1.0)
	{
		res.body("True");
		res.status(200);
	}
	else
	{
		res.body("False");
		res.status(500);
	}
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('bloc is listening on http://%s:%s', host, port);
  
  
});
