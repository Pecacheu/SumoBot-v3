var debug = false;

function route(handle, pathname, response, request) {
	if(debug) console.log("About to route a request for " + pathname);
	//typeof probes the data type of handle[pathname]. So if
	//handle[pathname] is a function (in both type and value)
	//,then run that function.
	if (typeof handle[pathname] == "function") {
		return handle[pathname](response, pathToFilename(pathname));
	} else if(typeof handle[parsePathname(pathname)] == "function") {
		return handle[parsePathname(pathname)](response, pathToFilename(pathname));
	} else {
		if(debug) console.log("No request handler found for " + pathname);
		response.writeHead(404, {"Content-Type": "text/plain"});
		response.write("404 Not found");
		response.end();
	}
}

function parsePathname(path) {
	if(typeof path == "string" && path.length > 0) {
		//Remove Trailing '/' Characters:
		while(path.charAt(path.length-1) == '/') path = path.substring(0, path.length-1);
		//Add an asterisk for wild-card operations:
		if(path.lastIndexOf('/') >= 0) { path = path.substring(0, path.lastIndexOf('/')+1); path += '*'; }
	}
	return path;
}

function pathToFilename(path) {
	//Remove Leading and Trailing '/' Characters:
	while(path.charAt(0) == '/') path = path.substring(1);
	while(path.charAt(path.length-1) == '/') path = path.substring(0, path.length-1);
	//Strip Away Rest of String:
	if(path.lastIndexOf('/') >= 0) { path = path.substring(path.lastIndexOf('/')+1); }
	return path;
}

exports.route = route;
exports.debug = function(db) { debug = db; };