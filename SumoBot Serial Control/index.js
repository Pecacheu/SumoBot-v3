var os = require('os'),
fs = require('fs'),
exec = require('child_process').exec;

var debug = false; //<- Debug Mode Enable
var npmInstallNames = ["socket.io", "serialport", "chalk", "open"]; //<- Dependencies List

var systemOS = os.platform();
var OSReadable = "";
if(systemOS == "darwin") { OSReadable = "Macintosh OS, 64-bit" }
else if(systemOS == "win32") { OSReadable = "Windows, 32-bit" }
else if(systemOS == "win64") { OSReadable = "Windows, 64-bit" }
else if(systemOS == "linux") { OSReadable = "Linux" }

console.log();
console.log("Operating System: "+OSReadable);
if(debug) console.log("Warning, Debug Mode Enabled.");
console.log();

console.log("Checking for Dependencies...");
var pathsExist = true;
for(var n=0; n<npmInstallNames.length; n++) {
	if(!fs.existsSync(__dirname+"/node_modules/"+npmInstallNames[n])) { pathsExist = false; break; }
}

if(pathsExist) {
	console.log("All Dependencies Found!"); console.log();
	
	var server = require("./server");
	var router = require("./route");
	var requestHandlers = require("./requestHandlers");
	
	server.debug(debug); router.debug(debug); requestHandlers.debug(debug);
	
	var handle = {}
	handle["/"] = requestHandlers.sendInterface;
	handle["/interface"] = requestHandlers.sendInterface;
	
	server.begin(router.route, handle);
} else {
	console.log("Dependencies Missing!"); console.log(); runInstaller();
}

function runInstaller() {
	console.log("Emptying Install Directory...");
	deleteFolder(__dirname+"/node_modules/");
	console.log(); console.log("Starting Module Installer...");
	var i = 0; runinstinternal();
	function runinstinternal() {
		if(i >= npmInstallNames.length) { deleteFolder(__dirname+"/etc"); console.log("Installer Finished. Exiting..."); console.log(); process.exit(); }
		else {
			i++; var module = npmInstallNames[i-1];
			var command = "npm install "+module+" --prefix \""+__dirname+"\"";
			console.log("Installing NPM Module: "+module);
			try{ exec(command, function(error, stdout, stderr) {
				console.log("Module '"+module+"' Installed."); console.log();
				runinstinternal();
			}); } catch(e) { console.log("Error Installing!"); return; }
		}
	}
}

function deleteFolder(path) {
	if(fs.existsSync(path)) { //If path exists:
		var fileList = fs.readdirSync(path);
		for(var t=0; t<fileList.length; t++) { 
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
};