//Node.js Webserver Engine v2.6, created by Bryce Peterson (Nickname: Pecacheu, Email: Pecacheu@gmail.com). Copyright 2015, All rights reserved.

var path = require("path"),
chalk = require('chalk'),
fs = require("fs");

var debug = false;

var contentTypesByExtension = {
	'.html': "text/html",
	'.php':  "text/html",
	'.css':  "text/css",
	'.png':  "image/png",
	'.js':   "application/javascript",
	'.mp4':  "video/mp4",
	'.ogg':  "video/ogg",
	'.webm':  "video/webm"
};

var videoTypes = ['.mp4', '.ogg', '.webm'];

function handleRequest(dirPath, uri, response, request, virtualDir) {
	var filename = tryResolve(dirPath, uri, virtualDir);
	//Check for file:
	if(filename) {
		//Read the file:
		fs.readFile(filename, function(err, file) {
			if(err) {
				//Problem Reading File:
				response.writeHead(500, {"Content-Type": "text/plain"});
				response.write(err+"\n");
				response.end();
				if(debug) console.log(chalk.red("-- Read error: "+err));
			} else {
				//Send File Contents:
				var headers = {}, respType = 200;
				var contentType = contentTypesByExtension[path.extname(filename)];
				if(contentType) headers["Content-Type"] = contentType;
				//Video Files:
				if(videoTypes.indexOf(path.extname(filename)) != -1) {
					if(request.headers["range"]) {
						headers["Accept-Ranges"] = "bytes";
						var range = request.headers["range"].replace('=', ' ');
						var dataBytes = Buffer.byteLength(file.toString());
						//headers["Content-Range"] = range+(dataBytes-1)+"/"+dataBytes;
						headers["Content-Range"] = range+(dataBytes-1)+"/*";
						headers["Content-Length"] = dataBytes; respType = 206;
					}
				}
				response.writeHead(respType, headers);
				response.write(file);
				response.end();
				if(debug) logServedFile(filename.substring(__dirname.length), contentType);
			}
		});
	} else {
		//File not found:
		response.writeHead(404, {"Content-Type": "text/plain"});
		response.write("404 Not Found\n");
		response.end();
		if(debug) console.log(chalk.red("-- File not found"));
	}
}

function logServedFile(name, hasType) {
	var typeExtend = (hasType ? " with type '"+path.extname(name).substring(1)+"'" : "");
	console.log(chalk.dim("-- Served file \""+name+"\""+typeExtend));
}

function tryResolve(rootDir, file, vDir) {
	var filepath = path.join(__dirname, preprocessDir(rootDir, file, vDir));
	if(!fs.existsSync(filepath)) {
		if(fs.existsSync(filepath+".html")) return filepath+".html";
		else return false;
	} else if(fs.lstatSync(filepath).isDirectory()) {
		return path.join(filepath, "/index.html");
	}
	return filepath;
}

function preprocessDir(root, file, vDir) {
	if(typeof(vDir) == "object") {
		for(var i=0, l=vDir.length; i<l; i++) {
			var newfile = pDirInternal(vDir[i]);
			if(newfile) return newfile;
		}
		return path.join(root, file);
	} else if(typeof(vDir) == "string") {
		return pDirInternal(vDir) || path.join(root, file);
	} else {
		return path.join(root, file);
	}
	function pDirInternal(dir) {
		var name = dir.substr(dir.lastIndexOf("/"));
		if(file.indexOf(name) == 0) {
			var newFile = file.substr(file.indexOf("/", 1));
			return path.join(dir, newFile);
		} return false;
	}
}

exports.handleRequest = handleRequest;
exports.debug = function(db) { debug = db; }