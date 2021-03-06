var fs = require('fs'),
router = require("./router"),
http = require('http'),
socketio = require('socket.io'),
url = require('url'),
chalk = require('chalk'),
SerialObject = require('serialport');
try { var open = require('open'); } catch(e) { console.log(chalk.dim("NodeOpen not installed, browser will not auto-open.")); console.log(); }

//Vars & Constants:
var debug = false, socketServer,
serverSocket, serialPort, portName;

//Data Buffers:
var keyOn = []/*, btnOn = []*/;
var keyVal = {L:128, R:128};
var axisVal = {H:128, V:128};
var axisDist = {H:0, V:0};

//Config Options:
var webPort = 1337; //Port for internal web interface.
var endChar = '\r\n'; //If specified, program waits for this character before sending update strings.

//Run this to get everything going:
function begin() {
	router.debug(debug); selectPort(startServer);
}

//Asks you to select a serial port:
function selectPort(completionFunc) {
	//List available ports in command line:
	SerialObject.list(function(err, ports) {
		console.log(chalk.yellow("--------- Available Ports ---------"));
		for(var i=0; i < ports.length; i++) {
			var commString = "["+(i+1)+"] "+ports[i].comName;
			if(ports[i].manufacturer) commString += (", Brand = '"+ports[i].manufacturer+"'");
			console.log(commString);
		}
		console.log(chalk.yellow("-----------------------------------\n"));
		console.log(chalk.cyan("Please enter the port you want to use:"));
		//Wait for user input:
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
				portName = newPort; console.log(); completionFunc();
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

//Starts internal web server:
function startServer() {
	function onRequest(request, response) {
		var pathname = url.parse(request.url).pathname;
		if(debug) console.log("Request for "+pathname+" received");
		router.handleRequest("/pages", pathname, response, request);
	}
	var httpServer = http.createServer(onRequest).listen(webPort, function() {
		if(debug) console.log("Server is up\nListening at: http://localhost:"+webPort);
		console.log("Local Web Server Started!");
		console.log("To connect, open your browser and go to 'http://localhost:"+webPort+"'");
		if(typeof open != "undefined") {
			console.log(chalk.dim("NodeOpen is installed, atuo-opening new browser window..."));
			open("http://localhost:"+webPort);
		}
		console.log();
	});
	serialListener();
	initSocket(httpServer);
}

//Creates a socket connection to the server:
function initSocket(httpServer) {
	socketServer = socketio.listen(httpServer);
	socketServer.on('connection', function(socket) {
		if(debug) console.log("Client connected");
		socket.emit('onconnection', "");
		//Initial Setup:
		if(serverSocket) { serverSocket.removeAllListeners();
		if(debug) console.log("Removed previous listeners"); }
		serverSocket = socket;
		//Process Data and Send to Arduino:
		socket.on('mKeyDown', function(keyRaw) {
			var key = JSON.parse(keyRaw);
			if(key[4] == 38 && !keyOn['U']) { keyOn['U'] = 1; keyVal['L'] = 230; keyVal['R'] = 230; writeVals(); } //Up Arrow Key
			else if(key[4] == 40 && !keyOn['D']) { keyOn['D'] = 1; keyVal['L'] = 25; keyVal['R'] = 25; writeVals(); } //Down Arrow Key
			else if(key[4] == 37 && !keyOn['L']) { keyOn['L'] = 1; keyVal['L'] = 55; keyVal['R'] = 200; writeVals(); } //Left Arrow Key
			else if(key[4] == 39 && !keyOn['R']) { keyOn['R'] = 1; keyVal['L'] = 200; keyVal['R'] = 55; writeVals(); } //Right Arrow Key
		});
		socket.on('mKeyUp', function(keyRaw) {
			var key = JSON.parse(keyRaw);
			if(key[4] == 38 && keyOn['U']) { keyOn['U'] = 0; keyVal['L'] = 128; keyVal['R'] = 128; writeVals(); } //Up Arrow Key
			else if(key[4] == 40 && keyOn['D']) { keyOn['D'] = 0; keyVal['L'] = 128; keyVal['R'] = 128; writeVals(); } //Down Arrow Key
			else if(key[4] == 37 && keyOn['L']) { keyOn['L'] = 0; keyVal['L'] = 128; keyVal['R'] = 128; writeVals(); } //Left Arrow Key
			else if(key[4] == 39 && keyOn['R']) { keyOn['R'] = 0; keyVal['L'] = 128; keyVal['R'] = 128; writeVals(); } //Right Arrow Key
		});
		socket.on('gpadAxis', function(dataRaw) {
			//Parse Recieved Data & Translate Pressure Values:
			var data = JSON.parse(dataRaw);
			var axis = data[1]; var value = data[2];
			var mapVal = -Math.floor(value * 127) + 128;
			if(data[0]) { //Tank Drive
				//Determine Primary Axis:
				if(axis == "LEFT_STICK_HORIZONTAL" || axis == "RIGHT_STICK_HORIZONTAL") { axisDist['H'] = Math.abs(value); }
				else if(axis == "LEFT_STICK_VERTICAL" || axis == "RIGHT_STICK_VERTICAL") { axisDist['V'] = Math.abs(value); }
				//Send Serial Data to Arduino:
				if(axisDist['H'] > axisDist['V'] + 0.2) { //Turn
					if(Math.abs(value) < 0.03) { axisVal['H'] = 128; }
					else axisVal['H'] = mapVal;
					writeSerial(['K', axisVal['H'], -axisVal['H']+256]);
				} else { //Forward & Back
					if(Math.abs(value) < 0.03) { axisVal['V'] = 128; }
					else axisVal['V'] = mapVal;
					writeSerial(['K', axisVal['V'], axisVal['V']]);
				}
			} else { //Dual Stick Drive
				if(axis == "LEFT_STICK_VERTICAL" || axis == "RIGHT_STICK_VERTICAL") {
					axisVal[axis == "LEFT_STICK_VERTICAL" ? 'H' : 'V'] = (Math.abs(value) < 0.03) ? 128 : mapVal;
					writeSerial(['K', axisVal['H'], axisVal['V']]);
				}
			}
		});
	});
}

//Send motor data to Arduino:
function writeVals() { writeSerial(['K', keyVal['L'], keyVal['R']]); }

//Listen to serial port:
function serialListener() {
	var receivedData = "";
	serialPort = new SerialObject.SerialPort(portName, {
		//Defaults for Arduino serial port:
		baudrate: 9600,
		dataBits: 8,
		parity: 'none',
		stopBits: 1,
		flowControl: false
	});
	serialPort.on('open', function() {
		if(debug) console.log("Serial comm opened");
		//Listen to incoming data:
		serialPort.on('data', function(dataRaw) {
			var data = dataRaw.toString();
			//Itterate through data, 1 character at a time:
			for(var i=0; i<data.length; i++) {
				receivedData += data[i];
				//Check if string ends with endChar:
				if(!endChar || receivedData.substr(receivedData.length-endChar.length) == endChar) {
					if(endChar) receivedData = receivedData.slice(0, -endChar.length);
					if(debug) {
						var rd = receivedData.replace(/\n/g, chalk.bold("\\n"));
						rd = rd.replace(/\r/g, chalk.bold("\\r"));
						console.log("[MSG] "+chalk.dim(rd));
					}
					//Forward received data to browser socket:
					if(serverSocket) serverSocket.emit('serialMsg', receivedData);
					receivedData = '';
				}
			}
		});
	});
}

exports.begin = begin;
exports.debug = function(db) { debug = db; }