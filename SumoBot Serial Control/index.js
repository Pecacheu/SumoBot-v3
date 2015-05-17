var os = require("os");
var systemOS = os.platform();
var OSReadable = "";
if(systemOS == "darwin") { OSReadable = "Macintosh OS, 64-bit" }
else if(systemOS == "win32") { OSReadable = "Windows, 32-bit" }
else if(systemOS == "win64") { OSReadable = "Windows, 64-bit" }
else if(systemOS == "linux") { OSReadable = "Linux" }

console.log("Operating System: "+OSReadable); console.log("");

var server = require("./server");
var router = require("./route");
var requestHandlers = require("./requestHandlers");

var debug = false;

server.debug = debug; router.debug = debug; requestHandlers.debug = debug;

var handle = {}
handle["/"] = requestHandlers.sendInterface;
handle["/interface"] = requestHandlers.sendInterface;

server.begin(router.route, handle);