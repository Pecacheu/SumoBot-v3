var fs = require('fs'),
http = require('http'),
socketio = require('socket.io'),
url = require('url'),
chalk = require('chalk'),
SerialObject = require('serialport');
try { var open = require('open'); } catch(e) { console.log(chalk.dim("NodeOpen not installed, browser will not auto-open.")); console.log(); }

//Gamepad Control:
/*var XboxController = require('xbox-controller');
var xboxGamepad = new XboxController;
xboxGamepad.rumble(255, 255);*/

/*var NodeGamePad = require('node-gamepad');
var otherGamepad = new NodeGamePad("logitech/rumblepad2", {vendorID: 0x046D, productID: 0xC219}); //"logitech/rumblepad2", {vendorID: 0x046D, productID: 0xC219}
otherGamepad.connect();
otherGamepad.on('dpadUp:press', function() {
	console.log('up');
});
otherGamepad.on('dpadDown:press', function() {
	console.log('down');
});*/

/*var gamepad = require('gamepad');
gamepad.on("attach", function (data) {
  console.log("attach: " + data);
});
// Initialize the library 
gamepad.init()
// List the state of all currently attached devices 
for (var i = 0, l = gamepad.numDevices(); i < l; i++) {
  console.log(i, gamepad.deviceAtIndex());
}
// Create a game loop and poll for events 
setInterval(gamepad.processEvents, 16);
// Scan for new gamepads at a slower rate 
setInterval(gamepad.detectDevices, 500);
// Listen for move events on all gamepads 
gamepad.on("move", function (id, axis, value) {
  console.log("move", {
    id: id,
    axis: axis,
    value: value,
  });
});
// Listen for button up events on all gamepads 
gamepad.on("up", function (id, num) {
  console.log("up", {
    id: id,
    num: num,
  });
});
// Listen for button down events on all gamepads 
gamepad.on("down", function (id, num) {
  console.log("down", {
    id: id,
    num: num,
  });
});*/

var debug = false;
var socketServer;
var serverSocket;
var serialPort;
var portName;
//var btnOn = [];
var keyOn = [];
var keyVal = {L:128, R:128};
var axisVal = {H:128, V:128};
var axisDist = {H:0, V:0};

var endChar = '\r\n'; //If specified, program waits for this character before sending update strings.

function begin(route, handle) {
	selectPort(function() { startServer(route, handle); });
}

function selectPort(completionFunc) {
	// list available ports in command line:
	SerialObject.list(function(err, ports) {
		console.log(chalk.yellow("--------- Available Ports ---------"));
		for(var i=0; i < ports.length; i++) {
			var commString = "["+(i+1)+"] "+ports[i].comName;
			if(ports[i].manufacturer) commString += (", Brand = '"+ports[i].manufacturer+"'");
			console.log(commString);
		}
		console.log(chalk.yellow("-----------------------------------"));
		console.log();
		console.log(chalk.cyan("Please enter the port you want to use:"));
		// wait for user input:
		function onPortSelectInput(newPort) {
			newPort = newPort.replace(/\n/g, ""); newPort = newPort.replace(/\r/g, "");
			var portExists = false;
			for(var i=0; i < ports.length; i++) if(newPort == ports[i].comName) { portExists = true; break; }
			if(!portExists && Number(newPort) && ports[Number(newPort)-1]) {
				newPort = ports[Number(newPort)-1].comName; portExists = true;
			}
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

function writeSerial(data) {
	if(typeof data == "string") { serialPort.write(data + '\n'); }
	else if(typeof data == "object") {
		for(var i=0; i<data.length; i++) {
			if(typeof data[i] == "string" && data[i].search('\n') < 0) {
				serialPort.write(data[i]);
			} else if(typeof data[i] == "number") {
				if(data[i] != '\n'.charCodeAt()) serialPort.write(Buffer([data[i]]));
				else serialPort.write(Buffer(['\n'.charCodeAt()-1]));
			}
		}
		serialPort.write('\n');
	}
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
			if(key[4] == 38 && !keyOn['U']) { keyOn['U'] = 1; keyVal['L'] = 230; keyVal['R'] = 230; writeVals(); } //Up Arrow Key
			else if(key[4] == 40 && !keyOn['D']) { keyOn['D'] = 1; keyVal['L'] = 25; keyVal['R'] = 25; writeVals(); } //Down Arrow Key
			else if(key[4] == 37 && !keyOn['L']) { keyOn['L'] = 1; keyVal['L'] = 200; keyVal['R'] = 55; writeVals(); } //Left Arrow Key
			else if(key[4] == 39 && !keyOn['R']) { keyOn['R'] = 1; keyVal['L'] = 55; keyVal['R'] = 200; writeVals(); } //Right Arrow Key
		});
		socket.on('movementKeyUp', function(keyRaw) {
			var key = JSON.parse(keyRaw);
			if(key[4] == 38 && keyOn['U']) { keyOn['U'] = 0; keyVal['L'] = 128; keyVal['R'] = 128; writeVals(); } //Up Arrow Key
			else if(key[4] == 40 && keyOn['D']) { keyOn['D'] = 0; keyVal['L'] = 128; keyVal['R'] = 128; writeVals(); } //Down Arrow Key
			else if(key[4] == 37 && keyOn['L']) { keyOn['L'] = 0; keyVal['L'] = 128; keyVal['R'] = 128; writeVals(); } //Left Arrow Key
			else if(key[4] == 39 && keyOn['R']) { keyOn['R'] = 0; keyVal['L'] = 128; keyVal['R'] = 128; writeVals(); } //Right Arrow Key
		});
		socket.on('gamepadAxis', function(dataRaw) {
			//Parse Recieved Data & Translate Pressure Values:
			var data = JSON.parse(dataRaw);
			var axis = data[0]; var value = data[1];
			var mapVal = Math.floor(-value * 127) + 128;
			//Determine Primary Axis:
			if(axis == "LEFT_STICK_HORIZONTAL" || axis == "RIGHT_STICK_HORIZONTAL") { axisDist['H'] = Math.abs(value); }
			else if(axis == "LEFT_STICK_VERTICAL" || axis == "RIGHT_STICK_VERTICAL") { axisDist['V'] = Math.abs(value); }
			//Send Serial Data to Arduino:
			if(axisDist['H'] > axisDist['V'] + 0.2) {
				if(Math.abs(value) < 0.03) { axisVal['H'] = 128; }
				else axisVal['H'] = mapVal;
				writeSerial(['K', axisVal['H'], -axisVal['H']+256]);
			} else {
				if(Math.abs(value) < 0.03) { axisVal['V'] = 128; }
				else axisVal['V'] = mapVal;
				writeSerial(['K', axisVal['V'], axisVal['V']]);
			}
		});
	});
}

//Reverse axis value:
function writeVals() { writeSerial(['K', keyVal['L'], keyVal['R']]); }

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