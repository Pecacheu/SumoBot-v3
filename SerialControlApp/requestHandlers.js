// functions that will be executed when
// typeof handle[pathname] === a function in requestHandlers.
// the handle and function are discribed in index.js

var fs = require('fs'),
server = require('./server');

var debug = false;

function sendInterface(response, fileName) {
	if(debug) console.log("Serving file '"+fileName+"' using sendInterface handler.");
	response.writeHead(200, {"Content-Type": "text/html"});
	var html = fs.readFileSync(__dirname + "/pages/interface.html");
	response.end(html);
}

function sendResource(response, fileName) {
	if(debug) console.log("Serving file '"+fileName+"' using sendResource handler.");
	response.writeHead(200, {"Content-Type": "application/javascript"});
	//According to WikiPedia, the most accurate source for information
	//in the universe, "text/javascript" is deprecated.
	var html = fs.readFileSync(__dirname + "/pages/resources/"+fileName);
	response.end(html);
}

exports.sendInterface = sendInterface;
exports.sendResource = sendResource;
exports.debug = function(db) { debug = db; };