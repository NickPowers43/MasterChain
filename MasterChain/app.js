
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
app.use('/login', login);
app.use('/contracts', contract);
app.use('/examples', examples);

app.use('/css', express.static('css'));

ntpClient.getNetworkTime("pool.ntp.org", 123, function(err, date) {
    if(err) {
        console.error(err);
        return;
    }
 
    console.log("Current time : ");
    console.log(date);
});

app.post('/signupfinger/', function (req, res) {
	
	req.on('image', function(chunk) {
		fs.writeFile('a.bmp', chunk, function (err) { if(err) throw err; });
		console.log("writing image \'a\'");
    });
	
	//push new contract that initializes identity
	
	res.send("It Works!");
	
	res.status(200);
});

app.post('/signupselfie/', function (req, res) {
	
	req.on('image', function(chunk) {
		fs.writeFile('b.bmp', chunk, function (err) { if(err) throw err; });
		console.log("writing image \'b\'");
    });
	
	//push new contract that initializes identity
	
	res.send("It Works!");
	
	res.status(200);
});

app.get('/loginfinger/', function (req, res) {
	
	//req.on('image', function(chunk) {
	//	fs.writeFile('a.bmp', chunk, function (err) { if(err) throw err; });
	//	console.log("writing image \'a\'");
    //});
	
	var output = exec('br -algorithm FaceRecognition -compare a.jpg b.jpg', {silent:false}).output;
	var lines = output.split("\n");
	
	res.send(output);
	res.send("\n\n\n\n");
	res.send(lines[lines.length - 2]);
	res.send(lines[lines.length - 1]);
	res.send("EOF");
	
	if(false)
	{
		//res.status(200);
	}
	else
	{
		//res.status(500);
	}
});

app.get('/loginselfie/', function (req, res) {
	
	req.on('image', function(chunk) {
		fs.writeFile('b.bmp', chunk, function (err) { if(err) throw err; });
		console.log("writing image \'b\'");
    });
	
	if(false)
	{
		res.status(200);
	}
	else
	{
		res.status(500);
	}
});

app.put('/login/', function (req, res) {
	
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('bloc is listening on http://%s:%s', host, port);
  
  
});
