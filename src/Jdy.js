
var J = {
	version: '0.1-dev'
};

function expose() {
	var oldJ = window.J;

	J.noConflict = function () {
		window.J = oldJ;
		return this;
	};

	window.J = J;
}

// define Leaflet for Node module pattern loaders, including Browserify
if (typeof module === 'object' && typeof module.exports === 'object') {
	module.exports = J;

// define Leaflet as an AMD module
} else if (typeof define === 'function' && define.amd) {
	define(J);
}

// define Leaflet as a global L variable, saving the original L to restore later if needed
if (typeof window !== 'undefined') {
	expose();
}
