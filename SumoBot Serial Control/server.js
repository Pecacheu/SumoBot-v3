var fs = require('fs'),
http = require('http'),
socketio = require('socket.io'),
url = require('url'),
chalk = require('chalk'),
SerialObject = require('serialport');
try { var open = require('open'); } catch(e) { console.log(chalk.dim("NodeOpen not installed, browser will not auto-open.")); console.log(); }

var debug = false;
var socketServer;
var serverSocket;
var serialPort;
var portName;
var keyOn = [];

var endChar = '\r\n'; //If specified, program waits for this character before sending update strings.

function begin(route, handle) {
	selectPort(function() { startServer(route, handle); });
}

function selectPort(completionFunc) {
	// list available ports in command line:
	SerialObject.list(function(err, ports) {
		console.log(chalk.yellow("--------- Available Ports ---------"));
		for(var i=0; i < ports.length; i++) {
			var commString = "-- "+ports[i].comName;
			if(ports[i].manufacturer) commString += (", Brand = '"+ports[i].manufacturer+"'");
			console.log(commString);
		}
		console.log(chalk.yellow("-----------------------------------"));
		console.log();
		console.log(chalk.cyan("Please enter the port you want to use:"));
		// wait for user input:
		function onPortSelectInput(newPort) {
			if(newPort.search('\n') != -1) newPort = newPort.substring(0, newPort.search('\n'));
			if(newPort.search('\r') != -1) newPort = newPort.substring(0, newPort.search('\r'));
			var portExists = false;
			for(var i=0; i < ports.length; i++) if(newPort == ports[i].comName) { portExists = true; break; }
			if(portExists) {
				console.log(chalk.bgGreen.black("Listening on port \""+newPort+"\""));
				process.stdin.removeListener('data', onPortSelectInput);
				portName = newPort; completionFunc();
			} else {
				console.log(chalk.bgRed.black("Port \""+newPort+"\" does not exist!"));
			}
		}
		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', function(text) {
			if(text.search('\n') != -1) text = text.substring(0, text.search('\n'));
			if(text.search('\r') != -1) text = text.substring(0, text.search('\r'));
			if(text == "exit" || text == "quit") {
				console.log(chalk.magenta("Exiting..."));
				process.exit();
			}
		});
		process.stdin.on('data', onPortSelectInput);
	});
}

// handle contains locations to browse to (vote and poll); pathnames.
function startServer(route, handle) {
	// on request event
	function onRequest(request, response) {
	  // parse the requested url into pathname. pathname will be compared
	  // in route.js to handle (var content), if it matches the a page will 
	  // come up. Otherwise a 404 will be given. 
	  var pathname = url.parse(request.url).pathname; 
	  if(debug) console.log("Request for " + pathname + " received");
	  var content = route(handle, pathname, response, request);
	}
	var httpServer = http.createServer(onRequest).listen(1337, function(){
		if(debug) { console.log("Server is up"); console.log("Listening at: http://localhost:1337"); }
		console.log("Local Web Server Started!");
		console.log("To connect, open your browser and go to 'http://localhost:1337'");
		if(typeof open != "undefined") {
			console.log(chalk.dim("NodeOpen is installed, atuo-opening new browser window..."));
			open("http://localhost:1337");
		}
		console.log();
	});
	serialListener();
	initSocketIO(httpServer);
}

function initSocketIO(httpServer) {
	socketServer = socketio.listen(httpServer);
	//if(debug == false) socketServer.set('log level', 1); // socket IO debug off
	socketServer.on('connection', function (socket) {
		// setup socket connection to web interface:
		if(debug) console.log("user connected");
		socket.emit('onconnection', "");
		serverSocket = socket;
		// send data to Arduino serial:
		socket.on('movementKeyDown', function(keyRaw) {
			var key = JSON.parse(keyRaw);
			if(key[4] == 38 && !keyOn[key[4]]) {
				serialPort.write('A' + 'U'); //Arrow Key On, Up
				keyOn[key[4]] = true; //Save Key State
			} else if(key[4] == 40 && !keyOn[key[4]]) {
				serialPort.write('A' + 'D'); //Arrow Key On, Down
				keyOn[key[4]] = true;
			} else if(key[4] == 37 && !keyOn[key[4]]) {
				serialPort.write('A' + 'L'); //Arrow Key On, Left
				keyOn[key[4]] = true;
			} else if(key[4] == 39 && !keyOn[key[4]]) {
				serialPort.write('A' + 'R'); //Arrow Key On, Right
				keyOn[key[4]] = true;
			}
		});
		socket.on('movementKeyUp', function(keyRaw) {
			var key = JSON.parse(keyRaw);
			if(key[4] == 38 && keyOn[key[4]]) {
				serialPort.write('a' + 'U'); //Arrow Key Off, Up
				keyOn[key[4]] = false; //Save Key State
			} else if(key[4] == 40 && keyOn[key[4]]) {
				serialPort.write('a' + 'D'); //Arrow Key Off, Down
				keyOn[key[4]] = false;
			} else if(key[4] == 37 && keyOn[key[4]]) {
				serialPort.write('a' + 'L'); //Arrow Key Off, Left
				keyOn[key[4]] = false;
			} else if(key[4] == 39 && keyOn[key[4]]) {
				serialPort.write('a' + 'R'); //Arrow Key Off, Right
				keyOn[key[4]] = false;
			}
		});
	});
}

// Listen to serial port
function serialListener() {
	var receivedData = "";
	serialPort = new SerialObject.SerialPort(portName, {
		baudrate: 9600,
		// defaults for Arduino serial communication
		dataBits: 8,
		parity: 'none',
		stopBits: 1,
		flowControl: false
	});
	serialPort.on('open', function() {
		if(debug) console.log("Serial comm opened");
		// Listens to incoming data
		serialPort.on('data', function(dataRaw) {
			var data = dataRaw.toString();
			//Itterate through data, 1 character at a time:
			for(var i=0; i<data.length; i++) {
				receivedData += data[i];
				//Check if string ends with endChar:
				if(!endChar || receivedData.substr(receivedData.length-endChar.length) == endChar) {
					if(endChar) receivedData = receivedData.slice(0, -endChar.length);
					// send the incoming data to browser with websockets.
					if(debug) {
						var rd = receivedData.replace(/\n/g, chalk.bold("\\n"));
						rd = rd.replace(/\r/g, chalk.bold("\\r"));
						console.log("send update: "+rd);
					}
					//Send received data to browser socket:
					if(serverSocket) serverSocket.emit('updateData', receivedData);
					receivedData = '';
				}
			}
		});
	});
}

exports.begin = begin;
exports.debug = function(db) { debug = db; };