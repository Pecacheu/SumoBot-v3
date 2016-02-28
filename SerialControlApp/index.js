//Node.js Auto Loader v2.7, created by Bryce Peterson (Nickname: Pecacheu, Email: Pecacheu@gmail.com). Copyright 2015, All rights reserved.

var os = require('os'),
fs = require('fs'),
dns = require('dns'),
http = require('http'),
spawn = require('child_process').spawn,
exec = require('child_process').exec;

var sysOS = os.platform();

//------------------------------------ CONFIGURATION OPTIONS ------------------------------------

var debug = false; //<- Debug Mode Enable
var deleteDir = false; //<- Delete Entire Module Directory and Reinstall if Incomplete
var externalFiles = [
"http://cdnjs.cloudflare.com/ajax/libs/gsap/latest/TweenLite.min.js",
"http://cdnjs.cloudflare.com/ajax/libs/gsap/latest/TimelineLite.min.js",
"http://cdnjs.cloudflare.com/ajax/libs/gsap/latest/plugins/CSSPlugin.min.js",
];
var autoInstallOptionals = true; //<- Also Install Optional Packages During Required Package Installation
var npmInstallNames = ["socket.io", "serialport", "chalk", "node-hid"]; //<- Dependencies List
var optionalInstall = ["open"]; //<- Optional Dependencies (That's an oxymoron)

//------------------------------------ END OF CONFIG OPTIONS ------------------------------------

var OSReadable;
if(sysOS == "darwin") { OSReadable = "Macintosh OS" }
else if(sysOS == "win32") { OSReadable = "Windows" }
else if(sysOS == "win64") { OSReadable = "Windows, 64-bit" }
else if(sysOS == "linux") { OSReadable = "Linux" }
var userIP = getLocalIPList()[0];

console.log();
console.log("IP Address: "+userIP);
console.log("Operating System: "+OSReadable);
if(debug) console.log("Warning, Debug Mode Enabled.");
console.log();

console.log("Checking for Dependencies...");

var pathResolves = {
	'.woff': "/resources/type/",
	'.woff2': "/resources/type/",
	'.otf': "/resources/type/",
	'.ttf': "/resources/type/",
	'.png': "/resources/images/",
	'.jpg': "/resources/images/",
	'.jpeg': "/resources/images/"
};

if(verifyDepends()) {
	//------------------------------------------ MAIN CODE ------------------------------------------
	var chalk = require('chalk');
	if(!userIP) { console.log(chalk.red("Error: No network connections detected!\n")); process.exit(); }
	console.log(chalk.gray("All Dependencies Found!\n"));
	
	var server = require("./server");
	server.debug(debug); server.begin();
	//-------------------------------------- END OF MAIN CODE ---------------------------------------
} else {
	console.log("Dependencies Missing!\n");
	runJSLoader();
}

//Auto Installer Functions:

function verifyDepends() {
	var pathsExist = true;
	//Node.js Modules:
	for(var n=0, l=npmInstallNames.length; n<l; n++) {
		if(!fs.existsSync(__dirname+"/node_modules/"+npmInstallNames[n])) { pathsExist = false; break; }
	}
	//Internal HTML Client Files:
	for(var d=0, l=externalFiles.length; d<l; d++) {
		var fileName = externalFiles[d].substring(externalFiles[d].lastIndexOf('/')+1);
		if(!fs.existsSync(determinePath(fileName)+fileName)) { pathsExist = false; break; }
	}
	return pathsExist;
}

function runJSLoader() {
	console.log("Starting Installer..."); console.log();
	checkInternet(function(res) {
		if(res) {
			createNewFolder(__dirname+"/pages/resources/");
			console.log("Downloading JavaScript Libraries..."); var i = 0;
			var fileName = externalFiles[i].substring(externalFiles[i].lastIndexOf('/')+1);
			if(!folderExists(determinePath(fileName))) createNewFolder(determinePath(fileName));
			var file = fs.createWriteStream(determinePath(fileName)+fileName);
			function response(resp) {
				fileName = externalFiles[i].substring(externalFiles[i].lastIndexOf('/')+1);
				if(!folderExists(determinePath(fileName))) createNewFolder(determinePath(fileName));
				file = fs.createWriteStream(determinePath(fileName)+fileName);
				resp.pipe(file); file.on('finish', function() {
					console.log("Downloaded '"+fileName+"'");
					i++; if(i >= externalFiles.length) { console.log(); doInstall(); }
					else http.get(externalFiles[i], response);
				});
			}
			http.get(externalFiles[i], response);
		} else {
			console.log("Error: No Internet Connection Detected!");
			console.log(); process.exit();
		}
	});
}

function determinePath(filename) {
	var ext = filename.substring(filename.lastIndexOf('.')), pathRes;
	pathRes = "/pages"+(pathResolves[ext] || "/resources/");
	if(debug) console.log("ext '"+ext+"' resolves '"+pathRes+"'");
	return __dirname+pathRes;
}

function folderExists(folder) {
	return fs.existsSync(folder) && fs.lstatSync(folder).isDirectory();
}

function doInstall() {
	if(deleteDir) { console.log("Emptying Install Directory...\n"); deleteFolder(__dirname+"/node_modules/"); }
	console.log("Installing Node.js Modules...");
	if(autoInstallOptionals) npmInstallNames = npmInstallNames.concat(optionalInstall);
	var i = 0; runinternal();
	function runinternal() {
		if(i >= npmInstallNames.length) { deleteFolder(__dirname+"/etc"); console.log("Installer Finished. Exiting...\n"); process.exit(); }
		else if(deleteDir || !fs.existsSync(__dirname+"/node_modules/"+npmInstallNames[i])) {
			var module = npmInstallNames[i]; i++;
			console.log("Installing NPM Module: "+module+"\n");
			
			var cmd = spawn("npm", ["install", module, "--prefix", __dirname]);
			cmd.stdout.pipe(process.stdout); cmd.stderr.pipe(process.stdout);
			
			cmd.on('close', function(code) {
				console.log("Module '"+module+"' Installed.\n");
				runinternal();
			});
		} else {
			var module = npmInstallNames[i]; i++;
			console.log("Skipping '"+module+"' Module.\n");
			runinternal();
		}
	}
}

function createNewFolder(path) {
	if(fs.existsSync(path)) deleteFolder(path);
	fs.mkdirSync(path);
}

function deleteFolder(path) {
	if(fs.existsSync(path)) { //If path exists:
		var fileList = fs.readdirSync(path);
		for(var t=0, l=fileList.length; t<l; t++) { 
			var currPath = path+"/"+fileList[t];
			if(fs.lstatSync(currPath).isDirectory()) { //If directory, recurse:
				if(debug) console.log("-- open dir "+fileList[t]);
				deleteFolder(currPath);
			} else { //If file, delete it:
				if(debug) console.log("delete "+fileList[t]);
				fs.unlinkSync(currPath);
			}
		}
		if(debug) console.log("-- remove dir");
		fs.rmdirSync(path);
	}
}

function checkInternet(callback) {
	dns.resolve("www.google.com", function(err) { callback(!err); });
}

function getLocalIPList() {
	var networksList = [], ifaceList = os.networkInterfaces();
	if(ifaceList && typeof ifaceList == "object") {
		var ifaceListKeys = Object.keys(ifaceList);
		for(var i=0, l=ifaceListKeys.length; i<l; i++) {
			var iface = ifaceList[ifaceListKeys[i]];
			var ifaceKeys = Object.keys(iface);
			for(var j=0, l=ifaceKeys.length; j<l; j++) {
				var ifItm = iface[ifaceKeys[j]];
				if(ifItm.internal == false && ifItm.family == "IPv4" && ifItm.mac != "00:00:00:00:00:00") {
					networksList.push(ifItm.address);
				}
			}
		}
	}
	if(debug) console.log("\nIP Addr List:", networksList);
	return networksList || false;
}