// functions that will be executed when
// typeof handle[pathname] === a function in requestHandlers.
// the handle and function are discribed in index.js

var fs = require('fs'),
server = require('./server');

var debug = false;

function sendInterface(response) {
	if(debug) console.log("Request handler 'interface' was called.");
	response.writeHead(200, {"Content-Type": "text/html"});
	var html = fs.readFileSync(__dirname + "/pages/interface.html");
	response.end(html);
}

exports.sendInterface = sendInterface;
exports.debug = function(db) { debug = db; };