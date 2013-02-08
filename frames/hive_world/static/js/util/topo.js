var require = function (file, cwd) {
	var resolved = require.resolve(file, cwd || '/');
	var mod = require.modules[resolved];
	if (!mod) throw new Error(
		'Failed to resolve module ' + file + ', tried ' + resolved
	);
	var cached = require.cache[resolved];
	var res = cached? cached.exports : mod();
	return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
	'assert': true,
	'events': true,
	'fs': true,
	'path': true,
	'vm': true
};

require.resolve = (function () {
	return function (x, cwd) {
		if (!cwd) cwd = '/';

		if (require._core[x]) return x;
		var path = require.modules.path();
		cwd = path.resolve('/', cwd);
		var y = cwd || '/';

		if (x.match(/^(?:\.\.?\/|\/)/)) {
			var m = loadAsFileSync(path.resolve(y, x))
				|| loadAsDirectorySync(path.resolve(y, x));
			if (m) return m;
		}

		var n = loadNodeModulesSync(x, y);
		if (n) return n;

		throw new Error("Cannot find module '" + x + "'");

		function loadAsFileSync (x) {
			x = path.normalize(x);
			if (require.modules[x]) {
				return x;
			}

			for (var i = 0; i < require.extensions.length; i++) {
				var ext = require.extensions[i];
				if (require.modules[x + ext]) return x + ext;
			}
		}

		function loadAsDirectorySync (x) {
			x = x.replace(/\/+$/, '');
			var pkgfile = path.normalize(x + '/package.json');
			if (require.modules[pkgfile]) {
				var pkg = require.modules[pkgfile]();
				var b = pkg.browserify;
				if (typeof b === 'object' && b.main) {
					var m = loadAsFileSync(path.resolve(x, b.main));
					if (m) return m;
				}
				else if (typeof b === 'string') {
					var m = loadAsFileSync(path.resolve(x, b));
					if (m) return m;
				}
				else if (pkg.main) {
					var m = loadAsFileSync(path.resolve(x, pkg.main));
					if (m) return m;
				}
			}

			return loadAsFileSync(x + '/index');
		}

		function loadNodeModulesSync (x, start) {
			var dirs = nodeModulesPathsSync(start);
			for (var i = 0; i < dirs.length; i++) {
				var dir = dirs[i];
				var m = loadAsFileSync(dir + '/' + x);
				if (m) return m;
				var n = loadAsDirectorySync(dir + '/' + x);
				if (n) return n;
			}

			var m = loadAsFileSync(x);
			if (m) return m;
		}

		function nodeModulesPathsSync (start) {
			var parts;
			if (start === '/') parts = [ '' ];
			else parts = path.normalize(start).split('/');

			var dirs = [];
			for (var i = parts.length - 1; i >= 0; i--) {
				if (parts[i] === 'node_modules') continue;
				var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
				dirs.push(dir);
			}

			return dirs;
		}
	};
})();

require.alias = function (from, to) {
	var path = require.modules.path();
	var res = null;
	try {
		res = require.resolve(from + '/package.json', '/');
	}
	catch (err) {
		res = require.resolve(from, '/');
	}
	var basedir = path.dirname(res);

	var keys = (Object.keys || function (obj) {
		var res = [];
		for (var key in obj) res.push(key);
		return res;
	})(require.modules);

	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		if (key.slice(0, basedir.length + 1) === basedir + '/') {
			var f = key.slice(basedir.length);
			require.modules[to + f] = require.modules[basedir + f];
		}
		else if (key === basedir) {
			require.modules[to] = require.modules[basedir];
		}
	}
};

(function () {
	var process = {};
	var global = typeof window !== 'undefined' ? window : {};
	var definedProcess = false;

	require.define = function (filename, fn) {
		if (!definedProcess && require.modules.__browserify_process) {
			process = require.modules.__browserify_process();
			definedProcess = true;
		}

		var dirname = require._core[filename]
				? ''
				: require.modules.path().dirname(filename)
			;

		var require_ = function (file) {
			var requiredModule = require(file, dirname);
			var cached = require.cache[require.resolve(file, dirname)];

			if (cached && cached.parent === null) {
				cached.parent = module_;
			}

			return requiredModule;
		};
		require_.resolve = function (name) {
			return require.resolve(name, dirname);
		};
		require_.modules = require.modules;
		require_.define = require.define;
		require_.cache = require.cache;
		var module_ = {
			id : filename,
			filename: filename,
			exports : {},
			loaded : false,
			parent: null
		};

		require.modules[filename] = function () {
			require.cache[filename] = module_;
			fn.call(
				module_.exports,
				require_,
				module_,
				module_.exports,
				dirname,
				filename,
				process,
				global
			);
			module_.loaded = true;
			return module_.exports;
		};
	};
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
	var res = [];
	for (var i = 0; i < xs.length; i++) {
		if (fn(xs[i], i, xs)) res.push(xs[i]);
	}
	return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
	function normalizeArray(parts, allowAboveRoot) {
		// if the path tries to go above the root, `up` ends up > 0
		var up = 0;
		for (var i = parts.length; i >= 0; i--) {
			var last = parts[i];
			if (last == '.') {
				parts.splice(i, 1);
			} else if (last === '..') {
				parts.splice(i, 1);
				up++;
			} else if (up) {
				parts.splice(i, 1);
				up--;
			}
		}

		// if the path is allowed to go above the root, restore leading ..s
		if (allowAboveRoot) {
			for (; up--; up) {
				parts.unshift('..');
			}
		}

		return parts;
	}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
	var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
	exports.resolve = function() {
		var resolvedPath = '',
			resolvedAbsolute = false;

		for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
			var path = (i >= 0)
				? arguments[i]
				: process.cwd();

			// Skip empty and invalid entries
			if (typeof path !== 'string' || !path) {
				continue;
			}

			resolvedPath = path + '/' + resolvedPath;
			resolvedAbsolute = path.charAt(0) === '/';
		}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
		resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
			return !!p;
		}), !resolvedAbsolute).join('/');

		return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
	};

// path.normalize(path)
// posix version
	exports.normalize = function(path) {
		var isAbsolute = path.charAt(0) === '/',
			trailingSlash = path.slice(-1) === '/';

// Normalize the path
		path = normalizeArray(filter(path.split('/'), function(p) {
			return !!p;
		}), !isAbsolute).join('/');

		if (!path && !isAbsolute) {
			path = '.';
		}
		if (path && trailingSlash) {
			path += '/';
		}

		return (isAbsolute ? '/' : '') + path;
	};


// posix version
	exports.join = function() {
		var paths = Array.prototype.slice.call(arguments, 0);
		return exports.normalize(filter(paths, function(p, index) {
			return p && typeof p === 'string';
		}).join('/'));
	};


	exports.dirname = function(path) {
		var dir = splitPathRe.exec(path)[1] || '';
		var isWindows = false;
		if (!dir) {
			// No dirname
			return '.';
		} else if (dir.length === 1 ||
			(isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
			// It is just a slash or a drive letter with a slash
			return dir;
		} else {
			// It is a full dirname, strip trailing slash
			return dir.substring(0, dir.length - 1);
		}
	};


	exports.basename = function(path, ext) {
		var f = splitPathRe.exec(path)[2] || '';
		// TODO: make this comparison case-insensitive on windows?
		if (ext && f.substr(-1 * ext.length) === ext) {
			f = f.substr(0, f.length - ext.length);
		}
		return f;
	};


	exports.extname = function(path) {
		return splitPathRe.exec(path)[3] || '';
	};

	exports.relative = function(from, to) {
		from = exports.resolve(from).substr(1);
		to = exports.resolve(to).substr(1);

		function trim(arr) {
			var start = 0;
			for (; start < arr.length; start++) {
				if (arr[start] !== '') break;
			}

			var end = arr.length - 1;
			for (; end >= 0; end--) {
				if (arr[end] !== '') break;
			}

			if (start > end) return [];
			return arr.slice(start, end - start + 1);
		}

		var fromParts = trim(from.split('/'));
		var toParts = trim(to.split('/'));

		var length = Math.min(fromParts.length, toParts.length);
		var samePartsLength = length;
		for (var i = 0; i < length; i++) {
			if (fromParts[i] !== toParts[i]) {
				samePartsLength = i;
				break;
			}
		}

		var outputParts = [];
		for (var i = samePartsLength; i < fromParts.length; i++) {
			outputParts.push('..');
		}

		outputParts = outputParts.concat(toParts.slice(samePartsLength));

		return outputParts.join('/');
	};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

	process.nextTick = (function () {
		var canSetImmediate = typeof window !== 'undefined'
			&& window.setImmediate;
		var canPost = typeof window !== 'undefined'
				&& window.postMessage && window.addEventListener
			;

		if (canSetImmediate) {
			return function (f) { return window.setImmediate(f) };
		}

		if (canPost) {
			var queue = [];
			window.addEventListener('message', function (ev) {
				if (ev.source === window && ev.data === 'browserify-tick') {
					ev.stopPropagation();
					if (queue.length > 0) {
						var fn = queue.shift();
						fn();
					}
				}
			}, true);

			return function nextTick(fn) {
				queue.push(fn);
				window.postMessage('browserify-tick', '*');
			};
		}

		return function nextTick(fn) {
			setTimeout(fn, 0);
		};
	})();

	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];

	process.binding = function (name) {
		if (name === 'evals') return (require)('vm')
		else throw new Error('No such module. (Possibly not yet loaded)')
	};

	(function () {
		var cwd = '/';
		var path;
		process.cwd = function () { return cwd };
		process.chdir = function (dir) {
			if (!path) path = require('path');
			cwd = path.resolve(dir, cwd);
		};
	})();

});

require.define("/node_modules/node-topography/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {}
});

require.define("node-topography",function(require,module,exports,__dirname,__filename,process,global){var Gate = require('gate');
	var _ = require('underscore');

	module.exports = {
		TopoGrid: require('./lib/TopoGrid'),
		filters:  {
			shadow:     require('./lib/filters/shadow'),
			ao:         require('./lib/filters/ambient_occlusion'),
			aoi:        require('./lib/filters/aoi'),
			normal_map: require('./lib/filters/normal_map')
		},

		util: {
			Vector3:      require('./lib/util/vector3'),
			cross_vector: require('./lib/util/cross_vector')
		}
	};
});

require.define("/node_modules/gate/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"./lib/gate.js"}
});

require.define("/node_modules/gate/lib/gate.js",function(require,module,exports,__dirname,__filename,process,global){'use strict';

	exports.create = create;

	var util = require('util');
	var assert = require('assert');
	var noop = function noop() {};

	function create(options) {
		return new Gate(options);
	}

	function Gate(options) {
		options = options || {};
		var count = typeof options.count === 'number' ? options.count : -1;
		var failFast = options.failFast !== false;
		this._async = new Async(count, failFast);
	}

	Object.defineProperty(Gate.prototype, "count", {
		get: function count() { return this._async.count; },
		enumerable: true
	});

	Gate.prototype.latch = function latch(name, mapping) {
		if (typeof name !== "string") {
			mapping = name;
			name = null;
		}
		return this._async.makeCallback(latch, name, mapping);
	};

	Gate.prototype.val = function val(value) {
		return new Val(value);
	};

	Gate.prototype.await = function await(callback) {
		this._async.await(callback);
		this._async.await = noop;
	};

	function Val(value) {
		this.value = value;
	}

	function Async(count, failFast) {
		this.count = count;
		this.failFast = failFast;
		this.index = 0;
		this.pending = 0;
		this.canceled = false;
		this.next = null;
		this.error = null;
		this.results = {};
	}

	Async.prototype.await = function await(callback) {
		if (this.error) {
			next(this.error, null);
		} else if (this.pending === 0 && this.count <= 0) {
			next(null, this.results);
		} else {
			this.next = next;
		}

		function next(error, results) {
			callback(error, results, new Gate());
		}
	};

	Async.prototype.makeCallback = function makeCallback(caller, name, mapping) {
		var type = typeof mapping;
		assert(type !== 'undefined' || type !== 'number' || type !== 'object',
			'An argument `mapping` must be a number or an object, if specified.');
		if (this.count === 0) return noop;
		if (this.count > 0) this.count--;
		this.pending++;
		var index = this.index++;
		var location = getLocation(caller);
		var self = this;

		return function callback(error) {
			var next = self.next;
			self.pending--;
			if (!self.canceled) {

				if (error instanceof Error) {
					if (!('gate_location' in error)) {
						// expand the error object
						error.gate_location = location;
					}
					if (self.failFast) {
						self.canceled = true;
						if (next) {
							self.next = noop;
							next(error, null);
						} else {
							self.error = error;
						}
						return;
					}
				}

				var result = mapArguments(mapping, arguments);
				if (name === null) {
					self.results[index] = result;
				} else {
					self.results[name] = result;
				}
				if (self.pending === 0 && self.count <= 0 && next) {
					self.next = noop;
					next(null, self.results);
				}
			}
		};

		function mapArguments(mapping, args) {
			if (typeof mapping === 'number') return args[mapping];
			if (!mapping) return Array.prototype.slice.call(args);
			return Object.keys(mapping).reduce(function (result, key) {
				var value = mapping[key];
				if (typeof value === 'number') {
					result[key] = args[value];
				} else if (value instanceof Val) {
					result[key] = value.value;
				} else {
					result[key] = value;
				}
				return result;
			}, {});
		}

		function getLocation(target) {
			var originalPrepareStackTrace = Error.prepareStackTrace;
			var originalStackTraceLimit = Error.stackTraceLimit;
			Error.prepareStackTrace = prepareStackTrace;
			Error.stackTraceLimit = 1;
			var err = {};
			Error.captureStackTrace(err, target);
			var stack = err.stack;
			Error.prepareStackTrace = originalPrepareStackTrace;
			Error.stackTraceLimit = originalStackTraceLimit;
			return util.format('%s:%d:%d', stack.getFileName(), stack.getLineNumber(), stack.getColumnNumber());
		}

		function prepareStackTrace() {
			return arguments[1][0];
		}
	};
});

require.define("util",function(require,module,exports,__dirname,__filename,process,global){var events = require('events');

	exports.isArray = isArray;
	exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
	exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


	exports.print = function () {};
	exports.puts = function () {};
	exports.debug = function() {};

	exports.inspect = function(obj, showHidden, depth, colors) {
		var seen = [];

		var stylize = function(str, styleType) {
			// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
			var styles =
			{ 'bold' : [1, 22],
				'italic' : [3, 23],
				'underline' : [4, 24],
				'inverse' : [7, 27],
				'white' : [37, 39],
				'grey' : [90, 39],
				'black' : [30, 39],
				'blue' : [34, 39],
				'cyan' : [36, 39],
				'green' : [32, 39],
				'magenta' : [35, 39],
				'red' : [31, 39],
				'yellow' : [33, 39] };

			var style =
				{ 'special': 'cyan',
					'number': 'blue',
					'boolean': 'yellow',
					'undefined': 'grey',
					'null': 'bold',
					'string': 'green',
					'date': 'magenta',
					// "name": intentionally not styling
					'regexp': 'red' }[styleType];

			if (style) {
				return '\033[' + styles[style][0] + 'm' + str +
					'\033[' + styles[style][1] + 'm';
			} else {
				return str;
			}
		};
		if (! colors) {
			stylize = function(str, styleType) { return str; };
		}

		function format(value, recurseTimes) {
			// Provide a hook for user-specified inspect functions.
			// Check that value is an object with an inspect function on it
			if (value && typeof value.inspect === 'function' &&
				// Filter out the util module, it's inspect function is special
				value !== exports &&
				// Also filter out any prototype objects using the circular check.
				!(value.constructor && value.constructor.prototype === value)) {
				return value.inspect(recurseTimes);
			}

			// Primitive types cannot have properties
			switch (typeof value) {
				case 'undefined':
					return stylize('undefined', 'undefined');

				case 'string':
					var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
						.replace(/'/g, "\\'")
						.replace(/\\"/g, '"') + '\'';
					return stylize(simple, 'string');

				case 'number':
					return stylize('' + value, 'number');

				case 'boolean':
					return stylize('' + value, 'boolean');
			}
			// For some reason typeof null is "object", so special case here.
			if (value === null) {
				return stylize('null', 'null');
			}

			// Look up the keys of the object.
			var visible_keys = Object_keys(value);
			var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

			// Functions without properties can be shortcutted.
			if (typeof value === 'function' && keys.length === 0) {
				if (isRegExp(value)) {
					return stylize('' + value, 'regexp');
				} else {
					var name = value.name ? ': ' + value.name : '';
					return stylize('[Function' + name + ']', 'special');
				}
			}

			// Dates without properties can be shortcutted
			if (isDate(value) && keys.length === 0) {
				return stylize(value.toUTCString(), 'date');
			}

			var base, type, braces;
			// Determine the object type
			if (isArray(value)) {
				type = 'Array';
				braces = ['[', ']'];
			} else {
				type = 'Object';
				braces = ['{', '}'];
			}

			// Make functions say that they are functions
			if (typeof value === 'function') {
				var n = value.name ? ': ' + value.name : '';
				base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
			} else {
				base = '';
			}

			// Make dates with properties first say the date
			if (isDate(value)) {
				base = ' ' + value.toUTCString();
			}

			if (keys.length === 0) {
				return braces[0] + base + braces[1];
			}

			if (recurseTimes < 0) {
				if (isRegExp(value)) {
					return stylize('' + value, 'regexp');
				} else {
					return stylize('[Object]', 'special');
				}
			}

			seen.push(value);

			var output = keys.map(function(key) {
				var name, str;
				if (value.__lookupGetter__) {
					if (value.__lookupGetter__(key)) {
						if (value.__lookupSetter__(key)) {
							str = stylize('[Getter/Setter]', 'special');
						} else {
							str = stylize('[Getter]', 'special');
						}
					} else {
						if (value.__lookupSetter__(key)) {
							str = stylize('[Setter]', 'special');
						}
					}
				}
				if (visible_keys.indexOf(key) < 0) {
					name = '[' + key + ']';
				}
				if (!str) {
					if (seen.indexOf(value[key]) < 0) {
						if (recurseTimes === null) {
							str = format(value[key]);
						} else {
							str = format(value[key], recurseTimes - 1);
						}
						if (str.indexOf('\n') > -1) {
							if (isArray(value)) {
								str = str.split('\n').map(function(line) {
									return '  ' + line;
								}).join('\n').substr(2);
							} else {
								str = '\n' + str.split('\n').map(function(line) {
									return '   ' + line;
								}).join('\n');
							}
						}
					} else {
						str = stylize('[Circular]', 'special');
					}
				}
				if (typeof name === 'undefined') {
					if (type === 'Array' && key.match(/^\d+$/)) {
						return str;
					}
					name = JSON.stringify('' + key);
					if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
						name = name.substr(1, name.length - 2);
						name = stylize(name, 'name');
					} else {
						name = name.replace(/'/g, "\\'")
							.replace(/\\"/g, '"')
							.replace(/(^"|"$)/g, "'");
						name = stylize(name, 'string');
					}
				}

				return name + ': ' + str;
			});

			seen.pop();

			var numLinesEst = 0;
			var length = output.reduce(function(prev, cur) {
				numLinesEst++;
				if (cur.indexOf('\n') >= 0) numLinesEst++;
				return prev + cur.length + 1;
			}, 0);

			if (length > 50) {
				output = braces[0] +
					(base === '' ? '' : base + '\n ') +
					' ' +
					output.join(',\n  ') +
					' ' +
					braces[1];

			} else {
				output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
			}

			return output;
		}
		return format(obj, (typeof depth === 'undefined' ? 2 : depth));
	};


	function isArray(ar) {
		return ar instanceof Array ||
			Array.isArray(ar) ||
			(ar && ar !== Object.prototype && isArray(ar.__proto__));
	}


	function isRegExp(re) {
		return re instanceof RegExp ||
			(typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
	}


	function isDate(d) {
		if (d instanceof Date) return true;
		if (typeof d !== 'object') return false;
		var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
		var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
		return JSON.stringify(proto) === JSON.stringify(properties);
	}

	function pad(n) {
		return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}

	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
		'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
	function timestamp() {
		var d = new Date();
		var time = [pad(d.getHours()),
			pad(d.getMinutes()),
			pad(d.getSeconds())].join(':');
		return [d.getDate(), months[d.getMonth()], time].join(' ');
	}

	exports.log = function (msg) {};

	exports.pump = null;

	var Object_keys = Object.keys || function (obj) {
		var res = [];
		for (var key in obj) res.push(key);
		return res;
	};

	var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
		var res = [];
		for (var key in obj) {
			if (Object.hasOwnProperty.call(obj, key)) res.push(key);
		}
		return res;
	};

	var Object_create = Object.create || function (prototype, properties) {
		// from es5-shim
		var object;
		if (prototype === null) {
			object = { '__proto__' : null };
		}
		else {
			if (typeof prototype !== 'object') {
				throw new TypeError(
					'typeof prototype[' + (typeof prototype) + '] != \'object\''
				);
			}
			var Type = function () {};
			Type.prototype = prototype;
			object = new Type();
			object.__proto__ = prototype;
		}
		if (typeof properties !== 'undefined' && Object.defineProperties) {
			Object.defineProperties(object, properties);
		}
		return object;
	};

	exports.inherits = function(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Object_create(superCtor.prototype, {
			constructor: {
				value: ctor,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
	};

	var formatRegExp = /%[sdj%]/g;
	exports.format = function(f) {
		if (typeof f !== 'string') {
			var objects = [];
			for (var i = 0; i < arguments.length; i++) {
				objects.push(exports.inspect(arguments[i]));
			}
			return objects.join(' ');
		}

		var i = 1;
		var args = arguments;
		var len = args.length;
		var str = String(f).replace(formatRegExp, function(x) {
			if (x === '%%') return '%';
			if (i >= len) return x;
			switch (x) {
				case '%s': return String(args[i++]);
				case '%d': return Number(args[i++]);
				case '%j': return JSON.stringify(args[i++]);
				default:
					return x;
			}
		});
		for(var x = args[i]; i < len; x = args[++i]){
			if (x === null || typeof x !== 'object') {
				str += ' ' + x;
			} else {
				str += ' ' + exports.inspect(x);
			}
		}
		return str;
	};

});

require.define("events",function(require,module,exports,__dirname,__filename,process,global){if (!process.EventEmitter) process.EventEmitter = function () {};

	var EventEmitter = exports.EventEmitter = process.EventEmitter;
	var isArray = typeof Array.isArray === 'function'
			? Array.isArray
			: function (xs) {
			return Object.prototype.toString.call(xs) === '[object Array]'
		}
		;
	function indexOf (xs, x) {
		if (xs.indexOf) return xs.indexOf(x);
		for (var i = 0; i < xs.length; i++) {
			if (x === xs[i]) return i;
		}
		return -1;
	}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
	var defaultMaxListeners = 10;
	EventEmitter.prototype.setMaxListeners = function(n) {
		if (!this._events) this._events = {};
		this._events.maxListeners = n;
	};


	EventEmitter.prototype.emit = function(type) {
		// If there is no 'error' event listener then throw.
		if (type === 'error') {
			if (!this._events || !this._events.error ||
				(isArray(this._events.error) && !this._events.error.length))
			{
				if (arguments[1] instanceof Error) {
					throw arguments[1]; // Unhandled 'error' event
				} else {
					throw new Error("Uncaught, unspecified 'error' event.");
				}
				return false;
			}
		}

		if (!this._events) return false;
		var handler = this._events[type];
		if (!handler) return false;

		if (typeof handler == 'function') {
			switch (arguments.length) {
				// fast cases
				case 1:
					handler.call(this);
					break;
				case 2:
					handler.call(this, arguments[1]);
					break;
				case 3:
					handler.call(this, arguments[1], arguments[2]);
					break;
				// slower
				default:
					var args = Array.prototype.slice.call(arguments, 1);
					handler.apply(this, args);
			}
			return true;

		} else if (isArray(handler)) {
			var args = Array.prototype.slice.call(arguments, 1);

			var listeners = handler.slice();
			for (var i = 0, l = listeners.length; i < l; i++) {
				listeners[i].apply(this, args);
			}
			return true;

		} else {
			return false;
		}
	};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
	EventEmitter.prototype.addListener = function(type, listener) {
		if ('function' !== typeof listener) {
			throw new Error('addListener only takes instances of Function');
		}

		if (!this._events) this._events = {};

		// To avoid recursion in the case that type == "newListeners"! Before
		// adding it to the listeners, first emit "newListeners".
		this.emit('newListener', type, listener);

		if (!this._events[type]) {
			// Optimize the case of one listener. Don't need the extra array object.
			this._events[type] = listener;
		} else if (isArray(this._events[type])) {

			// Check for listener leak
			if (!this._events[type].warned) {
				var m;
				if (this._events.maxListeners !== undefined) {
					m = this._events.maxListeners;
				} else {
					m = defaultMaxListeners;
				}

				if (m && m > 0 && this._events[type].length > m) {
					this._events[type].warned = true;
					console.error('(node) warning: possible EventEmitter memory ' +
						'leak detected. %d listeners added. ' +
						'Use emitter.setMaxListeners() to increase limit.',
						this._events[type].length);
					console.trace();
				}
			}

			// If we've already got an array, just append.
			this._events[type].push(listener);
		} else {
			// Adding the second element, need to change to array.
			this._events[type] = [this._events[type], listener];
		}

		return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
		var self = this;
		self.on(type, function g() {
			self.removeListener(type, g);
			listener.apply(this, arguments);
		});

		return this;
	};

	EventEmitter.prototype.removeListener = function(type, listener) {
		if ('function' !== typeof listener) {
			throw new Error('removeListener only takes instances of Function');
		}

		// does not use listeners(), so no side effect of creating _events[type]
		if (!this._events || !this._events[type]) return this;

		var list = this._events[type];

		if (isArray(list)) {
			var i = indexOf(list, listener);
			if (i < 0) return this;
			list.splice(i, 1);
			if (list.length == 0)
				delete this._events[type];
		} else if (this._events[type] === listener) {
			delete this._events[type];
		}

		return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
		// does not use listeners(), so no side effect of creating _events[type]
		if (type && this._events && this._events[type]) this._events[type] = null;
		return this;
	};

	EventEmitter.prototype.listeners = function(type) {
		if (!this._events) this._events = {};
		if (!this._events[type]) this._events[type] = [];
		if (!isArray(this._events[type])) {
			this._events[type] = [this._events[type]];
		}
		return this._events[type];
	};

});

require.define("assert",function(require,module,exports,__dirname,__filename,process,global){// UTILITY
	var util = require('util');
	var Buffer = require("buffer").Buffer;
	var pSlice = Array.prototype.slice;

	function objectKeys(object) {
		if (Object.keys) return Object.keys(object);
		var result = [];
		for (var name in object) {
			if (Object.prototype.hasOwnProperty.call(object, name)) {
				result.push(name);
			}
		}
		return result;
	}

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

	var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

	assert.AssertionError = function AssertionError(options) {
		this.name = 'AssertionError';
		this.message = options.message;
		this.actual = options.actual;
		this.expected = options.expected;
		this.operator = options.operator;
		var stackStartFunction = options.stackStartFunction || fail;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, stackStartFunction);
		}
	};
	util.inherits(assert.AssertionError, Error);

	function replacer(key, value) {
		if (value === undefined) {
			return '' + value;
		}
		if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
			return value.toString();
		}
		if (typeof value === 'function' || value instanceof RegExp) {
			return value.toString();
		}
		return value;
	}

	function truncate(s, n) {
		if (typeof s == 'string') {
			return s.length < n ? s : s.slice(0, n);
		} else {
			return s;
		}
	}

	assert.AssertionError.prototype.toString = function() {
		if (this.message) {
			return [this.name + ':', this.message].join(' ');
		} else {
			return [
				this.name + ':',
				truncate(JSON.stringify(this.actual, replacer), 128),
				this.operator,
				truncate(JSON.stringify(this.expected, replacer), 128)
			].join(' ');
		}
	};

// assert.AssertionError instanceof Error

	assert.AssertionError.__proto__ = Error.prototype;

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

	function fail(actual, expected, message, operator, stackStartFunction) {
		throw new assert.AssertionError({
			message: message,
			actual: actual,
			expected: expected,
			operator: operator,
			stackStartFunction: stackStartFunction
		});
	}

// EXTENSION! allows for well behaved errors defined elsewhere.
	assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

	function ok(value, message) {
		if (!!!value) fail(value, true, message, '==', assert.ok);
	}
	assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

	assert.equal = function equal(actual, expected, message) {
		if (actual != expected) fail(actual, expected, message, '==', assert.equal);
	};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

	assert.notEqual = function notEqual(actual, expected, message) {
		if (actual == expected) {
			fail(actual, expected, message, '!=', assert.notEqual);
		}
	};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

	assert.deepEqual = function deepEqual(actual, expected, message) {
		if (!_deepEqual(actual, expected)) {
			fail(actual, expected, message, 'deepEqual', assert.deepEqual);
		}
	};

	function _deepEqual(actual, expected) {
		// 7.1. All identical values are equivalent, as determined by ===.
		if (actual === expected) {
			return true;

		} else if (Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
			if (actual.length != expected.length) return false;

			for (var i = 0; i < actual.length; i++) {
				if (actual[i] !== expected[i]) return false;
			}

			return true;

			// 7.2. If the expected value is a Date object, the actual value is
			// equivalent if it is also a Date object that refers to the same time.
		} else if (actual instanceof Date && expected instanceof Date) {
			return actual.getTime() === expected.getTime();

			// 7.3. Other pairs that do not both pass typeof value == 'object',
			// equivalence is determined by ==.
		} else if (typeof actual != 'object' && typeof expected != 'object') {
			return actual == expected;

			// 7.4. For all other Object pairs, including Array objects, equivalence is
			// determined by having the same number of owned properties (as verified
			// with Object.prototype.hasOwnProperty.call), the same set of keys
			// (although not necessarily the same order), equivalent values for every
			// corresponding key, and an identical 'prototype' property. Note: this
			// accounts for both named and indexed properties on Arrays.
		} else {
			return objEquiv(actual, expected);
		}
	}

	function isUndefinedOrNull(value) {
		return value === null || value === undefined;
	}

	function isArguments(object) {
		return Object.prototype.toString.call(object) == '[object Arguments]';
	}

	function objEquiv(a, b) {
		if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
			return false;
		// an identical 'prototype' property.
		if (a.prototype !== b.prototype) return false;
		//~~~I've managed to break Object.keys through screwy arguments passing.
		//   Converting to array solves the problem.
		if (isArguments(a)) {
			if (!isArguments(b)) {
				return false;
			}
			a = pSlice.call(a);
			b = pSlice.call(b);
			return _deepEqual(a, b);
		}
		try {
			var ka = objectKeys(a),
				kb = objectKeys(b),
				key, i;
		} catch (e) {//happens when one is a string literal and the other isn't
			return false;
		}
		// having the same number of owned properties (keys incorporates
		// hasOwnProperty)
		if (ka.length != kb.length)
			return false;
		//the same set of keys (although not necessarily the same order),
		ka.sort();
		kb.sort();
		//~~~cheap key test
		for (i = ka.length - 1; i >= 0; i--) {
			if (ka[i] != kb[i])
				return false;
		}
		//equivalent values for every corresponding key, and
		//~~~possibly expensive deep test
		for (i = ka.length - 1; i >= 0; i--) {
			key = ka[i];
			if (!_deepEqual(a[key], b[key])) return false;
		}
		return true;
	}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

	assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
		if (_deepEqual(actual, expected)) {
			fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
		}
	};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

	assert.strictEqual = function strictEqual(actual, expected, message) {
		if (actual !== expected) {
			fail(actual, expected, message, '===', assert.strictEqual);
		}
	};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

	assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
		if (actual === expected) {
			fail(actual, expected, message, '!==', assert.notStrictEqual);
		}
	};

	function expectedException(actual, expected) {
		if (!actual || !expected) {
			return false;
		}

		if (expected instanceof RegExp) {
			return expected.test(actual);
		} else if (actual instanceof expected) {
			return true;
		} else if (expected.call({}, actual) === true) {
			return true;
		}

		return false;
	}

	function _throws(shouldThrow, block, expected, message) {
		var actual;

		if (typeof expected === 'string') {
			message = expected;
			expected = null;
		}

		try {
			block();
		} catch (e) {
			actual = e;
		}

		message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
			(message ? ' ' + message : '.');

		if (shouldThrow && !actual) {
			fail('Missing expected exception' + message);
		}

		if (!shouldThrow && expectedException(actual, expected)) {
			fail('Got unwanted exception' + message);
		}

		if ((shouldThrow && actual && expected &&
			!expectedException(actual, expected)) || (!shouldThrow && actual)) {
			throw actual;
		}
	}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

	assert.throws = function(block, /*optional*/error, /*optional*/message) {
		_throws.apply(this, [true].concat(pSlice.call(arguments)));
	};

// EXTENSION! This is annoying to write outside this module.
	assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
		_throws.apply(this, [false].concat(pSlice.call(arguments)));
	};

	assert.ifError = function(err) { if (err) {throw err;}};

});

require.define("buffer",function(require,module,exports,__dirname,__filename,process,global){module.exports = require("buffer-browserify")
});

require.define("/node_modules/buffer-browserify/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"index.js","browserify":"index.js"}
});

require.define("/node_modules/buffer-browserify/index.js",function(require,module,exports,__dirname,__filename,process,global){function SlowBuffer (size) {
	this.length = size;
};

	var assert = require('assert');

	exports.INSPECT_MAX_BYTES = 50;


	function toHex(n) {
		if (n < 16) return '0' + n.toString(16);
		return n.toString(16);
	}

	function utf8ToBytes(str) {
		var byteArray = [];
		for (var i = 0; i < str.length; i++)
			if (str.charCodeAt(i) <= 0x7F)
				byteArray.push(str.charCodeAt(i));
			else {
				var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
				for (var j = 0; j < h.length; j++)
					byteArray.push(parseInt(h[j], 16));
			}

		return byteArray;
	}

	function asciiToBytes(str) {
		var byteArray = []
		for (var i = 0; i < str.length; i++ )
			// Node's code seems to be doing this and not & 0x7F..
			byteArray.push( str.charCodeAt(i) & 0xFF );

		return byteArray;
	}

	function base64ToBytes(str) {
		return require("base64-js").toByteArray(str);
	}

	SlowBuffer.byteLength = function (str, encoding) {
		switch (encoding || "utf8") {
			case 'hex':
				return str.length / 2;

			case 'utf8':
			case 'utf-8':
				return utf8ToBytes(str).length;

			case 'ascii':
				return str.length;

			case 'base64':
				return base64ToBytes(str).length;

			default:
				throw new Error('Unknown encoding');
		}
	};

	function blitBuffer(src, dst, offset, length) {
		var pos, i = 0;
		while (i < length) {
			if ((i+offset >= dst.length) || (i >= src.length))
				break;

			dst[i + offset] = src[i];
			i++;
		}
		return i;
	}

	SlowBuffer.prototype.utf8Write = function (string, offset, length) {
		var bytes, pos;
		return SlowBuffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
	};

	SlowBuffer.prototype.asciiWrite = function (string, offset, length) {
		var bytes, pos;
		return SlowBuffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
	};

	SlowBuffer.prototype.base64Write = function (string, offset, length) {
		var bytes, pos;
		return SlowBuffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
	};

	SlowBuffer.prototype.base64Slice = function (start, end) {
		var bytes = Array.prototype.slice.apply(this, arguments)
		return require("base64-js").fromByteArray(bytes);
	}

	function decodeUtf8Char(str) {
		try {
			return decodeURIComponent(str);
		} catch (err) {
			return String.fromCharCode(0xFFFD); // UTF 8 invalid char
		}
	}

	SlowBuffer.prototype.utf8Slice = function () {
		var bytes = Array.prototype.slice.apply(this, arguments);
		var res = "";
		var tmp = "";
		var i = 0;
		while (i < bytes.length) {
			if (bytes[i] <= 0x7F) {
				res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
				tmp = "";
			} else
				tmp += "%" + bytes[i].toString(16);

			i++;
		}

		return res + decodeUtf8Char(tmp);
	}

	SlowBuffer.prototype.asciiSlice = function () {
		var bytes = Array.prototype.slice.apply(this, arguments);
		var ret = "";
		for (var i = 0; i < bytes.length; i++)
			ret += String.fromCharCode(bytes[i]);
		return ret;
	}

	SlowBuffer.prototype.inspect = function() {
		var out = [],
			len = this.length;
		for (var i = 0; i < len; i++) {
			out[i] = toHex(this[i]);
			if (i == exports.INSPECT_MAX_BYTES) {
				out[i + 1] = '...';
				break;
			}
		}
		return '<SlowBuffer ' + out.join(' ') + '>';
	};


	SlowBuffer.prototype.hexSlice = function(start, end) {
		var len = this.length;

		if (!start || start < 0) start = 0;
		if (!end || end < 0 || end > len) end = len;

		var out = '';
		for (var i = start; i < end; i++) {
			out += toHex(this[i]);
		}
		return out;
	};


	SlowBuffer.prototype.toString = function(encoding, start, end) {
		encoding = String(encoding || 'utf8').toLowerCase();
		start = +start || 0;
		if (typeof end == 'undefined') end = this.length;

		// Fastpath empty strings
		if (+end == start) {
			return '';
		}

		switch (encoding) {
			case 'hex':
				return this.hexSlice(start, end);

			case 'utf8':
			case 'utf-8':
				return this.utf8Slice(start, end);

			case 'ascii':
				return this.asciiSlice(start, end);

			case 'binary':
				return this.binarySlice(start, end);

			case 'base64':
				return this.base64Slice(start, end);

			case 'ucs2':
			case 'ucs-2':
				return this.ucs2Slice(start, end);

			default:
				throw new Error('Unknown encoding');
		}
	};


	SlowBuffer.prototype.hexWrite = function(string, offset, length) {
		offset = +offset || 0;
		var remaining = this.length - offset;
		if (!length) {
			length = remaining;
		} else {
			length = +length;
			if (length > remaining) {
				length = remaining;
			}
		}

		// must be an even number of digits
		var strLen = string.length;
		if (strLen % 2) {
			throw new Error('Invalid hex string');
		}
		if (length > strLen / 2) {
			length = strLen / 2;
		}
		for (var i = 0; i < length; i++) {
			var byte = parseInt(string.substr(i * 2, 2), 16);
			if (isNaN(byte)) throw new Error('Invalid hex string');
			this[offset + i] = byte;
		}
		SlowBuffer._charsWritten = i * 2;
		return i;
	};


	SlowBuffer.prototype.write = function(string, offset, length, encoding) {
		// Support both (string, offset, length, encoding)
		// and the legacy (string, encoding, offset, length)
		if (isFinite(offset)) {
			if (!isFinite(length)) {
				encoding = length;
				length = undefined;
			}
		} else {  // legacy
			var swap = encoding;
			encoding = offset;
			offset = length;
			length = swap;
		}

		offset = +offset || 0;
		var remaining = this.length - offset;
		if (!length) {
			length = remaining;
		} else {
			length = +length;
			if (length > remaining) {
				length = remaining;
			}
		}
		encoding = String(encoding || 'utf8').toLowerCase();

		switch (encoding) {
			case 'hex':
				return this.hexWrite(string, offset, length);

			case 'utf8':
			case 'utf-8':
				return this.utf8Write(string, offset, length);

			case 'ascii':
				return this.asciiWrite(string, offset, length);

			case 'binary':
				return this.binaryWrite(string, offset, length);

			case 'base64':
				return this.base64Write(string, offset, length);

			case 'ucs2':
			case 'ucs-2':
				return this.ucs2Write(string, offset, length);

			default:
				throw new Error('Unknown encoding');
		}
	};


// slice(start, end)
	SlowBuffer.prototype.slice = function(start, end) {
		if (end === undefined) end = this.length;

		if (end > this.length) {
			throw new Error('oob');
		}
		if (start > end) {
			throw new Error('oob');
		}

		return new Buffer(this, end - start, +start);
	};

	SlowBuffer.prototype.copy = function(target, targetstart, sourcestart, sourceend) {
		var temp = [];
		for (var i=sourcestart; i<sourceend; i++) {
			assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
			temp.push(this[i]);
		}

		for (var i=targetstart; i<targetstart+temp.length; i++) {
			target[i] = temp[i-targetstart];
		}
	};

	function coerce(length) {
		// Coerce length to a number (possibly NaN), round up
		// in case it's fractional (e.g. 123.456) then do a
		// double negate to coerce a NaN to 0. Easy, right?
		length = ~~Math.ceil(+length);
		return length < 0 ? 0 : length;
	}


// Buffer

	function Buffer(subject, encoding, offset) {
		if (!(this instanceof Buffer)) {
			return new Buffer(subject, encoding, offset);
		}

		var type;

		// Are we slicing?
		if (typeof offset === 'number') {
			this.length = coerce(encoding);
			this.parent = subject;
			this.offset = offset;
		} else {
			// Find the length
			switch (type = typeof subject) {
				case 'number':
					this.length = coerce(subject);
					break;

				case 'string':
					this.length = Buffer.byteLength(subject, encoding);
					break;

				case 'object': // Assume object is an array
					this.length = coerce(subject.length);
					break;

				default:
					throw new Error('First argument needs to be a number, ' +
						'array or string.');
			}

			if (this.length > Buffer.poolSize) {
				// Big buffer, just alloc one.
				this.parent = new SlowBuffer(this.length);
				this.offset = 0;

			} else {
				// Small buffer.
				if (!pool || pool.length - pool.used < this.length) allocPool();
				this.parent = pool;
				this.offset = pool.used;
				pool.used += this.length;
			}

			// Treat array-ish objects as a byte array.
			if (isArrayIsh(subject)) {
				for (var i = 0; i < this.length; i++) {
					this.parent[i + this.offset] = subject[i];
				}
			} else if (type == 'string') {
				// We are a string
				this.length = this.write(subject, 0, encoding);
			}
		}

	}

	function isArrayIsh(subject) {
		return Array.isArray(subject) || Buffer.isBuffer(subject) ||
			subject && typeof subject === 'object' &&
				typeof subject.length === 'number';
	}

	exports.SlowBuffer = SlowBuffer;
	exports.Buffer = Buffer;

	Buffer.poolSize = 8 * 1024;
	var pool;

	function allocPool() {
		pool = new SlowBuffer(Buffer.poolSize);
		pool.used = 0;
	}


// Static methods
	Buffer.isBuffer = function isBuffer(b) {
		return b instanceof Buffer || b instanceof SlowBuffer;
	};

	Buffer.concat = function (list, totalLength) {
		if (!Array.isArray(list)) {
			throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
		}

		if (list.length === 0) {
			return new Buffer(0);
		} else if (list.length === 1) {
			return list[0];
		}

		if (typeof totalLength !== 'number') {
			totalLength = 0;
			for (var i = 0; i < list.length; i++) {
				var buf = list[i];
				totalLength += buf.length;
			}
		}

		var buffer = new Buffer(totalLength);
		var pos = 0;
		for (var i = 0; i < list.length; i++) {
			var buf = list[i];
			buf.copy(buffer, pos);
			pos += buf.length;
		}
		return buffer;
	};

// Inspect
	Buffer.prototype.inspect = function inspect() {
		var out = [],
			len = this.length;

		for (var i = 0; i < len; i++) {
			out[i] = toHex(this.parent[i + this.offset]);
			if (i == exports.INSPECT_MAX_BYTES) {
				out[i + 1] = '...';
				break;
			}
		}

		return '<Buffer ' + out.join(' ') + '>';
	};


	Buffer.prototype.get = function get(i) {
		if (i < 0 || i >= this.length) throw new Error('oob');
		return this.parent[this.offset + i];
	};


	Buffer.prototype.set = function set(i, v) {
		if (i < 0 || i >= this.length) throw new Error('oob');
		return this.parent[this.offset + i] = v;
	};


// write(string, offset = 0, length = buffer.length-offset, encoding = 'utf8')
	Buffer.prototype.write = function(string, offset, length, encoding) {
		// Support both (string, offset, length, encoding)
		// and the legacy (string, encoding, offset, length)
		if (isFinite(offset)) {
			if (!isFinite(length)) {
				encoding = length;
				length = undefined;
			}
		} else {  // legacy
			var swap = encoding;
			encoding = offset;
			offset = length;
			length = swap;
		}

		offset = +offset || 0;
		var remaining = this.length - offset;
		if (!length) {
			length = remaining;
		} else {
			length = +length;
			if (length > remaining) {
				length = remaining;
			}
		}
		encoding = String(encoding || 'utf8').toLowerCase();

		var ret;
		switch (encoding) {
			case 'hex':
				ret = this.parent.hexWrite(string, this.offset + offset, length);
				break;

			case 'utf8':
			case 'utf-8':
				ret = this.parent.utf8Write(string, this.offset + offset, length);
				break;

			case 'ascii':
				ret = this.parent.asciiWrite(string, this.offset + offset, length);
				break;

			case 'binary':
				ret = this.parent.binaryWrite(string, this.offset + offset, length);
				break;

			case 'base64':
				// Warning: maxLength not taken into account in base64Write
				ret = this.parent.base64Write(string, this.offset + offset, length);
				break;

			case 'ucs2':
			case 'ucs-2':
				ret = this.parent.ucs2Write(string, this.offset + offset, length);
				break;

			default:
				throw new Error('Unknown encoding');
		}

		Buffer._charsWritten = SlowBuffer._charsWritten;

		return ret;
	};


// toString(encoding, start=0, end=buffer.length)
	Buffer.prototype.toString = function(encoding, start, end) {
		encoding = String(encoding || 'utf8').toLowerCase();

		if (typeof start == 'undefined' || start < 0) {
			start = 0;
		} else if (start > this.length) {
			start = this.length;
		}

		if (typeof end == 'undefined' || end > this.length) {
			end = this.length;
		} else if (end < 0) {
			end = 0;
		}

		start = start + this.offset;
		end = end + this.offset;

		switch (encoding) {
			case 'hex':
				return this.parent.hexSlice(start, end);

			case 'utf8':
			case 'utf-8':
				return this.parent.utf8Slice(start, end);

			case 'ascii':
				return this.parent.asciiSlice(start, end);

			case 'binary':
				return this.parent.binarySlice(start, end);

			case 'base64':
				return this.parent.base64Slice(start, end);

			case 'ucs2':
			case 'ucs-2':
				return this.parent.ucs2Slice(start, end);

			default:
				throw new Error('Unknown encoding');
		}
	};


// byteLength
	Buffer.byteLength = SlowBuffer.byteLength;


// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function fill(value, start, end) {
		value || (value = 0);
		start || (start = 0);
		end || (end = this.length);

		if (typeof value === 'string') {
			value = value.charCodeAt(0);
		}
		if (!(typeof value === 'number') || isNaN(value)) {
			throw new Error('value is not a number');
		}

		if (end < start) throw new Error('end < start');

		// Fill 0 bytes; we're done
		if (end === start) return 0;
		if (this.length == 0) return 0;

		if (start < 0 || start >= this.length) {
			throw new Error('start out of bounds');
		}

		if (end < 0 || end > this.length) {
			throw new Error('end out of bounds');
		}

		return this.parent.fill(value,
			start + this.offset,
			end + this.offset);
	};


// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function(target, target_start, start, end) {
		var source = this;
		start || (start = 0);
		end || (end = this.length);
		target_start || (target_start = 0);

		if (end < start) throw new Error('sourceEnd < sourceStart');

		// Copy 0 bytes; we're done
		if (end === start) return 0;
		if (target.length == 0 || source.length == 0) return 0;

		if (target_start < 0 || target_start >= target.length) {
			throw new Error('targetStart out of bounds');
		}

		if (start < 0 || start >= source.length) {
			throw new Error('sourceStart out of bounds');
		}

		if (end < 0 || end > source.length) {
			throw new Error('sourceEnd out of bounds');
		}

		// Are we oob?
		if (end > this.length) {
			end = this.length;
		}

		if (target.length - target_start < end - start) {
			end = target.length - target_start + start;
		}

		return this.parent.copy(target.parent,
			target_start + target.offset,
			start + this.offset,
			end + this.offset);
	};


// slice(start, end)
	Buffer.prototype.slice = function(start, end) {
		if (end === undefined) end = this.length;
		if (end > this.length) throw new Error('oob');
		if (start > end) throw new Error('oob');

		return new Buffer(this.parent, end - start, +start + this.offset);
	};


// Legacy methods for backwards compatibility.

	Buffer.prototype.utf8Slice = function(start, end) {
		return this.toString('utf8', start, end);
	};

	Buffer.prototype.binarySlice = function(start, end) {
		return this.toString('binary', start, end);
	};

	Buffer.prototype.asciiSlice = function(start, end) {
		return this.toString('ascii', start, end);
	};

	Buffer.prototype.utf8Write = function(string, offset) {
		return this.write(string, offset, 'utf8');
	};

	Buffer.prototype.binaryWrite = function(string, offset) {
		return this.write(string, offset, 'binary');
	};

	Buffer.prototype.asciiWrite = function(string, offset) {
		return this.write(string, offset, 'ascii');
	};

	Buffer.prototype.readUInt8 = function(offset, noAssert) {
		var buffer = this;

		if (!noAssert) {
			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset < buffer.length,
				'Trying to read beyond buffer length');
		}

		return buffer.parent[buffer.offset + offset];
	};

	function readUInt16(buffer, offset, isBigEndian, noAssert) {
		var val = 0;


		if (!noAssert) {
			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset + 1 < buffer.length,
				'Trying to read beyond buffer length');
		}

		if (isBigEndian) {
			val = buffer.parent[buffer.offset + offset] << 8;
			val |= buffer.parent[buffer.offset + offset + 1];
		} else {
			val = buffer.parent[buffer.offset + offset];
			val |= buffer.parent[buffer.offset + offset + 1] << 8;
		}

		return val;
	}

	Buffer.prototype.readUInt16LE = function(offset, noAssert) {
		return readUInt16(this, offset, false, noAssert);
	};

	Buffer.prototype.readUInt16BE = function(offset, noAssert) {
		return readUInt16(this, offset, true, noAssert);
	};

	function readUInt32(buffer, offset, isBigEndian, noAssert) {
		var val = 0;

		if (!noAssert) {
			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset + 3 < buffer.length,
				'Trying to read beyond buffer length');
		}

		if (isBigEndian) {
			val = buffer.parent[buffer.offset + offset + 1] << 16;
			val |= buffer.parent[buffer.offset + offset + 2] << 8;
			val |= buffer.parent[buffer.offset + offset + 3];
			val = val + (buffer.parent[buffer.offset + offset] << 24 >>> 0);
		} else {
			val = buffer.parent[buffer.offset + offset + 2] << 16;
			val |= buffer.parent[buffer.offset + offset + 1] << 8;
			val |= buffer.parent[buffer.offset + offset];
			val = val + (buffer.parent[buffer.offset + offset + 3] << 24 >>> 0);
		}

		return val;
	}

	Buffer.prototype.readUInt32LE = function(offset, noAssert) {
		return readUInt32(this, offset, false, noAssert);
	};

	Buffer.prototype.readUInt32BE = function(offset, noAssert) {
		return readUInt32(this, offset, true, noAssert);
	};


	/*
	 * Signed integer types, yay team! A reminder on how two's complement actually
	 * works. The first bit is the signed bit, i.e. tells us whether or not the
	 * number should be positive or negative. If the two's complement value is
	 * positive, then we're done, as it's equivalent to the unsigned representation.
	 *
	 * Now if the number is positive, you're pretty much done, you can just leverage
	 * the unsigned translations and return those. Unfortunately, negative numbers
	 * aren't quite that straightforward.
	 *
	 * At first glance, one might be inclined to use the traditional formula to
	 * translate binary numbers between the positive and negative values in two's
	 * complement. (Though it doesn't quite work for the most negative value)
	 * Mainly:
	 *  - invert all the bits
	 *  - add one to the result
	 *
	 * Of course, this doesn't quite work in Javascript. Take for example the value
	 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
	 * course, Javascript will do the following:
	 *
	 * > ~0xff80
	 * -65409
	 *
	 * Whoh there, Javascript, that's not quite right. But wait, according to
	 * Javascript that's perfectly correct. When Javascript ends up seeing the
	 * constant 0xff80, it has no notion that it is actually a signed number. It
	 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
	 * binary negation, it casts it into a signed value, (positive 0xff80). Then
	 * when you perform binary negation on that, it turns it into a negative number.
	 *
	 * Instead, we're going to have to use the following general formula, that works
	 * in a rather Javascript friendly way. I'm glad we don't support this kind of
	 * weird numbering scheme in the kernel.
	 *
	 * (BIT-MAX - (unsigned)val + 1) * -1
	 *
	 * The astute observer, may think that this doesn't make sense for 8-bit numbers
	 * (really it isn't necessary for them). However, when you get 16-bit numbers,
	 * you do. Let's go back to our prior example and see how this will look:
	 *
	 * (0xffff - 0xff80 + 1) * -1
	 * (0x007f + 1) * -1
	 * (0x0080) * -1
	 */
	Buffer.prototype.readInt8 = function(offset, noAssert) {
		var buffer = this;
		var neg;

		if (!noAssert) {
			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset < buffer.length,
				'Trying to read beyond buffer length');
		}

		neg = buffer.parent[buffer.offset + offset] & 0x80;
		if (!neg) {
			return (buffer.parent[buffer.offset + offset]);
		}

		return ((0xff - buffer.parent[buffer.offset + offset] + 1) * -1);
	};

	function readInt16(buffer, offset, isBigEndian, noAssert) {
		var neg, val;

		if (!noAssert) {
			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset + 1 < buffer.length,
				'Trying to read beyond buffer length');
		}

		val = readUInt16(buffer, offset, isBigEndian, noAssert);
		neg = val & 0x8000;
		if (!neg) {
			return val;
		}

		return (0xffff - val + 1) * -1;
	}

	Buffer.prototype.readInt16LE = function(offset, noAssert) {
		return readInt16(this, offset, false, noAssert);
	};

	Buffer.prototype.readInt16BE = function(offset, noAssert) {
		return readInt16(this, offset, true, noAssert);
	};

	function readInt32(buffer, offset, isBigEndian, noAssert) {
		var neg, val;

		if (!noAssert) {
			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset + 3 < buffer.length,
				'Trying to read beyond buffer length');
		}

		val = readUInt32(buffer, offset, isBigEndian, noAssert);
		neg = val & 0x80000000;
		if (!neg) {
			return (val);
		}

		return (0xffffffff - val + 1) * -1;
	}

	Buffer.prototype.readInt32LE = function(offset, noAssert) {
		return readInt32(this, offset, false, noAssert);
	};

	Buffer.prototype.readInt32BE = function(offset, noAssert) {
		return readInt32(this, offset, true, noAssert);
	};

	function readFloat(buffer, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset + 3 < buffer.length,
				'Trying to read beyond buffer length');
		}

		return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
			23, 4);
	}

	Buffer.prototype.readFloatLE = function(offset, noAssert) {
		return readFloat(this, offset, false, noAssert);
	};

	Buffer.prototype.readFloatBE = function(offset, noAssert) {
		return readFloat(this, offset, true, noAssert);
	};

	function readDouble(buffer, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset + 7 < buffer.length,
				'Trying to read beyond buffer length');
		}

		return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
			52, 8);
	}

	Buffer.prototype.readDoubleLE = function(offset, noAssert) {
		return readDouble(this, offset, false, noAssert);
	};

	Buffer.prototype.readDoubleBE = function(offset, noAssert) {
		return readDouble(this, offset, true, noAssert);
	};


	/*
	 * We have to make sure that the value is a valid integer. This means that it is
	 * non-negative. It has no fractional component and that it does not exceed the
	 * maximum allowed value.
	 *
	 *      value           The number to check for validity
	 *
	 *      max             The maximum value
	 */
	function verifuint(value, max) {
		assert.ok(typeof (value) == 'number',
			'cannot write a non-number as a number');

		assert.ok(value >= 0,
			'specified a negative value for writing an unsigned value');

		assert.ok(value <= max, 'value is larger than maximum value for type');

		assert.ok(Math.floor(value) === value, 'value has a fractional component');
	}

	Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
		var buffer = this;

		if (!noAssert) {
			assert.ok(value !== undefined && value !== null,
				'missing value');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset < buffer.length,
				'trying to write beyond buffer length');

			verifuint(value, 0xff);
		}

		buffer.parent[buffer.offset + offset] = value;
	};

	function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			assert.ok(value !== undefined && value !== null,
				'missing value');

			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset + 1 < buffer.length,
				'trying to write beyond buffer length');

			verifuint(value, 0xffff);
		}

		if (isBigEndian) {
			buffer.parent[buffer.offset + offset] = (value & 0xff00) >>> 8;
			buffer.parent[buffer.offset + offset + 1] = value & 0x00ff;
		} else {
			buffer.parent[buffer.offset + offset + 1] = (value & 0xff00) >>> 8;
			buffer.parent[buffer.offset + offset] = value & 0x00ff;
		}
	}

	Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
		writeUInt16(this, value, offset, false, noAssert);
	};

	Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
		writeUInt16(this, value, offset, true, noAssert);
	};

	function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			assert.ok(value !== undefined && value !== null,
				'missing value');

			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset + 3 < buffer.length,
				'trying to write beyond buffer length');

			verifuint(value, 0xffffffff);
		}

		if (isBigEndian) {
			buffer.parent[buffer.offset + offset] = (value >>> 24) & 0xff;
			buffer.parent[buffer.offset + offset + 1] = (value >>> 16) & 0xff;
			buffer.parent[buffer.offset + offset + 2] = (value >>> 8) & 0xff;
			buffer.parent[buffer.offset + offset + 3] = value & 0xff;
		} else {
			buffer.parent[buffer.offset + offset + 3] = (value >>> 24) & 0xff;
			buffer.parent[buffer.offset + offset + 2] = (value >>> 16) & 0xff;
			buffer.parent[buffer.offset + offset + 1] = (value >>> 8) & 0xff;
			buffer.parent[buffer.offset + offset] = value & 0xff;
		}
	}

	Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
		writeUInt32(this, value, offset, false, noAssert);
	};

	Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
		writeUInt32(this, value, offset, true, noAssert);
	};


	/*
	 * We now move onto our friends in the signed number category. Unlike unsigned
	 * numbers, we're going to have to worry a bit more about how we put values into
	 * arrays. Since we are only worrying about signed 32-bit values, we're in
	 * slightly better shape. Unfortunately, we really can't do our favorite binary
	 * & in this system. It really seems to do the wrong thing. For example:
	 *
	 * > -32 & 0xff
	 * 224
	 *
	 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
	 * this aren't treated as a signed number. Ultimately a bad thing.
	 *
	 * What we're going to want to do is basically create the unsigned equivalent of
	 * our representation and pass that off to the wuint* functions. To do that
	 * we're going to do the following:
	 *
	 *  - if the value is positive
	 *      we can pass it directly off to the equivalent wuint
	 *  - if the value is negative
	 *      we do the following computation:
	 *         mb + val + 1, where
	 *         mb   is the maximum unsigned value in that byte size
	 *         val  is the Javascript negative integer
	 *
	 *
	 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
	 * you do out the computations:
	 *
	 * 0xffff - 128 + 1
	 * 0xffff - 127
	 * 0xff80
	 *
	 * You can then encode this value as the signed version. This is really rather
	 * hacky, but it should work and get the job done which is our goal here.
	 */

	/*
	 * A series of checks to make sure we actually have a signed 32-bit number
	 */
	function verifsint(value, max, min) {
		assert.ok(typeof (value) == 'number',
			'cannot write a non-number as a number');

		assert.ok(value <= max, 'value larger than maximum allowed value');

		assert.ok(value >= min, 'value smaller than minimum allowed value');

		assert.ok(Math.floor(value) === value, 'value has a fractional component');
	}

	function verifIEEE754(value, max, min) {
		assert.ok(typeof (value) == 'number',
			'cannot write a non-number as a number');

		assert.ok(value <= max, 'value larger than maximum allowed value');

		assert.ok(value >= min, 'value smaller than minimum allowed value');
	}

	Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
		var buffer = this;

		if (!noAssert) {
			assert.ok(value !== undefined && value !== null,
				'missing value');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset < buffer.length,
				'Trying to write beyond buffer length');

			verifsint(value, 0x7f, -0x80);
		}

		if (value >= 0) {
			buffer.writeUInt8(value, offset, noAssert);
		} else {
			buffer.writeUInt8(0xff + value + 1, offset, noAssert);
		}
	};

	function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			assert.ok(value !== undefined && value !== null,
				'missing value');

			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset + 1 < buffer.length,
				'Trying to write beyond buffer length');

			verifsint(value, 0x7fff, -0x8000);
		}

		if (value >= 0) {
			writeUInt16(buffer, value, offset, isBigEndian, noAssert);
		} else {
			writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
		}
	}

	Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
		writeInt16(this, value, offset, false, noAssert);
	};

	Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
		writeInt16(this, value, offset, true, noAssert);
	};

	function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			assert.ok(value !== undefined && value !== null,
				'missing value');

			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset + 3 < buffer.length,
				'Trying to write beyond buffer length');

			verifsint(value, 0x7fffffff, -0x80000000);
		}

		if (value >= 0) {
			writeUInt32(buffer, value, offset, isBigEndian, noAssert);
		} else {
			writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
		}
	}

	Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
		writeInt32(this, value, offset, false, noAssert);
	};

	Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
		writeInt32(this, value, offset, true, noAssert);
	};

	function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			assert.ok(value !== undefined && value !== null,
				'missing value');

			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset + 3 < buffer.length,
				'Trying to write beyond buffer length');

			verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
		}

		require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
			23, 4);
	}

	Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
		writeFloat(this, value, offset, false, noAssert);
	};

	Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
		writeFloat(this, value, offset, true, noAssert);
	};

	function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			assert.ok(value !== undefined && value !== null,
				'missing value');

			assert.ok(typeof (isBigEndian) === 'boolean',
				'missing or invalid endian');

			assert.ok(offset !== undefined && offset !== null,
				'missing offset');

			assert.ok(offset + 7 < buffer.length,
				'Trying to write beyond buffer length');

			verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
		}

		require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
			52, 8);
	}

	Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
		writeDouble(this, value, offset, false, noAssert);
	};

	Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
		writeDouble(this, value, offset, true, noAssert);
	};

	SlowBuffer.prototype.readUInt8 = Buffer.prototype.readUInt8;
	SlowBuffer.prototype.readUInt16LE = Buffer.prototype.readUInt16LE;
	SlowBuffer.prototype.readUInt16BE = Buffer.prototype.readUInt16BE;
	SlowBuffer.prototype.readUInt32LE = Buffer.prototype.readUInt32LE;
	SlowBuffer.prototype.readUInt32BE = Buffer.prototype.readUInt32BE;
	SlowBuffer.prototype.readInt8 = Buffer.prototype.readInt8;
	SlowBuffer.prototype.readInt16LE = Buffer.prototype.readInt16LE;
	SlowBuffer.prototype.readInt16BE = Buffer.prototype.readInt16BE;
	SlowBuffer.prototype.readInt32LE = Buffer.prototype.readInt32LE;
	SlowBuffer.prototype.readInt32BE = Buffer.prototype.readInt32BE;
	SlowBuffer.prototype.readFloatLE = Buffer.prototype.readFloatLE;
	SlowBuffer.prototype.readFloatBE = Buffer.prototype.readFloatBE;
	SlowBuffer.prototype.readDoubleLE = Buffer.prototype.readDoubleLE;
	SlowBuffer.prototype.readDoubleBE = Buffer.prototype.readDoubleBE;
	SlowBuffer.prototype.writeUInt8 = Buffer.prototype.writeUInt8;
	SlowBuffer.prototype.writeUInt16LE = Buffer.prototype.writeUInt16LE;
	SlowBuffer.prototype.writeUInt16BE = Buffer.prototype.writeUInt16BE;
	SlowBuffer.prototype.writeUInt32LE = Buffer.prototype.writeUInt32LE;
	SlowBuffer.prototype.writeUInt32BE = Buffer.prototype.writeUInt32BE;
	SlowBuffer.prototype.writeInt8 = Buffer.prototype.writeInt8;
	SlowBuffer.prototype.writeInt16LE = Buffer.prototype.writeInt16LE;
	SlowBuffer.prototype.writeInt16BE = Buffer.prototype.writeInt16BE;
	SlowBuffer.prototype.writeInt32LE = Buffer.prototype.writeInt32LE;
	SlowBuffer.prototype.writeInt32BE = Buffer.prototype.writeInt32BE;
	SlowBuffer.prototype.writeFloatLE = Buffer.prototype.writeFloatLE;
	SlowBuffer.prototype.writeFloatBE = Buffer.prototype.writeFloatBE;
	SlowBuffer.prototype.writeDoubleLE = Buffer.prototype.writeDoubleLE;
	SlowBuffer.prototype.writeDoubleBE = Buffer.prototype.writeDoubleBE;

});

require.define("/node_modules/buffer-browserify/node_modules/base64-js/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"lib/b64.js"}
});

require.define("/node_modules/buffer-browserify/node_modules/base64-js/lib/b64.js",function(require,module,exports,__dirname,__filename,process,global){(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;

		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

});

require.define("/node_modules/buffer-browserify/buffer_ieee754.js",function(require,module,exports,__dirname,__filename,process,global){exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
	var e, m,
		eLen = nBytes * 8 - mLen - 1,
		eMax = (1 << eLen) - 1,
		eBias = eMax >> 1,
		nBits = -7,
		i = isBE ? 0 : (nBytes - 1),
		d = isBE ? 1 : -1,
		s = buffer[offset + i];

	i += d;

	e = s & ((1 << (-nBits)) - 1);
	s >>= (-nBits);
	nBits += eLen;
	for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

	m = e & ((1 << (-nBits)) - 1);
	e >>= (-nBits);
	nBits += mLen;
	for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

	if (e === 0) {
		e = 1 - eBias;
	} else if (e === eMax) {
		return m ? NaN : ((s ? -1 : 1) * Infinity);
	} else {
		m = m + Math.pow(2, mLen);
		e = e - eBias;
	}
	return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

	exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
		var e, m, c,
			eLen = nBytes * 8 - mLen - 1,
			eMax = (1 << eLen) - 1,
			eBias = eMax >> 1,
			rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
			i = isBE ? (nBytes - 1) : 0,
			d = isBE ? -1 : 1,
			s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

		value = Math.abs(value);

		if (isNaN(value) || value === Infinity) {
			m = isNaN(value) ? 1 : 0;
			e = eMax;
		} else {
			e = Math.floor(Math.log(value) / Math.LN2);
			if (value * (c = Math.pow(2, -e)) < 1) {
				e--;
				c *= 2;
			}
			if (e + eBias >= 1) {
				value += rt / c;
			} else {
				value += rt * Math.pow(2, 1 - eBias);
			}
			if (value * c >= 2) {
				e++;
				c /= 2;
			}

			if (e + eBias >= eMax) {
				m = 0;
				e = eMax;
			} else if (e + eBias >= 1) {
				m = (value * c - 1) * Math.pow(2, mLen);
				e = e + eBias;
			} else {
				m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
				e = 0;
			}
		}

		for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

		e = (e << mLen) | m;
		eLen += mLen;
		for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

		buffer[offset + i - d] |= s * 128;
	};

});

require.define("/node_modules/underscore/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"underscore.js"}
});

require.define("/node_modules/underscore/underscore.js",function(require,module,exports,__dirname,__filename,process,global){//     Underscore.js 1.4.3
//     http://underscorejs.org
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

	(function() {

		// Baseline setup
		// --------------

		// Establish the root object, `window` in the browser, or `global` on the server.
		var root = this;

		// Save the previous value of the `_` variable.
		var previousUnderscore = root._;

		// Establish the object that gets returned to break out of a loop iteration.
		var breaker = {};

		// Save bytes in the minified (but not gzipped) version:
		var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

		// Create quick reference variables for speed access to core prototypes.
		var push             = ArrayProto.push,
			slice            = ArrayProto.slice,
			concat           = ArrayProto.concat,
			toString         = ObjProto.toString,
			hasOwnProperty   = ObjProto.hasOwnProperty;

		// All **ECMAScript 5** native function implementations that we hope to use
		// are declared here.
		var
			nativeForEach      = ArrayProto.forEach,
			nativeMap          = ArrayProto.map,
			nativeReduce       = ArrayProto.reduce,
			nativeReduceRight  = ArrayProto.reduceRight,
			nativeFilter       = ArrayProto.filter,
			nativeEvery        = ArrayProto.every,
			nativeSome         = ArrayProto.some,
			nativeIndexOf      = ArrayProto.indexOf,
			nativeLastIndexOf  = ArrayProto.lastIndexOf,
			nativeIsArray      = Array.isArray,
			nativeKeys         = Object.keys,
			nativeBind         = FuncProto.bind;

		// Create a safe reference to the Underscore object for use below.
		var _ = function(obj) {
			if (obj instanceof _) return obj;
			if (!(this instanceof _)) return new _(obj);
			this._wrapped = obj;
		};

		// Export the Underscore object for **Node.js**, with
		// backwards-compatibility for the old `require()` API. If we're in
		// the browser, add `_` as a global object via a string identifier,
		// for Closure Compiler "advanced" mode.
		if (typeof exports !== 'undefined') {
			if (typeof module !== 'undefined' && module.exports) {
				exports = module.exports = _;
			}
			exports._ = _;
		} else {
			root._ = _;
		}

		// Current version.
		_.VERSION = '1.4.3';

		// Collection Functions
		// --------------------

		// The cornerstone, an `each` implementation, aka `forEach`.
		// Handles objects with the built-in `forEach`, arrays, and raw objects.
		// Delegates to **ECMAScript 5**'s native `forEach` if available.
		var each = _.each = _.forEach = function(obj, iterator, context) {
			if (obj == null) return;
			if (nativeForEach && obj.forEach === nativeForEach) {
				obj.forEach(iterator, context);
			} else if (obj.length === +obj.length) {
				for (var i = 0, l = obj.length; i < l; i++) {
					if (iterator.call(context, obj[i], i, obj) === breaker) return;
				}
			} else {
				for (var key in obj) {
					if (_.has(obj, key)) {
						if (iterator.call(context, obj[key], key, obj) === breaker) return;
					}
				}
			}
		};

		// Return the results of applying the iterator to each element.
		// Delegates to **ECMAScript 5**'s native `map` if available.
		_.map = _.collect = function(obj, iterator, context) {
			var results = [];
			if (obj == null) return results;
			if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
			each(obj, function(value, index, list) {
				results[results.length] = iterator.call(context, value, index, list);
			});
			return results;
		};

		var reduceError = 'Reduce of empty array with no initial value';

		// **Reduce** builds up a single result from a list of values, aka `inject`,
		// or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
		_.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
			var initial = arguments.length > 2;
			if (obj == null) obj = [];
			if (nativeReduce && obj.reduce === nativeReduce) {
				if (context) iterator = _.bind(iterator, context);
				return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
			}
			each(obj, function(value, index, list) {
				if (!initial) {
					memo = value;
					initial = true;
				} else {
					memo = iterator.call(context, memo, value, index, list);
				}
			});
			if (!initial) throw new TypeError(reduceError);
			return memo;
		};

		// The right-associative version of reduce, also known as `foldr`.
		// Delegates to **ECMAScript 5**'s native `reduceRight` if available.
		_.reduceRight = _.foldr = function(obj, iterator, memo, context) {
			var initial = arguments.length > 2;
			if (obj == null) obj = [];
			if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
				if (context) iterator = _.bind(iterator, context);
				return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
			}
			var length = obj.length;
			if (length !== +length) {
				var keys = _.keys(obj);
				length = keys.length;
			}
			each(obj, function(value, index, list) {
				index = keys ? keys[--length] : --length;
				if (!initial) {
					memo = obj[index];
					initial = true;
				} else {
					memo = iterator.call(context, memo, obj[index], index, list);
				}
			});
			if (!initial) throw new TypeError(reduceError);
			return memo;
		};

		// Return the first value which passes a truth test. Aliased as `detect`.
		_.find = _.detect = function(obj, iterator, context) {
			var result;
			any(obj, function(value, index, list) {
				if (iterator.call(context, value, index, list)) {
					result = value;
					return true;
				}
			});
			return result;
		};

		// Return all the elements that pass a truth test.
		// Delegates to **ECMAScript 5**'s native `filter` if available.
		// Aliased as `select`.
		_.filter = _.select = function(obj, iterator, context) {
			var results = [];
			if (obj == null) return results;
			if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
			each(obj, function(value, index, list) {
				if (iterator.call(context, value, index, list)) results[results.length] = value;
			});
			return results;
		};

		// Return all the elements for which a truth test fails.
		_.reject = function(obj, iterator, context) {
			return _.filter(obj, function(value, index, list) {
				return !iterator.call(context, value, index, list);
			}, context);
		};

		// Determine whether all of the elements match a truth test.
		// Delegates to **ECMAScript 5**'s native `every` if available.
		// Aliased as `all`.
		_.every = _.all = function(obj, iterator, context) {
			iterator || (iterator = _.identity);
			var result = true;
			if (obj == null) return result;
			if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
			each(obj, function(value, index, list) {
				if (!(result = result && iterator.call(context, value, index, list))) return breaker;
			});
			return !!result;
		};

		// Determine if at least one element in the object matches a truth test.
		// Delegates to **ECMAScript 5**'s native `some` if available.
		// Aliased as `any`.
		var any = _.some = _.any = function(obj, iterator, context) {
			iterator || (iterator = _.identity);
			var result = false;
			if (obj == null) return result;
			if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
			each(obj, function(value, index, list) {
				if (result || (result = iterator.call(context, value, index, list))) return breaker;
			});
			return !!result;
		};

		// Determine if the array or object contains a given value (using `===`).
		// Aliased as `include`.
		_.contains = _.include = function(obj, target) {
			if (obj == null) return false;
			if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
			return any(obj, function(value) {
				return value === target;
			});
		};

		// Invoke a method (with arguments) on every item in a collection.
		_.invoke = function(obj, method) {
			var args = slice.call(arguments, 2);
			return _.map(obj, function(value) {
				return (_.isFunction(method) ? method : value[method]).apply(value, args);
			});
		};

		// Convenience version of a common use case of `map`: fetching a property.
		_.pluck = function(obj, key) {
			return _.map(obj, function(value){ return value[key]; });
		};

		// Convenience version of a common use case of `filter`: selecting only objects
		// with specific `key:value` pairs.
		_.where = function(obj, attrs) {
			if (_.isEmpty(attrs)) return [];
			return _.filter(obj, function(value) {
				for (var key in attrs) {
					if (attrs[key] !== value[key]) return false;
				}
				return true;
			});
		};

		// Return the maximum element or (element-based computation).
		// Can't optimize arrays of integers longer than 65,535 elements.
		// See: https://bugs.webkit.org/show_bug.cgi?id=80797
		_.max = function(obj, iterator, context) {
			if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
				return Math.max.apply(Math, obj);
			}
			if (!iterator && _.isEmpty(obj)) return -Infinity;
			var result = {computed : -Infinity, value: -Infinity};
			each(obj, function(value, index, list) {
				var computed = iterator ? iterator.call(context, value, index, list) : value;
				computed >= result.computed && (result = {value : value, computed : computed});
			});
			return result.value;
		};

		// Return the minimum element (or element-based computation).
		_.min = function(obj, iterator, context) {
			if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
				return Math.min.apply(Math, obj);
			}
			if (!iterator && _.isEmpty(obj)) return Infinity;
			var result = {computed : Infinity, value: Infinity};
			each(obj, function(value, index, list) {
				var computed = iterator ? iterator.call(context, value, index, list) : value;
				computed < result.computed && (result = {value : value, computed : computed});
			});
			return result.value;
		};

		// Shuffle an array.
		_.shuffle = function(obj) {
			var rand;
			var index = 0;
			var shuffled = [];
			each(obj, function(value) {
				rand = _.random(index++);
				shuffled[index - 1] = shuffled[rand];
				shuffled[rand] = value;
			});
			return shuffled;
		};

		// An internal function to generate lookup iterators.
		var lookupIterator = function(value) {
			return _.isFunction(value) ? value : function(obj){ return obj[value]; };
		};

		// Sort the object's values by a criterion produced by an iterator.
		_.sortBy = function(obj, value, context) {
			var iterator = lookupIterator(value);
			return _.pluck(_.map(obj, function(value, index, list) {
				return {
					value : value,
					index : index,
					criteria : iterator.call(context, value, index, list)
				};
			}).sort(function(left, right) {
					var a = left.criteria;
					var b = right.criteria;
					if (a !== b) {
						if (a > b || a === void 0) return 1;
						if (a < b || b === void 0) return -1;
					}
					return left.index < right.index ? -1 : 1;
				}), 'value');
		};

		// An internal function used for aggregate "group by" operations.
		var group = function(obj, value, context, behavior) {
			var result = {};
			var iterator = lookupIterator(value || _.identity);
			each(obj, function(value, index) {
				var key = iterator.call(context, value, index, obj);
				behavior(result, key, value);
			});
			return result;
		};

		// Groups the object's values by a criterion. Pass either a string attribute
		// to group by, or a function that returns the criterion.
		_.groupBy = function(obj, value, context) {
			return group(obj, value, context, function(result, key, value) {
				(_.has(result, key) ? result[key] : (result[key] = [])).push(value);
			});
		};

		// Counts instances of an object that group by a certain criterion. Pass
		// either a string attribute to count by, or a function that returns the
		// criterion.
		_.countBy = function(obj, value, context) {
			return group(obj, value, context, function(result, key) {
				if (!_.has(result, key)) result[key] = 0;
				result[key]++;
			});
		};

		// Use a comparator function to figure out the smallest index at which
		// an object should be inserted so as to maintain order. Uses binary search.
		_.sortedIndex = function(array, obj, iterator, context) {
			iterator = iterator == null ? _.identity : lookupIterator(iterator);
			var value = iterator.call(context, obj);
			var low = 0, high = array.length;
			while (low < high) {
				var mid = (low + high) >>> 1;
				iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
			}
			return low;
		};

		// Safely convert anything iterable into a real, live array.
		_.toArray = function(obj) {
			if (!obj) return [];
			if (_.isArray(obj)) return slice.call(obj);
			if (obj.length === +obj.length) return _.map(obj, _.identity);
			return _.values(obj);
		};

		// Return the number of elements in an object.
		_.size = function(obj) {
			if (obj == null) return 0;
			return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
		};

		// Array Functions
		// ---------------

		// Get the first element of an array. Passing **n** will return the first N
		// values in the array. Aliased as `head` and `take`. The **guard** check
		// allows it to work with `_.map`.
		_.first = _.head = _.take = function(array, n, guard) {
			if (array == null) return void 0;
			return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
		};

		// Returns everything but the last entry of the array. Especially useful on
		// the arguments object. Passing **n** will return all the values in
		// the array, excluding the last N. The **guard** check allows it to work with
		// `_.map`.
		_.initial = function(array, n, guard) {
			return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
		};

		// Get the last element of an array. Passing **n** will return the last N
		// values in the array. The **guard** check allows it to work with `_.map`.
		_.last = function(array, n, guard) {
			if (array == null) return void 0;
			if ((n != null) && !guard) {
				return slice.call(array, Math.max(array.length - n, 0));
			} else {
				return array[array.length - 1];
			}
		};

		// Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
		// Especially useful on the arguments object. Passing an **n** will return
		// the rest N values in the array. The **guard**
		// check allows it to work with `_.map`.
		_.rest = _.tail = _.drop = function(array, n, guard) {
			return slice.call(array, (n == null) || guard ? 1 : n);
		};

		// Trim out all falsy values from an array.
		_.compact = function(array) {
			return _.filter(array, _.identity);
		};

		// Internal implementation of a recursive `flatten` function.
		var flatten = function(input, shallow, output) {
			each(input, function(value) {
				if (_.isArray(value)) {
					shallow ? push.apply(output, value) : flatten(value, shallow, output);
				} else {
					output.push(value);
				}
			});
			return output;
		};

		// Return a completely flattened version of an array.
		_.flatten = function(array, shallow) {
			return flatten(array, shallow, []);
		};

		// Return a version of the array that does not contain the specified value(s).
		_.without = function(array) {
			return _.difference(array, slice.call(arguments, 1));
		};

		// Produce a duplicate-free version of the array. If the array has already
		// been sorted, you have the option of using a faster algorithm.
		// Aliased as `unique`.
		_.uniq = _.unique = function(array, isSorted, iterator, context) {
			if (_.isFunction(isSorted)) {
				context = iterator;
				iterator = isSorted;
				isSorted = false;
			}
			var initial = iterator ? _.map(array, iterator, context) : array;
			var results = [];
			var seen = [];
			each(initial, function(value, index) {
				if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
					seen.push(value);
					results.push(array[index]);
				}
			});
			return results;
		};

		// Produce an array that contains the union: each distinct element from all of
		// the passed-in arrays.
		_.union = function() {
			return _.uniq(concat.apply(ArrayProto, arguments));
		};

		// Produce an array that contains every item shared between all the
		// passed-in arrays.
		_.intersection = function(array) {
			var rest = slice.call(arguments, 1);
			return _.filter(_.uniq(array), function(item) {
				return _.every(rest, function(other) {
					return _.indexOf(other, item) >= 0;
				});
			});
		};

		// Take the difference between one array and a number of other arrays.
		// Only the elements present in just the first array will remain.
		_.difference = function(array) {
			var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
			return _.filter(array, function(value){ return !_.contains(rest, value); });
		};

		// Zip together multiple lists into a single array -- elements that share
		// an index go together.
		_.zip = function() {
			var args = slice.call(arguments);
			var length = _.max(_.pluck(args, 'length'));
			var results = new Array(length);
			for (var i = 0; i < length; i++) {
				results[i] = _.pluck(args, "" + i);
			}
			return results;
		};

		// Converts lists into objects. Pass either a single array of `[key, value]`
		// pairs, or two parallel arrays of the same length -- one of keys, and one of
		// the corresponding values.
		_.object = function(list, values) {
			if (list == null) return {};
			var result = {};
			for (var i = 0, l = list.length; i < l; i++) {
				if (values) {
					result[list[i]] = values[i];
				} else {
					result[list[i][0]] = list[i][1];
				}
			}
			return result;
		};

		// If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
		// we need this function. Return the position of the first occurrence of an
		// item in an array, or -1 if the item is not included in the array.
		// Delegates to **ECMAScript 5**'s native `indexOf` if available.
		// If the array is large and already in sort order, pass `true`
		// for **isSorted** to use binary search.
		_.indexOf = function(array, item, isSorted) {
			if (array == null) return -1;
			var i = 0, l = array.length;
			if (isSorted) {
				if (typeof isSorted == 'number') {
					i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
				} else {
					i = _.sortedIndex(array, item);
					return array[i] === item ? i : -1;
				}
			}
			if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
			for (; i < l; i++) if (array[i] === item) return i;
			return -1;
		};

		// Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
		_.lastIndexOf = function(array, item, from) {
			if (array == null) return -1;
			var hasIndex = from != null;
			if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
				return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
			}
			var i = (hasIndex ? from : array.length);
			while (i--) if (array[i] === item) return i;
			return -1;
		};

		// Generate an integer Array containing an arithmetic progression. A port of
		// the native Python `range()` function. See
		// [the Python documentation](http://docs.python.org/library/functions.html#range).
		_.range = function(start, stop, step) {
			if (arguments.length <= 1) {
				stop = start || 0;
				start = 0;
			}
			step = arguments[2] || 1;

			var len = Math.max(Math.ceil((stop - start) / step), 0);
			var idx = 0;
			var range = new Array(len);

			while(idx < len) {
				range[idx++] = start;
				start += step;
			}

			return range;
		};

		// Function (ahem) Functions
		// ------------------

		// Reusable constructor function for prototype setting.
		var ctor = function(){};

		// Create a function bound to a given object (assigning `this`, and arguments,
		// optionally). Binding with arguments is also known as `curry`.
		// Delegates to **ECMAScript 5**'s native `Function.bind` if available.
		// We check for `func.bind` first, to fail fast when `func` is undefined.
		_.bind = function(func, context) {
			var args, bound;
			if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
			if (!_.isFunction(func)) throw new TypeError;
			args = slice.call(arguments, 2);
			return bound = function() {
				if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
				ctor.prototype = func.prototype;
				var self = new ctor;
				ctor.prototype = null;
				var result = func.apply(self, args.concat(slice.call(arguments)));
				if (Object(result) === result) return result;
				return self;
			};
		};

		// Bind all of an object's methods to that object. Useful for ensuring that
		// all callbacks defined on an object belong to it.
		_.bindAll = function(obj) {
			var funcs = slice.call(arguments, 1);
			if (funcs.length == 0) funcs = _.functions(obj);
			each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
			return obj;
		};

		// Memoize an expensive function by storing its results.
		_.memoize = function(func, hasher) {
			var memo = {};
			hasher || (hasher = _.identity);
			return function() {
				var key = hasher.apply(this, arguments);
				return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
			};
		};

		// Delays a function for the given number of milliseconds, and then calls
		// it with the arguments supplied.
		_.delay = function(func, wait) {
			var args = slice.call(arguments, 2);
			return setTimeout(function(){ return func.apply(null, args); }, wait);
		};

		// Defers a function, scheduling it to run after the current call stack has
		// cleared.
		_.defer = function(func) {
			return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
		};

		// Returns a function, that, when invoked, will only be triggered at most once
		// during a given window of time.
		_.throttle = function(func, wait) {
			var context, args, timeout, result;
			var previous = 0;
			var later = function() {
				previous = new Date;
				timeout = null;
				result = func.apply(context, args);
			};
			return function() {
				var now = new Date;
				var remaining = wait - (now - previous);
				context = this;
				args = arguments;
				if (remaining <= 0) {
					clearTimeout(timeout);
					timeout = null;
					previous = now;
					result = func.apply(context, args);
				} else if (!timeout) {
					timeout = setTimeout(later, remaining);
				}
				return result;
			};
		};

		// Returns a function, that, as long as it continues to be invoked, will not
		// be triggered. The function will be called after it stops being called for
		// N milliseconds. If `immediate` is passed, trigger the function on the
		// leading edge, instead of the trailing.
		_.debounce = function(func, wait, immediate) {
			var timeout, result;
			return function() {
				var context = this, args = arguments;
				var later = function() {
					timeout = null;
					if (!immediate) result = func.apply(context, args);
				};
				var callNow = immediate && !timeout;
				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
				if (callNow) result = func.apply(context, args);
				return result;
			};
		};

		// Returns a function that will be executed at most one time, no matter how
		// often you call it. Useful for lazy initialization.
		_.once = function(func) {
			var ran = false, memo;
			return function() {
				if (ran) return memo;
				ran = true;
				memo = func.apply(this, arguments);
				func = null;
				return memo;
			};
		};

		// Returns the first function passed as an argument to the second,
		// allowing you to adjust arguments, run code before and after, and
		// conditionally execute the original function.
		_.wrap = function(func, wrapper) {
			return function() {
				var args = [func];
				push.apply(args, arguments);
				return wrapper.apply(this, args);
			};
		};

		// Returns a function that is the composition of a list of functions, each
		// consuming the return value of the function that follows.
		_.compose = function() {
			var funcs = arguments;
			return function() {
				var args = arguments;
				for (var i = funcs.length - 1; i >= 0; i--) {
					args = [funcs[i].apply(this, args)];
				}
				return args[0];
			};
		};

		// Returns a function that will only be executed after being called N times.
		_.after = function(times, func) {
			if (times <= 0) return func();
			return function() {
				if (--times < 1) {
					return func.apply(this, arguments);
				}
			};
		};

		// Object Functions
		// ----------------

		// Retrieve the names of an object's properties.
		// Delegates to **ECMAScript 5**'s native `Object.keys`
		_.keys = nativeKeys || function(obj) {
			if (obj !== Object(obj)) throw new TypeError('Invalid object');
			var keys = [];
			for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
			return keys;
		};

		// Retrieve the values of an object's properties.
		_.values = function(obj) {
			var values = [];
			for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
			return values;
		};

		// Convert an object into a list of `[key, value]` pairs.
		_.pairs = function(obj) {
			var pairs = [];
			for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
			return pairs;
		};

		// Invert the keys and values of an object. The values must be serializable.
		_.invert = function(obj) {
			var result = {};
			for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
			return result;
		};

		// Return a sorted list of the function names available on the object.
		// Aliased as `methods`
		_.functions = _.methods = function(obj) {
			var names = [];
			for (var key in obj) {
				if (_.isFunction(obj[key])) names.push(key);
			}
			return names.sort();
		};

		// Extend a given object with all the properties in passed-in object(s).
		_.extend = function(obj) {
			each(slice.call(arguments, 1), function(source) {
				if (source) {
					for (var prop in source) {
						obj[prop] = source[prop];
					}
				}
			});
			return obj;
		};

		// Return a copy of the object only containing the whitelisted properties.
		_.pick = function(obj) {
			var copy = {};
			var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
			each(keys, function(key) {
				if (key in obj) copy[key] = obj[key];
			});
			return copy;
		};

		// Return a copy of the object without the blacklisted properties.
		_.omit = function(obj) {
			var copy = {};
			var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
			for (var key in obj) {
				if (!_.contains(keys, key)) copy[key] = obj[key];
			}
			return copy;
		};

		// Fill in a given object with default properties.
		_.defaults = function(obj) {
			each(slice.call(arguments, 1), function(source) {
				if (source) {
					for (var prop in source) {
						if (obj[prop] == null) obj[prop] = source[prop];
					}
				}
			});
			return obj;
		};

		// Create a (shallow-cloned) duplicate of an object.
		_.clone = function(obj) {
			if (!_.isObject(obj)) return obj;
			return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
		};

		// Invokes interceptor with the obj, and then returns obj.
		// The primary purpose of this method is to "tap into" a method chain, in
		// order to perform operations on intermediate results within the chain.
		_.tap = function(obj, interceptor) {
			interceptor(obj);
			return obj;
		};

		// Internal recursive comparison function for `isEqual`.
		var eq = function(a, b, aStack, bStack) {
			// Identical objects are equal. `0 === -0`, but they aren't identical.
			// See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
			if (a === b) return a !== 0 || 1 / a == 1 / b;
			// A strict comparison is necessary because `null == undefined`.
			if (a == null || b == null) return a === b;
			// Unwrap any wrapped objects.
			if (a instanceof _) a = a._wrapped;
			if (b instanceof _) b = b._wrapped;
			// Compare `[[Class]]` names.
			var className = toString.call(a);
			if (className != toString.call(b)) return false;
			switch (className) {
				// Strings, numbers, dates, and booleans are compared by value.
				case '[object String]':
					// Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
					// equivalent to `new String("5")`.
					return a == String(b);
				case '[object Number]':
					// `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
					// other numeric values.
					return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
				case '[object Date]':
				case '[object Boolean]':
					// Coerce dates and booleans to numeric primitive values. Dates are compared by their
					// millisecond representations. Note that invalid dates with millisecond representations
					// of `NaN` are not equivalent.
					return +a == +b;
				// RegExps are compared by their source patterns and flags.
				case '[object RegExp]':
					return a.source == b.source &&
						a.global == b.global &&
						a.multiline == b.multiline &&
						a.ignoreCase == b.ignoreCase;
			}
			if (typeof a != 'object' || typeof b != 'object') return false;
			// Assume equality for cyclic structures. The algorithm for detecting cyclic
			// structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
			var length = aStack.length;
			while (length--) {
				// Linear search. Performance is inversely proportional to the number of
				// unique nested structures.
				if (aStack[length] == a) return bStack[length] == b;
			}
			// Add the first object to the stack of traversed objects.
			aStack.push(a);
			bStack.push(b);
			var size = 0, result = true;
			// Recursively compare objects and arrays.
			if (className == '[object Array]') {
				// Compare array lengths to determine if a deep comparison is necessary.
				size = a.length;
				result = size == b.length;
				if (result) {
					// Deep compare the contents, ignoring non-numeric properties.
					while (size--) {
						if (!(result = eq(a[size], b[size], aStack, bStack))) break;
					}
				}
			} else {
				// Objects with different constructors are not equivalent, but `Object`s
				// from different frames are.
				var aCtor = a.constructor, bCtor = b.constructor;
				if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
					_.isFunction(bCtor) && (bCtor instanceof bCtor))) {
					return false;
				}
				// Deep compare objects.
				for (var key in a) {
					if (_.has(a, key)) {
						// Count the expected number of properties.
						size++;
						// Deep compare each member.
						if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
					}
				}
				// Ensure that both objects contain the same number of properties.
				if (result) {
					for (key in b) {
						if (_.has(b, key) && !(size--)) break;
					}
					result = !size;
				}
			}
			// Remove the first object from the stack of traversed objects.
			aStack.pop();
			bStack.pop();
			return result;
		};

		// Perform a deep comparison to check if two objects are equal.
		_.isEqual = function(a, b) {
			return eq(a, b, [], []);
		};

		// Is a given array, string, or object empty?
		// An "empty" object has no enumerable own-properties.
		_.isEmpty = function(obj) {
			if (obj == null) return true;
			if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
			for (var key in obj) if (_.has(obj, key)) return false;
			return true;
		};

		// Is a given value a DOM element?
		_.isElement = function(obj) {
			return !!(obj && obj.nodeType === 1);
		};

		// Is a given value an array?
		// Delegates to ECMA5's native Array.isArray
		_.isArray = nativeIsArray || function(obj) {
			return toString.call(obj) == '[object Array]';
		};

		// Is a given variable an object?
		_.isObject = function(obj) {
			return obj === Object(obj);
		};

		// Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
		each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
			_['is' + name] = function(obj) {
				return toString.call(obj) == '[object ' + name + ']';
			};
		});

		// Define a fallback version of the method in browsers (ahem, IE), where
		// there isn't any inspectable "Arguments" type.
		if (!_.isArguments(arguments)) {
			_.isArguments = function(obj) {
				return !!(obj && _.has(obj, 'callee'));
			};
		}

		// Optimize `isFunction` if appropriate.
		if (typeof (/./) !== 'function') {
			_.isFunction = function(obj) {
				return typeof obj === 'function';
			};
		}

		// Is a given object a finite number?
		_.isFinite = function(obj) {
			return isFinite(obj) && !isNaN(parseFloat(obj));
		};

		// Is the given value `NaN`? (NaN is the only number which does not equal itself).
		_.isNaN = function(obj) {
			return _.isNumber(obj) && obj != +obj;
		};

		// Is a given value a boolean?
		_.isBoolean = function(obj) {
			return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
		};

		// Is a given value equal to null?
		_.isNull = function(obj) {
			return obj === null;
		};

		// Is a given variable undefined?
		_.isUndefined = function(obj) {
			return obj === void 0;
		};

		// Shortcut function for checking if an object has a given property directly
		// on itself (in other words, not on a prototype).
		_.has = function(obj, key) {
			return hasOwnProperty.call(obj, key);
		};

		// Utility Functions
		// -----------------

		// Run Underscore.js in *noConflict* mode, returning the `_` variable to its
		// previous owner. Returns a reference to the Underscore object.
		_.noConflict = function() {
			root._ = previousUnderscore;
			return this;
		};

		// Keep the identity function around for default iterators.
		_.identity = function(value) {
			return value;
		};

		// Run a function **n** times.
		_.times = function(n, iterator, context) {
			var accum = Array(n);
			for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
			return accum;
		};

		// Return a random integer between min and max (inclusive).
		_.random = function(min, max) {
			if (max == null) {
				max = min;
				min = 0;
			}
			return min + (0 | Math.random() * (max - min + 1));
		};

		// List of HTML entities for escaping.
		var entityMap = {
			escape: {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#x27;',
				'/': '&#x2F;'
			}
		};
		entityMap.unescape = _.invert(entityMap.escape);

		// Regexes containing the keys and values listed immediately above.
		var entityRegexes = {
			escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
			unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
		};

		// Functions for escaping and unescaping strings to/from HTML interpolation.
		_.each(['escape', 'unescape'], function(method) {
			_[method] = function(string) {
				if (string == null) return '';
				return ('' + string).replace(entityRegexes[method], function(match) {
					return entityMap[method][match];
				});
			};
		});

		// If the value of the named property is a function then invoke it;
		// otherwise, return it.
		_.result = function(object, property) {
			if (object == null) return null;
			var value = object[property];
			return _.isFunction(value) ? value.call(object) : value;
		};

		// Add your own custom functions to the Underscore object.
		_.mixin = function(obj) {
			each(_.functions(obj), function(name){
				var func = _[name] = obj[name];
				_.prototype[name] = function() {
					var args = [this._wrapped];
					push.apply(args, arguments);
					return result.call(this, func.apply(_, args));
				};
			});
		};

		// Generate a unique integer id (unique within the entire client session).
		// Useful for temporary DOM ids.
		var idCounter = 0;
		_.uniqueId = function(prefix) {
			var id = '' + ++idCounter;
			return prefix ? prefix + id : id;
		};

		// By default, Underscore uses ERB-style template delimiters, change the
		// following template settings to use alternative delimiters.
		_.templateSettings = {
			evaluate    : /<%([\s\S]+?)%>/g,
			interpolate : /<%=([\s\S]+?)%>/g,
			escape      : /<%-([\s\S]+?)%>/g
		};

		// When customizing `templateSettings`, if you don't want to define an
		// interpolation, evaluation or escaping regex, we need one that is
		// guaranteed not to match.
		var noMatch = /(.)^/;

		// Certain characters need to be escaped so that they can be put into a
		// string literal.
		var escapes = {
			"'":      "'",
			'\\':     '\\',
			'\r':     'r',
			'\n':     'n',
			'\t':     't',
			'\u2028': 'u2028',
			'\u2029': 'u2029'
		};

		var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

		// JavaScript micro-templating, similar to John Resig's implementation.
		// Underscore templating handles arbitrary delimiters, preserves whitespace,
		// and correctly escapes quotes within interpolated code.
		_.template = function(text, data, settings) {
			settings = _.defaults({}, settings, _.templateSettings);

			// Combine delimiters into one regular expression via alternation.
			var matcher = new RegExp([
				(settings.escape || noMatch).source,
				(settings.interpolate || noMatch).source,
				(settings.evaluate || noMatch).source
			].join('|') + '|$', 'g');

			// Compile the template source, escaping string literals appropriately.
			var index = 0;
			var source = "__p+='";
			text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
				source += text.slice(index, offset)
					.replace(escaper, function(match) { return '\\' + escapes[match]; });

				if (escape) {
					source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
				}
				if (interpolate) {
					source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
				}
				if (evaluate) {
					source += "';\n" + evaluate + "\n__p+='";
				}
				index = offset + match.length;
				return match;
			});
			source += "';\n";

			// If a variable is not specified, place data values in local scope.
			if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

			source = "var __t,__p='',__j=Array.prototype.join," +
				"print=function(){__p+=__j.call(arguments,'');};\n" +
				source + "return __p;\n";

			try {
				var render = new Function(settings.variable || 'obj', '_', source);
			} catch (e) {
				e.source = source;
				throw e;
			}

			if (data) return render(data, _);
			var template = function(data) {
				return render.call(this, data, _);
			};

			// Provide the compiled function source as a convenience for precompilation.
			template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

			return template;
		};

		// Add a "chain" function, which will delegate to the wrapper.
		_.chain = function(obj) {
			return _(obj).chain();
		};

		// OOP
		// ---------------
		// If Underscore is called as a function, it returns a wrapped object that
		// can be used OO-style. This wrapper holds altered versions of all the
		// underscore functions. Wrapped objects may be chained.

		// Helper function to continue chaining intermediate results.
		var result = function(obj) {
			return this._chain ? _(obj).chain() : obj;
		};

		// Add all of the Underscore functions to the wrapper object.
		_.mixin(_);

		// Add all mutator Array functions to the wrapper.
		each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
			var method = ArrayProto[name];
			_.prototype[name] = function() {
				var obj = this._wrapped;
				method.apply(obj, arguments);
				if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
				return result.call(this, obj);
			};
		});

		// Add all accessor Array functions to the wrapper.
		each(['concat', 'join', 'slice'], function(name) {
			var method = ArrayProto[name];
			_.prototype[name] = function() {
				return result.call(this, method.apply(this._wrapped, arguments));
			};
		});

		_.extend(_.prototype, {

			// Start chaining a wrapped Underscore object.
			chain: function() {
				this._chain = true;
				return this;
			},

			// Extracts the result from a wrapped and chained object.
			value: function() {
				return this._wrapped;
			}

		});

	}).call(this);

});

require.define("/lib/TopoGrid",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');
	var Component = require('hive-component');
	var _DEBUG = false;
	var _mixins = require('./topogrid/mixins');
	var _config = require('./topogrid/config');

	/* ************************************
	 * TopoGrid is a utility that translates an image to a matrix of heights
	 * based on its intensity.
	 * ************************************ */

	/* ******* CLOSURE ********* */

	/* ********* EXPORTS ******** */

	module.exports = function (mixins, config, cb) {

		if (_DEBUG) console.log('config: %s', util.inspect(config));
		var grid = Component([_mixins, mixins], [ config,_config]);
		grid.init(cb);

	}; // end export function
});

require.define("/node_modules/hive-component/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {}
});

require.define("/node_modules/hive-component/index.js",function(require,module,exports,__dirname,__filename,process,global){var Component = require('./lib/Component');

	module.exports = function (mixins, config, cb) {
		return new Component(mixins, config, cb)
	};

	module.exports.Component = Component;
});

require.define("/node_modules/hive-component/lib/Component.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var events = require('events');
	var util = require('util');
	var fs = require('fs');
	var path = require('path');
	var _DEBUG = false;

	var _id = 0;
	function Component(extend, config, cb) {
		this.extend(extend);
		this.component_id = ++_id;
		var self = this;
		this.config(config, function (err, config) {
			if (cb) {
				if (_DEBUG) {
					console.log('returning component %s', util.inspect(config));
				}
				cb(err, self)
			} else {
				if (_DEBUG) {
					console.log('component created without callback')
				}
			}
		});
	};

	util.inherits(Component, events.EventEmitter);

	_.extend(Component.prototype, {

		extend: require('./extend'),

		_params: require('./params'),

		init: require('./init'),

		TYPE: 'HIVE_COMPONENT',

		// ****************** CONFIGURE *******************

		config: require('./config'),

		get_config: function (key, def) {
			if (!this.has_config(key)){
				return def;
			}
			return this.config().get(key);
		},

		set_config: function (key, value) {
			return this.config().set(key, value);
		},

		has_config: function(key){
			return this.config().has(key)
		}

	})

	module.exports = Component
});

require.define("fs",function(require,module,exports,__dirname,__filename,process,global){// nothing to see here... no file methods for the browser

});

require.define("/node_modules/hive-component/lib/extend.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var _DEBUG = true;

	module.exports = function (ob, supplement) {
		var self = this;

		_.each(this._params(ob), function(value, key){
			if (supplement && this.hasOwnProperty(key)){
				return;
			}
			if (_.isArray(value)){
				self[key] = value.slice(0);
			} else if (_.isFunction(value)){
				self[key] = value;
			} else if (_.isObject(value)){
				self[key] = _.clone(value);
			} else {
				self[key] = value;
			}
		})
	}
});

require.define("/node_modules/hive-component/lib/params.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var fs = require('fs');

	function _param_path(o_path) {
		if (fs.existsSync(o_path)) {
			return require(o_path);
		} else {
			console.log('cannot find file %s', o_path);
			throw new Error('prop path not found');
		}
	}

	module.exports = function (params) {
		if (_.isArray(params)) {
			params = _.compact(params);
			params = _.reduce(params, function (p, o) {
					if (_.isString(o)) {
						o = _param_path(o);
					}
					if (_.isObject(o)) {
						return _.defaults(p, o);
					}
					return p;
				}
			)
		} else if (_.isObject(params)) {
			params = _.clone(params);
		} else if (_.isString(params)) {
			params = _param_path(params, if_string);
		} else {
			params = {};
		}
		return params;
	};
});

require.define("/node_modules/hive-component/lib/init.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var events = require('events');
	var util = require('util');
	var fs = require('fs');
	var path = require('path');
	var Gate = require('gate');
	var async = require('async');
	var _DEBUG = false;

	module.exports = function ( callback, tasks) {
		var self = this;
		if (!tasks){
			if (!self.config().has('init_tasks')){
				self.set_config('init_tasks', []);
			}
			tasks = self.get_config('init_tasks');
		}
		if (_DEBUG){
			console.log(' ------------------ tasks: %s', util.inspect(tasks));
		}

		var wf = _.map(tasks, function(task){
			return _.bind(task, self)
		});

		async.waterfall(wf, function(){
			if (callback){
				callback(null, self);
			}
		});

	}
});

require.define("/node_modules/hive-component/node_modules/async/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"./lib/async"}
});

require.define("/node_modules/hive-component/node_modules/async/lib/async.js",function(require,module,exports,__dirname,__filename,process,global){/*global setImmediate: false, setTimeout: false, console: false */
	(function () {

		var async = {};

		// global on the server, window in the browser
		var root, previous_async;

		root = this;
		if (root != null) {
			previous_async = root.async;
		}

		async.noConflict = function () {
			root.async = previous_async;
			return async;
		};

		function only_once(fn) {
			var called = false;
			return function() {
				if (called) throw new Error("Callback was already called.");
				called = true;
				fn.apply(root, arguments);
			}
		}

		//// cross-browser compatiblity functions ////

		var _forEach = function (arr, iterator) {
			if (arr.forEach) {
				return arr.forEach(iterator);
			}
			for (var i = 0; i < arr.length; i += 1) {
				iterator(arr[i], i, arr);
			}
		};

		var _map = function (arr, iterator) {
			if (arr.map) {
				return arr.map(iterator);
			}
			var results = [];
			_forEach(arr, function (x, i, a) {
				results.push(iterator(x, i, a));
			});
			return results;
		};

		var _reduce = function (arr, iterator, memo) {
			if (arr.reduce) {
				return arr.reduce(iterator, memo);
			}
			_forEach(arr, function (x, i, a) {
				memo = iterator(memo, x, i, a);
			});
			return memo;
		};

		var _keys = function (obj) {
			if (Object.keys) {
				return Object.keys(obj);
			}
			var keys = [];
			for (var k in obj) {
				if (obj.hasOwnProperty(k)) {
					keys.push(k);
				}
			}
			return keys;
		};

		//// exported async module functions ////

		//// nextTick implementation with browser-compatible fallback ////
		if (typeof process === 'undefined' || !(process.nextTick)) {
			if (typeof setImmediate === 'function') {
				async.nextTick = function (fn) {
					setImmediate(fn);
				};
			}
			else {
				async.nextTick = function (fn) {
					setTimeout(fn, 0);
				};
			}
		}
		else {
			async.nextTick = process.nextTick;
		}

		async.forEach = function (arr, iterator, callback) {
			callback = callback || function () {};
			if (!arr.length) {
				return callback();
			}
			var completed = 0;
			_forEach(arr, function (x) {
				iterator(x, only_once(function (err) {
					if (err) {
						callback(err);
						callback = function () {};
					}
					else {
						completed += 1;
						if (completed >= arr.length) {
							callback(null);
						}
					}
				}));
			});
		};

		async.forEachSeries = function (arr, iterator, callback) {
			callback = callback || function () {};
			if (!arr.length) {
				return callback();
			}
			var completed = 0;
			var iterate = function () {
				var sync = true;
				iterator(arr[completed], function (err) {
					if (err) {
						callback(err);
						callback = function () {};
					}
					else {
						completed += 1;
						if (completed >= arr.length) {
							callback(null);
						}
						else {
							if (sync) {
								async.nextTick(iterate);
							}
							else {
								iterate();
							}
						}
					}
				});
				sync = false;
			};
			iterate();
		};

		async.forEachLimit = function (arr, limit, iterator, callback) {
			var fn = _forEachLimit(limit);
			fn.apply(null, [arr, iterator, callback]);
		};

		var _forEachLimit = function (limit) {

			return function (arr, iterator, callback) {
				callback = callback || function () {};
				if (!arr.length || limit <= 0) {
					return callback();
				}
				var completed = 0;
				var started = 0;
				var running = 0;

				(function replenish () {
					if (completed >= arr.length) {
						return callback();
					}

					while (running < limit && started < arr.length) {
						started += 1;
						running += 1;
						iterator(arr[started - 1], function (err) {
							if (err) {
								callback(err);
								callback = function () {};
							}
							else {
								completed += 1;
								running -= 1;
								if (completed >= arr.length) {
									callback();
								}
								else {
									replenish();
								}
							}
						});
					}
				})();
			};
		};


		var doParallel = function (fn) {
			return function () {
				var args = Array.prototype.slice.call(arguments);
				return fn.apply(null, [async.forEach].concat(args));
			};
		};
		var doParallelLimit = function(limit, fn) {
			return function () {
				var args = Array.prototype.slice.call(arguments);
				return fn.apply(null, [_forEachLimit(limit)].concat(args));
			};
		};
		var doSeries = function (fn) {
			return function () {
				var args = Array.prototype.slice.call(arguments);
				return fn.apply(null, [async.forEachSeries].concat(args));
			};
		};


		var _asyncMap = function (eachfn, arr, iterator, callback) {
			var results = [];
			arr = _map(arr, function (x, i) {
				return {index: i, value: x};
			});
			eachfn(arr, function (x, callback) {
				iterator(x.value, function (err, v) {
					results[x.index] = v;
					callback(err);
				});
			}, function (err) {
				callback(err, results);
			});
		};
		async.map = doParallel(_asyncMap);
		async.mapSeries = doSeries(_asyncMap);
		async.mapLimit = function (arr, limit, iterator, callback) {
			return _mapLimit(limit)(arr, iterator, callback);
		};

		var _mapLimit = function(limit) {
			return doParallelLimit(limit, _asyncMap);
		};

		// reduce only has a series version, as doing reduce in parallel won't
		// work in many situations.
		async.reduce = function (arr, memo, iterator, callback) {
			async.forEachSeries(arr, function (x, callback) {
				iterator(memo, x, function (err, v) {
					memo = v;
					callback(err);
				});
			}, function (err) {
				callback(err, memo);
			});
		};
		// inject alias
		async.inject = async.reduce;
		// foldl alias
		async.foldl = async.reduce;

		async.reduceRight = function (arr, memo, iterator, callback) {
			var reversed = _map(arr, function (x) {
				return x;
			}).reverse();
			async.reduce(reversed, memo, iterator, callback);
		};
		// foldr alias
		async.foldr = async.reduceRight;

		var _filter = function (eachfn, arr, iterator, callback) {
			var results = [];
			arr = _map(arr, function (x, i) {
				return {index: i, value: x};
			});
			eachfn(arr, function (x, callback) {
				iterator(x.value, function (v) {
					if (v) {
						results.push(x);
					}
					callback();
				});
			}, function (err) {
				callback(_map(results.sort(function (a, b) {
					return a.index - b.index;
				}), function (x) {
					return x.value;
				}));
			});
		};
		async.filter = doParallel(_filter);
		async.filterSeries = doSeries(_filter);
		// select alias
		async.select = async.filter;
		async.selectSeries = async.filterSeries;

		var _reject = function (eachfn, arr, iterator, callback) {
			var results = [];
			arr = _map(arr, function (x, i) {
				return {index: i, value: x};
			});
			eachfn(arr, function (x, callback) {
				iterator(x.value, function (v) {
					if (!v) {
						results.push(x);
					}
					callback();
				});
			}, function (err) {
				callback(_map(results.sort(function (a, b) {
					return a.index - b.index;
				}), function (x) {
					return x.value;
				}));
			});
		};
		async.reject = doParallel(_reject);
		async.rejectSeries = doSeries(_reject);

		var _detect = function (eachfn, arr, iterator, main_callback) {
			eachfn(arr, function (x, callback) {
				iterator(x, function (result) {
					if (result) {
						main_callback(x);
						main_callback = function () {};
					}
					else {
						callback();
					}
				});
			}, function (err) {
				main_callback();
			});
		};
		async.detect = doParallel(_detect);
		async.detectSeries = doSeries(_detect);

		async.some = function (arr, iterator, main_callback) {
			async.forEach(arr, function (x, callback) {
				iterator(x, function (v) {
					if (v) {
						main_callback(true);
						main_callback = function () {};
					}
					callback();
				});
			}, function (err) {
				main_callback(false);
			});
		};
		// any alias
		async.any = async.some;

		async.every = function (arr, iterator, main_callback) {
			async.forEach(arr, function (x, callback) {
				iterator(x, function (v) {
					if (!v) {
						main_callback(false);
						main_callback = function () {};
					}
					callback();
				});
			}, function (err) {
				main_callback(true);
			});
		};
		// all alias
		async.all = async.every;

		async.sortBy = function (arr, iterator, callback) {
			async.map(arr, function (x, callback) {
				iterator(x, function (err, criteria) {
					if (err) {
						callback(err);
					}
					else {
						callback(null, {value: x, criteria: criteria});
					}
				});
			}, function (err, results) {
				if (err) {
					return callback(err);
				}
				else {
					var fn = function (left, right) {
						var a = left.criteria, b = right.criteria;
						return a < b ? -1 : a > b ? 1 : 0;
					};
					callback(null, _map(results.sort(fn), function (x) {
						return x.value;
					}));
				}
			});
		};

		async.auto = function (tasks, callback) {
			callback = callback || function () {};
			var keys = _keys(tasks);
			if (!keys.length) {
				return callback(null);
			}

			var results = {};

			var listeners = [];
			var addListener = function (fn) {
				listeners.unshift(fn);
			};
			var removeListener = function (fn) {
				for (var i = 0; i < listeners.length; i += 1) {
					if (listeners[i] === fn) {
						listeners.splice(i, 1);
						return;
					}
				}
			};
			var taskComplete = function () {
				_forEach(listeners.slice(0), function (fn) {
					fn();
				});
			};

			addListener(function () {
				if (_keys(results).length === keys.length) {
					callback(null, results);
					callback = function () {};
				}
			});

			_forEach(keys, function (k) {
				var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
				var taskCallback = function (err) {
					if (err) {
						callback(err);
						// stop subsequent errors hitting callback multiple times
						callback = function () {};
					}
					else {
						var args = Array.prototype.slice.call(arguments, 1);
						if (args.length <= 1) {
							args = args[0];
						}
						results[k] = args;
						async.nextTick(taskComplete);
					}
				};
				var requires = task.slice(0, Math.abs(task.length - 1)) || [];
				var ready = function () {
					return _reduce(requires, function (a, x) {
						return (a && results.hasOwnProperty(x));
					}, true) && !results.hasOwnProperty(k);
				};
				if (ready()) {
					task[task.length - 1](taskCallback, results);
				}
				else {
					var listener = function () {
						if (ready()) {
							removeListener(listener);
							task[task.length - 1](taskCallback, results);
						}
					};
					addListener(listener);
				}
			});
		};

		async.waterfall = function (tasks, callback) {
			callback = callback || function () {};
			if (!tasks.length) {
				return callback();
			}
			var wrapIterator = function (iterator) {
				return function (err) {
					if (err) {
						callback.apply(null, arguments);
						callback = function () {};
					}
					else {
						var args = Array.prototype.slice.call(arguments, 1);
						var next = iterator.next();
						if (next) {
							args.push(wrapIterator(next));
						}
						else {
							args.push(callback);
						}
						async.nextTick(function () {
							iterator.apply(null, args);
						});
					}
				};
			};
			wrapIterator(async.iterator(tasks))();
		};

		var _parallel = function(eachfn, tasks, callback) {
			callback = callback || function () {};
			if (tasks.constructor === Array) {
				eachfn.map(tasks, function (fn, callback) {
					if (fn) {
						fn(function (err) {
							var args = Array.prototype.slice.call(arguments, 1);
							if (args.length <= 1) {
								args = args[0];
							}
							callback.call(null, err, args);
						});
					}
				}, callback);
			}
			else {
				var results = {};
				eachfn.forEach(_keys(tasks), function (k, callback) {
					tasks[k](function (err) {
						var args = Array.prototype.slice.call(arguments, 1);
						if (args.length <= 1) {
							args = args[0];
						}
						results[k] = args;
						callback(err);
					});
				}, function (err) {
					callback(err, results);
				});
			}
		};

		async.parallel = function (tasks, callback) {
			_parallel({ map: async.map, forEach: async.forEach }, tasks, callback);
		};

		async.parallelLimit = function(tasks, limit, callback) {
			_parallel({ map: _mapLimit(limit), forEach: _forEachLimit(limit) }, tasks, callback);
		};

		async.series = function (tasks, callback) {
			callback = callback || function () {};
			if (tasks.constructor === Array) {
				async.mapSeries(tasks, function (fn, callback) {
					if (fn) {
						fn(function (err) {
							var args = Array.prototype.slice.call(arguments, 1);
							if (args.length <= 1) {
								args = args[0];
							}
							callback.call(null, err, args);
						});
					}
				}, callback);
			}
			else {
				var results = {};
				async.forEachSeries(_keys(tasks), function (k, callback) {
					tasks[k](function (err) {
						var args = Array.prototype.slice.call(arguments, 1);
						if (args.length <= 1) {
							args = args[0];
						}
						results[k] = args;
						callback(err);
					});
				}, function (err) {
					callback(err, results);
				});
			}
		};

		async.iterator = function (tasks) {
			var makeCallback = function (index) {
				var fn = function () {
					if (tasks.length) {
						tasks[index].apply(null, arguments);
					}
					return fn.next();
				};
				fn.next = function () {
					return (index < tasks.length - 1) ? makeCallback(index + 1): null;
				};
				return fn;
			};
			return makeCallback(0);
		};

		async.apply = function (fn) {
			var args = Array.prototype.slice.call(arguments, 1);
			return function () {
				return fn.apply(
					null, args.concat(Array.prototype.slice.call(arguments))
				);
			};
		};

		var _concat = function (eachfn, arr, fn, callback) {
			var r = [];
			eachfn(arr, function (x, cb) {
				fn(x, function (err, y) {
					r = r.concat(y || []);
					cb(err);
				});
			}, function (err) {
				callback(err, r);
			});
		};
		async.concat = doParallel(_concat);
		async.concatSeries = doSeries(_concat);

		async.whilst = function (test, iterator, callback) {
			if (test()) {
				var sync = true;
				iterator(function (err) {
					if (err) {
						return callback(err);
					}
					if (sync) {
						async.nextTick(function () {
							async.whilst(test, iterator, callback);
						});
					}
					else {
						async.whilst(test, iterator, callback);
					}
				});
				sync = false;
			}
			else {
				callback();
			}
		};

		async.doWhilst = function (iterator, test, callback) {
			var sync = true;
			iterator(function (err) {
				if (err) {
					return callback(err);
				}
				if (test()) {
					if (sync) {
						async.nextTick(function () {
							async.doWhilst(iterator, test, callback);
						});
					}
					else {
						async.doWhilst(iterator, test, callback);
					}
				}
				else {
					callback();
				}
			});
			sync = false;
		};

		async.until = function (test, iterator, callback) {
			if (!test()) {
				var sync = true;
				iterator(function (err) {
					if (err) {
						return callback(err);
					}
					if (sync) {
						async.nextTick(function () {
							async.until(test, iterator, callback);
						});
					}
					else {
						async.until(test, iterator, callback);
					}
				});
				sync = false;
			}
			else {
				callback();
			}
		};

		async.doUntil = function (iterator, test, callback) {
			var sync = true;
			iterator(function (err) {
				if (err) {
					return callback(err);
				}
				if (!test()) {
					if (sync) {
						async.nextTick(function () {
							async.doUntil(iterator, test, callback);
						});
					}
					else {
						async.doUntil(iterator, test, callback);
					}
				}
				else {
					callback();
				}
			});
			sync = false;
		};

		async.queue = function (worker, concurrency) {
			function _insert(q, data, pos, callback) {
				if(data.constructor !== Array) {
					data = [data];
				}
				_forEach(data, function(task) {
					var item = {
						data: task,
						callback: typeof callback === 'function' ? callback : null
					};

					if (pos) {
						q.tasks.unshift(item);
					} else {
						q.tasks.push(item);
					}

					if (q.saturated && q.tasks.length === concurrency) {
						q.saturated();
					}
					async.nextTick(q.process);
				});
			}

			var workers = 0;
			var q = {
				tasks: [],
				concurrency: concurrency,
				saturated: null,
				empty: null,
				drain: null,
				push: function (data, callback) {
					_insert(q, data, false, callback);
				},
				unshift: function (data, callback) {
					_insert(q, data, true, callback);
				},
				process: function () {
					if (workers < q.concurrency && q.tasks.length) {
						var task = q.tasks.shift();
						if (q.empty && q.tasks.length === 0) {
							q.empty();
						}
						workers += 1;
						var sync = true;
						var next = function () {
							workers -= 1;
							if (task.callback) {
								task.callback.apply(task, arguments);
							}
							if (q.drain && q.tasks.length + workers === 0) {
								q.drain();
							}
							q.process();
						};
						var cb = only_once(function () {
							var cbArgs = arguments;

							if (sync) {
								async.nextTick(function () {
									next.apply(null, cbArgs);
								});
							} else {
								next.apply(null, arguments);
							}
						});
						worker(task.data, cb);
						sync = false;
					}
				},
				length: function () {
					return q.tasks.length;
				},
				running: function () {
					return workers;
				}
			};
			return q;
		};

		async.cargo = function (worker, payload) {
			var working     = false,
				tasks       = [];

			var cargo = {
				tasks: tasks,
				payload: payload,
				saturated: null,
				empty: null,
				drain: null,
				push: function (data, callback) {
					if(data.constructor !== Array) {
						data = [data];
					}
					_forEach(data, function(task) {
						tasks.push({
							data: task,
							callback: typeof callback === 'function' ? callback : null
						});
						if (cargo.saturated && tasks.length === payload) {
							cargo.saturated();
						}
					});
					async.nextTick(cargo.process);
				},
				process: function process() {
					if (working) return;
					if (tasks.length === 0) {
						if(cargo.drain) cargo.drain();
						return;
					}

					var ts = typeof payload === 'number'
						? tasks.splice(0, payload)
						: tasks.splice(0);

					var ds = _map(ts, function (task) {
						return task.data;
					});

					if(cargo.empty) cargo.empty();
					working = true;
					worker(ds, function () {
						working = false;

						var args = arguments;
						_forEach(ts, function (data) {
							if (data.callback) {
								data.callback.apply(null, args);
							}
						});

						process();
					});
				},
				length: function () {
					return tasks.length;
				},
				running: function () {
					return working;
				}
			};
			return cargo;
		};

		var _console_fn = function (name) {
			return function (fn) {
				var args = Array.prototype.slice.call(arguments, 1);
				fn.apply(null, args.concat([function (err) {
					var args = Array.prototype.slice.call(arguments, 1);
					if (typeof console !== 'undefined') {
						if (err) {
							if (console.error) {
								console.error(err);
							}
						}
						else if (console[name]) {
							_forEach(args, function (x) {
								console[name](x);
							});
						}
					}
				}]));
			};
		};
		async.log = _console_fn('log');
		async.dir = _console_fn('dir');
		/*async.info = _console_fn('info');
		 async.warn = _console_fn('warn');
		 async.error = _console_fn('error');*/

		async.memoize = function (fn, hasher) {
			var memo = {};
			var queues = {};
			hasher = hasher || function (x) {
				return x;
			};
			var memoized = function () {
				var args = Array.prototype.slice.call(arguments);
				var callback = args.pop();
				var key = hasher.apply(null, args);
				if (key in memo) {
					callback.apply(null, memo[key]);
				}
				else if (key in queues) {
					queues[key].push(callback);
				}
				else {
					queues[key] = [callback];
					fn.apply(null, args.concat([function () {
						memo[key] = arguments;
						var q = queues[key];
						delete queues[key];
						for (var i = 0, l = q.length; i < l; i++) {
							q[i].apply(null, arguments);
						}
					}]));
				}
			};
			memoized.memo = memo;
			memoized.unmemoized = fn;
			return memoized;
		};

		async.unmemoize = function (fn) {
			return function () {
				return (fn.unmemoized || fn).apply(null, arguments);
			};
		};

		async.times = function (count, iterator, callback) {
			var counter = [];
			for (var i = 0; i < count; i++) {
				counter.push(i);
			}
			return async.map(counter, iterator, callback);
		};

		async.timesSeries = function (count, iterator, callback) {
			var counter = [];
			for (var i = 0; i < count; i++) {
				counter.push(i);
			}
			return async.mapSeries(counter, iterator, callback);
		};

		async.compose = function (/* functions... */) {
			var fns = Array.prototype.reverse.call(arguments);
			return function () {
				var that = this;
				var args = Array.prototype.slice.call(arguments);
				var callback = args.pop();
				async.reduce(fns, args, function (newargs, fn, cb) {
						fn.apply(that, newargs.concat([function () {
							var err = arguments[0];
							var nextargs = Array.prototype.slice.call(arguments, 1);
							cb(err, nextargs);
						}]))
					},
					function (err, results) {
						callback.apply(that, [err].concat(results));
					});
			};
		};

		// AMD / RequireJS
		if (typeof define !== 'undefined' && define.amd) {
			define([], function () {
				return async;
			});
		}
		// Node.js
		else if (typeof module !== 'undefined' && module.exports) {
			module.exports = async;
		}
		// included directly via <script> tag
		else {
			root.async = async;
		}

	}());

});

require.define("/node_modules/hive-component/lib/config.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var events = require('events');
	var util = require('util');
	var Configuration = require('hive-configuration');
	var fs = require('fs');
	var path = require('path');
	var _DEBUG = false;

	function _init_config(config_obj, self) {
		self._config = new Configuration(self._params(config_obj, 'json'));
	}

	function _init_config_path(config, cb, self) {

		if (!cb) {
			throw new Error('attempting to load configuration %s without callback', config);
		}

		fs.exists(config, function (config_exists) {
			if (config_exists) {
				fs.readFile(config, 'utf8', function (err, config_data) {
					try {
						var config_obj = JSON.parse(config_data);
					} catch (e) {
						if (cb) {
							return cb(e);
						} else {
							throw e;
						}
					}
					self.config(config_obj, cb);
				});
			} else if (cb) {
				cb(new Error('cannot read ' + config));
			} else {
				throw new Error('cannot read ' + config);
			}
		})
	}

	function _load_config_with_array(config, self) {

		if (!self._config) {
			_init_config({}, self);
		}

		config.forEach(function (def) {
			self.config().set(def.key, def.value);
		})

	}

	module.exports = function (config, cb) {
		if (_DEBUG) {
			if (cb) {
				var c = cb;
				cb = function (err, result) {
					console.log('done with configuring component with %s', util.inspect(config));
					if (c) c(err, result);
				}
			}
		}

		if (config) {
			if (_DEBUG) {
				if (config) {
					console.log('configuring compoennt with %s', util.inspect(config));
				}

			}

			var self = this;
			if (_.isString(config)) {
				_init_config_path(config, cb, self);
				return;

			} else if (_.isObject(config)) {
				if (this._config) {
					_.each(config, function (value, key) {
						self.set_config()(key, value);
					})
				} else {
					_init_config(config, this);
				}
			} else if (_.isArray(config)) {
				_load_config_with_array(config, this);
			}
		} else {
			if (!this._config) {
				_init_config({}, this);
			}
		}

		if (cb) {
			if (!this._config) {
				return cb(new Error('managed to get through config with out initialzation!'));
			}
			cb(null, this._config);
		}
		return this._config;
	};
});

require.define("/node_modules/hive-component/node_modules/hive-configuration/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {}
});

require.define("/node_modules/hive-component/node_modules/hive-configuration/index.js",function(require,module,exports,__dirname,__filename,process,global){var util = require('util');
	var EventEmitter = require('events').EventEmitter;
	var underscore = require('underscore');

	var Configuration = function Configuration(defaults) {
		"use strict";
		EventEmitter.call(this);
		this.defaults = underscore.clone(defaults || {});
		this.data = defaults || {};
	};
	util.inherits(Configuration, EventEmitter);

	Configuration.prototype.valueOf = function(){
		return underscore.clone(this.data);
	}

	Configuration.prototype.set = function set(key, value, replace) {
		"use strict";
		var event;
		var ret = this;
		if (this.data[key]) {
			event = 'change';
		} else {
			event = 'set';
		}
		if ((!replace) && this.data[key]){
			if (underscore.isArray(value) && underscore.isArray(this.data[key])){
				value = this.data[key].concat(value);
			} else if (underscore.isObject(value) && underscore.isObject(this.data[key])){
				underscore.defaults(value, this.data[key]);
			}
		}
		this.data[key] = value;
		this.emit(event, key, this.data[key]);
		this.emit(event + ':' + key, this.data[key]);
		return ret;
	};

	Configuration.prototype.get = function get(key) {
		"use strict";
		return this.data[key] || null;
	};

	Configuration.prototype.remove = function remove(key) {
		"use strict";
		if (this.data[key]) {
			this.emit('remove', key, this.data[key]);
			this.emit('remove:' + key, this.data[key]);
			delete this.data[key];
			this.data[key] = null;
		}
		return this;
	};

	Configuration.prototype.removeAll = function removeAll() {
		"use strict";
		this.emit('removeAll');
		delete this.data;
		this.data = {};
		return this;
	};

	Configuration.prototype.isEmpty = function isEmpty() {
		"use strict";
		return underscore.isEmpty(this.data);
	};

	Configuration.prototype.reset = function reset() {
		"use strict";
		this.emit('reset');
		delete this.data;
		this.data = null;
		this.data = this.defaults;
		return this;
	};

	Configuration.prototype.has = function has(key) {
		"use strict";
		return this.data[key] ? true : false;
	};

	Configuration.prototype.setAll = function setAll(config) {
		"use strict";
		var that = this;
		this.emit('setAll', config);
		underscore.each(config, function (value, key) {
			that.set(key, value);
		});
		return this;
	};

	module.exports = Configuration;

});

require.define("/node_modules/hive-component/node_modules/hive-configuration/node_modules/underscore/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"underscore.js"}
});

require.define("/node_modules/hive-component/node_modules/hive-configuration/node_modules/underscore/underscore.js",function(require,module,exports,__dirname,__filename,process,global){//     Underscore.js 1.3.3
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

	(function() {

		// Baseline setup
		// --------------

		// Establish the root object, `window` in the browser, or `global` on the server.
		var root = this;

		// Save the previous value of the `_` variable.
		var previousUnderscore = root._;

		// Establish the object that gets returned to break out of a loop iteration.
		var breaker = {};

		// Save bytes in the minified (but not gzipped) version:
		var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

		// Create quick reference variables for speed access to core prototypes.
		var slice            = ArrayProto.slice,
			unshift          = ArrayProto.unshift,
			toString         = ObjProto.toString,
			hasOwnProperty   = ObjProto.hasOwnProperty;

		// All **ECMAScript 5** native function implementations that we hope to use
		// are declared here.
		var
			nativeForEach      = ArrayProto.forEach,
			nativeMap          = ArrayProto.map,
			nativeReduce       = ArrayProto.reduce,
			nativeReduceRight  = ArrayProto.reduceRight,
			nativeFilter       = ArrayProto.filter,
			nativeEvery        = ArrayProto.every,
			nativeSome         = ArrayProto.some,
			nativeIndexOf      = ArrayProto.indexOf,
			nativeLastIndexOf  = ArrayProto.lastIndexOf,
			nativeIsArray      = Array.isArray,
			nativeKeys         = Object.keys,
			nativeBind         = FuncProto.bind;

		// Create a safe reference to the Underscore object for use below.
		var _ = function(obj) { return new wrapper(obj); };

		// Export the Underscore object for **Node.js**, with
		// backwards-compatibility for the old `require()` API. If we're in
		// the browser, add `_` as a global object via a string identifier,
		// for Closure Compiler "advanced" mode.
		if (typeof exports !== 'undefined') {
			if (typeof module !== 'undefined' && module.exports) {
				exports = module.exports = _;
			}
			exports._ = _;
		} else {
			root['_'] = _;
		}

		// Current version.
		_.VERSION = '1.3.3';

		// Collection Functions
		// --------------------

		// The cornerstone, an `each` implementation, aka `forEach`.
		// Handles objects with the built-in `forEach`, arrays, and raw objects.
		// Delegates to **ECMAScript 5**'s native `forEach` if available.
		var each = _.each = _.forEach = function(obj, iterator, context) {
			if (obj == null) return;
			if (nativeForEach && obj.forEach === nativeForEach) {
				obj.forEach(iterator, context);
			} else if (obj.length === +obj.length) {
				for (var i = 0, l = obj.length; i < l; i++) {
					if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
				}
			} else {
				for (var key in obj) {
					if (_.has(obj, key)) {
						if (iterator.call(context, obj[key], key, obj) === breaker) return;
					}
				}
			}
		};

		// Return the results of applying the iterator to each element.
		// Delegates to **ECMAScript 5**'s native `map` if available.
		_.map = _.collect = function(obj, iterator, context) {
			var results = [];
			if (obj == null) return results;
			if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
			each(obj, function(value, index, list) {
				results[results.length] = iterator.call(context, value, index, list);
			});
			if (obj.length === +obj.length) results.length = obj.length;
			return results;
		};

		// **Reduce** builds up a single result from a list of values, aka `inject`,
		// or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
		_.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
			var initial = arguments.length > 2;
			if (obj == null) obj = [];
			if (nativeReduce && obj.reduce === nativeReduce) {
				if (context) iterator = _.bind(iterator, context);
				return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
			}
			each(obj, function(value, index, list) {
				if (!initial) {
					memo = value;
					initial = true;
				} else {
					memo = iterator.call(context, memo, value, index, list);
				}
			});
			if (!initial) throw new TypeError('Reduce of empty array with no initial value');
			return memo;
		};

		// The right-associative version of reduce, also known as `foldr`.
		// Delegates to **ECMAScript 5**'s native `reduceRight` if available.
		_.reduceRight = _.foldr = function(obj, iterator, memo, context) {
			var initial = arguments.length > 2;
			if (obj == null) obj = [];
			if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
				if (context) iterator = _.bind(iterator, context);
				return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
			}
			var reversed = _.toArray(obj).reverse();
			if (context && !initial) iterator = _.bind(iterator, context);
			return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
		};

		// Return the first value which passes a truth test. Aliased as `detect`.
		_.find = _.detect = function(obj, iterator, context) {
			var result;
			any(obj, function(value, index, list) {
				if (iterator.call(context, value, index, list)) {
					result = value;
					return true;
				}
			});
			return result;
		};

		// Return all the elements that pass a truth test.
		// Delegates to **ECMAScript 5**'s native `filter` if available.
		// Aliased as `select`.
		_.filter = _.select = function(obj, iterator, context) {
			var results = [];
			if (obj == null) return results;
			if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
			each(obj, function(value, index, list) {
				if (iterator.call(context, value, index, list)) results[results.length] = value;
			});
			return results;
		};

		// Return all the elements for which a truth test fails.
		_.reject = function(obj, iterator, context) {
			var results = [];
			if (obj == null) return results;
			each(obj, function(value, index, list) {
				if (!iterator.call(context, value, index, list)) results[results.length] = value;
			});
			return results;
		};

		// Determine whether all of the elements match a truth test.
		// Delegates to **ECMAScript 5**'s native `every` if available.
		// Aliased as `all`.
		_.every = _.all = function(obj, iterator, context) {
			var result = true;
			if (obj == null) return result;
			if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
			each(obj, function(value, index, list) {
				if (!(result = result && iterator.call(context, value, index, list))) return breaker;
			});
			return !!result;
		};

		// Determine if at least one element in the object matches a truth test.
		// Delegates to **ECMAScript 5**'s native `some` if available.
		// Aliased as `any`.
		var any = _.some = _.any = function(obj, iterator, context) {
			iterator || (iterator = _.identity);
			var result = false;
			if (obj == null) return result;
			if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
			each(obj, function(value, index, list) {
				if (result || (result = iterator.call(context, value, index, list))) return breaker;
			});
			return !!result;
		};

		// Determine if a given value is included in the array or object using `===`.
		// Aliased as `contains`.
		_.include = _.contains = function(obj, target) {
			var found = false;
			if (obj == null) return found;
			if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
			found = any(obj, function(value) {
				return value === target;
			});
			return found;
		};

		// Invoke a method (with arguments) on every item in a collection.
		_.invoke = function(obj, method) {
			var args = slice.call(arguments, 2);
			return _.map(obj, function(value) {
				return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
			});
		};

		// Convenience version of a common use case of `map`: fetching a property.
		_.pluck = function(obj, key) {
			return _.map(obj, function(value){ return value[key]; });
		};

		// Return the maximum element or (element-based computation).
		_.max = function(obj, iterator, context) {
			if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.max.apply(Math, obj);
			if (!iterator && _.isEmpty(obj)) return -Infinity;
			var result = {computed : -Infinity};
			each(obj, function(value, index, list) {
				var computed = iterator ? iterator.call(context, value, index, list) : value;
				computed >= result.computed && (result = {value : value, computed : computed});
			});
			return result.value;
		};

		// Return the minimum element (or element-based computation).
		_.min = function(obj, iterator, context) {
			if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.min.apply(Math, obj);
			if (!iterator && _.isEmpty(obj)) return Infinity;
			var result = {computed : Infinity};
			each(obj, function(value, index, list) {
				var computed = iterator ? iterator.call(context, value, index, list) : value;
				computed < result.computed && (result = {value : value, computed : computed});
			});
			return result.value;
		};

		// Shuffle an array.
		_.shuffle = function(obj) {
			var shuffled = [], rand;
			each(obj, function(value, index, list) {
				rand = Math.floor(Math.random() * (index + 1));
				shuffled[index] = shuffled[rand];
				shuffled[rand] = value;
			});
			return shuffled;
		};

		// Sort the object's values by a criterion produced by an iterator.
		_.sortBy = function(obj, val, context) {
			var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
			return _.pluck(_.map(obj, function(value, index, list) {
				return {
					value : value,
					criteria : iterator.call(context, value, index, list)
				};
			}).sort(function(left, right) {
					var a = left.criteria, b = right.criteria;
					if (a === void 0) return 1;
					if (b === void 0) return -1;
					return a < b ? -1 : a > b ? 1 : 0;
				}), 'value');
		};

		// Groups the object's values by a criterion. Pass either a string attribute
		// to group by, or a function that returns the criterion.
		_.groupBy = function(obj, val) {
			var result = {};
			var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
			each(obj, function(value, index) {
				var key = iterator(value, index);
				(result[key] || (result[key] = [])).push(value);
			});
			return result;
		};

		// Use a comparator function to figure out at what index an object should
		// be inserted so as to maintain order. Uses binary search.
		_.sortedIndex = function(array, obj, iterator) {
			iterator || (iterator = _.identity);
			var low = 0, high = array.length;
			while (low < high) {
				var mid = (low + high) >> 1;
				iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
			}
			return low;
		};

		// Safely convert anything iterable into a real, live array.
		_.toArray = function(obj) {
			if (!obj)                                     return [];
			if (_.isArray(obj))                           return slice.call(obj);
			if (_.isArguments(obj))                       return slice.call(obj);
			if (obj.toArray && _.isFunction(obj.toArray)) return obj.toArray();
			return _.values(obj);
		};

		// Return the number of elements in an object.
		_.size = function(obj) {
			return _.isArray(obj) ? obj.length : _.keys(obj).length;
		};

		// Array Functions
		// ---------------

		// Get the first element of an array. Passing **n** will return the first N
		// values in the array. Aliased as `head` and `take`. The **guard** check
		// allows it to work with `_.map`.
		_.first = _.head = _.take = function(array, n, guard) {
			return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
		};

		// Returns everything but the last entry of the array. Especcialy useful on
		// the arguments object. Passing **n** will return all the values in
		// the array, excluding the last N. The **guard** check allows it to work with
		// `_.map`.
		_.initial = function(array, n, guard) {
			return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
		};

		// Get the last element of an array. Passing **n** will return the last N
		// values in the array. The **guard** check allows it to work with `_.map`.
		_.last = function(array, n, guard) {
			if ((n != null) && !guard) {
				return slice.call(array, Math.max(array.length - n, 0));
			} else {
				return array[array.length - 1];
			}
		};

		// Returns everything but the first entry of the array. Aliased as `tail`.
		// Especially useful on the arguments object. Passing an **index** will return
		// the rest of the values in the array from that index onward. The **guard**
		// check allows it to work with `_.map`.
		_.rest = _.tail = function(array, index, guard) {
			return slice.call(array, (index == null) || guard ? 1 : index);
		};

		// Trim out all falsy values from an array.
		_.compact = function(array) {
			return _.filter(array, function(value){ return !!value; });
		};

		// Return a completely flattened version of an array.
		_.flatten = function(array, shallow) {
			return _.reduce(array, function(memo, value) {
				if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
				memo[memo.length] = value;
				return memo;
			}, []);
		};

		// Return a version of the array that does not contain the specified value(s).
		_.without = function(array) {
			return _.difference(array, slice.call(arguments, 1));
		};

		// Produce a duplicate-free version of the array. If the array has already
		// been sorted, you have the option of using a faster algorithm.
		// Aliased as `unique`.
		_.uniq = _.unique = function(array, isSorted, iterator) {
			var initial = iterator ? _.map(array, iterator) : array;
			var results = [];
			// The `isSorted` flag is irrelevant if the array only contains two elements.
			if (array.length < 3) isSorted = true;
			_.reduce(initial, function (memo, value, index) {
				if (isSorted ? _.last(memo) !== value || !memo.length : !_.include(memo, value)) {
					memo.push(value);
					results.push(array[index]);
				}
				return memo;
			}, []);
			return results;
		};

		// Produce an array that contains the union: each distinct element from all of
		// the passed-in arrays.
		_.union = function() {
			return _.uniq(_.flatten(arguments, true));
		};

		// Produce an array that contains every item shared between all the
		// passed-in arrays. (Aliased as "intersect" for back-compat.)
		_.intersection = _.intersect = function(array) {
			var rest = slice.call(arguments, 1);
			return _.filter(_.uniq(array), function(item) {
				return _.every(rest, function(other) {
					return _.indexOf(other, item) >= 0;
				});
			});
		};

		// Take the difference between one array and a number of other arrays.
		// Only the elements present in just the first array will remain.
		_.difference = function(array) {
			var rest = _.flatten(slice.call(arguments, 1), true);
			return _.filter(array, function(value){ return !_.include(rest, value); });
		};

		// Zip together multiple lists into a single array -- elements that share
		// an index go together.
		_.zip = function() {
			var args = slice.call(arguments);
			var length = _.max(_.pluck(args, 'length'));
			var results = new Array(length);
			for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
			return results;
		};

		// If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
		// we need this function. Return the position of the first occurrence of an
		// item in an array, or -1 if the item is not included in the array.
		// Delegates to **ECMAScript 5**'s native `indexOf` if available.
		// If the array is large and already in sort order, pass `true`
		// for **isSorted** to use binary search.
		_.indexOf = function(array, item, isSorted) {
			if (array == null) return -1;
			var i, l;
			if (isSorted) {
				i = _.sortedIndex(array, item);
				return array[i] === item ? i : -1;
			}
			if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
			for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
			return -1;
		};

		// Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
		_.lastIndexOf = function(array, item) {
			if (array == null) return -1;
			if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
			var i = array.length;
			while (i--) if (i in array && array[i] === item) return i;
			return -1;
		};

		// Generate an integer Array containing an arithmetic progression. A port of
		// the native Python `range()` function. See
		// [the Python documentation](http://docs.python.org/library/functions.html#range).
		_.range = function(start, stop, step) {
			if (arguments.length <= 1) {
				stop = start || 0;
				start = 0;
			}
			step = arguments[2] || 1;

			var len = Math.max(Math.ceil((stop - start) / step), 0);
			var idx = 0;
			var range = new Array(len);

			while(idx < len) {
				range[idx++] = start;
				start += step;
			}

			return range;
		};

		// Function (ahem) Functions
		// ------------------

		// Reusable constructor function for prototype setting.
		var ctor = function(){};

		// Create a function bound to a given object (assigning `this`, and arguments,
		// optionally). Binding with arguments is also known as `curry`.
		// Delegates to **ECMAScript 5**'s native `Function.bind` if available.
		// We check for `func.bind` first, to fail fast when `func` is undefined.
		_.bind = function bind(func, context) {
			var bound, args;
			if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
			if (!_.isFunction(func)) throw new TypeError;
			args = slice.call(arguments, 2);
			return bound = function() {
				if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
				ctor.prototype = func.prototype;
				var self = new ctor;
				var result = func.apply(self, args.concat(slice.call(arguments)));
				if (Object(result) === result) return result;
				return self;
			};
		};

		// Bind all of an object's methods to that object. Useful for ensuring that
		// all callbacks defined on an object belong to it.
		_.bindAll = function(obj) {
			var funcs = slice.call(arguments, 1);
			if (funcs.length == 0) funcs = _.functions(obj);
			each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
			return obj;
		};

		// Memoize an expensive function by storing its results.
		_.memoize = function(func, hasher) {
			var memo = {};
			hasher || (hasher = _.identity);
			return function() {
				var key = hasher.apply(this, arguments);
				return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
			};
		};

		// Delays a function for the given number of milliseconds, and then calls
		// it with the arguments supplied.
		_.delay = function(func, wait) {
			var args = slice.call(arguments, 2);
			return setTimeout(function(){ return func.apply(null, args); }, wait);
		};

		// Defers a function, scheduling it to run after the current call stack has
		// cleared.
		_.defer = function(func) {
			return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
		};

		// Returns a function, that, when invoked, will only be triggered at most once
		// during a given window of time.
		_.throttle = function(func, wait) {
			var context, args, timeout, throttling, more, result;
			var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
			return function() {
				context = this; args = arguments;
				var later = function() {
					timeout = null;
					if (more) func.apply(context, args);
					whenDone();
				};
				if (!timeout) timeout = setTimeout(later, wait);
				if (throttling) {
					more = true;
				} else {
					result = func.apply(context, args);
				}
				whenDone();
				throttling = true;
				return result;
			};
		};

		// Returns a function, that, as long as it continues to be invoked, will not
		// be triggered. The function will be called after it stops being called for
		// N milliseconds. If `immediate` is passed, trigger the function on the
		// leading edge, instead of the trailing.
		_.debounce = function(func, wait, immediate) {
			var timeout;
			return function() {
				var context = this, args = arguments;
				var later = function() {
					timeout = null;
					if (!immediate) func.apply(context, args);
				};
				if (immediate && !timeout) func.apply(context, args);
				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
			};
		};

		// Returns a function that will be executed at most one time, no matter how
		// often you call it. Useful for lazy initialization.
		_.once = function(func) {
			var ran = false, memo;
			return function() {
				if (ran) return memo;
				ran = true;
				return memo = func.apply(this, arguments);
			};
		};

		// Returns the first function passed as an argument to the second,
		// allowing you to adjust arguments, run code before and after, and
		// conditionally execute the original function.
		_.wrap = function(func, wrapper) {
			return function() {
				var args = [func].concat(slice.call(arguments, 0));
				return wrapper.apply(this, args);
			};
		};

		// Returns a function that is the composition of a list of functions, each
		// consuming the return value of the function that follows.
		_.compose = function() {
			var funcs = arguments;
			return function() {
				var args = arguments;
				for (var i = funcs.length - 1; i >= 0; i--) {
					args = [funcs[i].apply(this, args)];
				}
				return args[0];
			};
		};

		// Returns a function that will only be executed after being called N times.
		_.after = function(times, func) {
			if (times <= 0) return func();
			return function() {
				if (--times < 1) { return func.apply(this, arguments); }
			};
		};

		// Object Functions
		// ----------------

		// Retrieve the names of an object's properties.
		// Delegates to **ECMAScript 5**'s native `Object.keys`
		_.keys = nativeKeys || function(obj) {
			if (obj !== Object(obj)) throw new TypeError('Invalid object');
			var keys = [];
			for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
			return keys;
		};

		// Retrieve the values of an object's properties.
		_.values = function(obj) {
			return _.map(obj, _.identity);
		};

		// Return a sorted list of the function names available on the object.
		// Aliased as `methods`
		_.functions = _.methods = function(obj) {
			var names = [];
			for (var key in obj) {
				if (_.isFunction(obj[key])) names.push(key);
			}
			return names.sort();
		};

		// Extend a given object with all the properties in passed-in object(s).
		_.extend = function(obj) {
			each(slice.call(arguments, 1), function(source) {
				for (var prop in source) {
					obj[prop] = source[prop];
				}
			});
			return obj;
		};

		// Return a copy of the object only containing the whitelisted properties.
		_.pick = function(obj) {
			var result = {};
			each(_.flatten(slice.call(arguments, 1)), function(key) {
				if (key in obj) result[key] = obj[key];
			});
			return result;
		};

		// Fill in a given object with default properties.
		_.defaults = function(obj) {
			each(slice.call(arguments, 1), function(source) {
				for (var prop in source) {
					if (obj[prop] == null) obj[prop] = source[prop];
				}
			});
			return obj;
		};

		// Create a (shallow-cloned) duplicate of an object.
		_.clone = function(obj) {
			if (!_.isObject(obj)) return obj;
			return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
		};

		// Invokes interceptor with the obj, and then returns obj.
		// The primary purpose of this method is to "tap into" a method chain, in
		// order to perform operations on intermediate results within the chain.
		_.tap = function(obj, interceptor) {
			interceptor(obj);
			return obj;
		};

		// Internal recursive comparison function.
		function eq(a, b, stack) {
			// Identical objects are equal. `0 === -0`, but they aren't identical.
			// See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
			if (a === b) return a !== 0 || 1 / a == 1 / b;
			// A strict comparison is necessary because `null == undefined`.
			if (a == null || b == null) return a === b;
			// Unwrap any wrapped objects.
			if (a._chain) a = a._wrapped;
			if (b._chain) b = b._wrapped;
			// Invoke a custom `isEqual` method if one is provided.
			if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
			if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
			// Compare `[[Class]]` names.
			var className = toString.call(a);
			if (className != toString.call(b)) return false;
			switch (className) {
				// Strings, numbers, dates, and booleans are compared by value.
				case '[object String]':
					// Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
					// equivalent to `new String("5")`.
					return a == String(b);
				case '[object Number]':
					// `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
					// other numeric values.
					return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
				case '[object Date]':
				case '[object Boolean]':
					// Coerce dates and booleans to numeric primitive values. Dates are compared by their
					// millisecond representations. Note that invalid dates with millisecond representations
					// of `NaN` are not equivalent.
					return +a == +b;
				// RegExps are compared by their source patterns and flags.
				case '[object RegExp]':
					return a.source == b.source &&
						a.global == b.global &&
						a.multiline == b.multiline &&
						a.ignoreCase == b.ignoreCase;
			}
			if (typeof a != 'object' || typeof b != 'object') return false;
			// Assume equality for cyclic structures. The algorithm for detecting cyclic
			// structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
			var length = stack.length;
			while (length--) {
				// Linear search. Performance is inversely proportional to the number of
				// unique nested structures.
				if (stack[length] == a) return true;
			}
			// Add the first object to the stack of traversed objects.
			stack.push(a);
			var size = 0, result = true;
			// Recursively compare objects and arrays.
			if (className == '[object Array]') {
				// Compare array lengths to determine if a deep comparison is necessary.
				size = a.length;
				result = size == b.length;
				if (result) {
					// Deep compare the contents, ignoring non-numeric properties.
					while (size--) {
						// Ensure commutative equality for sparse arrays.
						if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
					}
				}
			} else {
				// Objects with different constructors are not equivalent.
				if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
				// Deep compare objects.
				for (var key in a) {
					if (_.has(a, key)) {
						// Count the expected number of properties.
						size++;
						// Deep compare each member.
						if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
					}
				}
				// Ensure that both objects contain the same number of properties.
				if (result) {
					for (key in b) {
						if (_.has(b, key) && !(size--)) break;
					}
					result = !size;
				}
			}
			// Remove the first object from the stack of traversed objects.
			stack.pop();
			return result;
		}

		// Perform a deep comparison to check if two objects are equal.
		_.isEqual = function(a, b) {
			return eq(a, b, []);
		};

		// Is a given array, string, or object empty?
		// An "empty" object has no enumerable own-properties.
		_.isEmpty = function(obj) {
			if (obj == null) return true;
			if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
			for (var key in obj) if (_.has(obj, key)) return false;
			return true;
		};

		// Is a given value a DOM element?
		_.isElement = function(obj) {
			return !!(obj && obj.nodeType == 1);
		};

		// Is a given value an array?
		// Delegates to ECMA5's native Array.isArray
		_.isArray = nativeIsArray || function(obj) {
			return toString.call(obj) == '[object Array]';
		};

		// Is a given variable an object?
		_.isObject = function(obj) {
			return obj === Object(obj);
		};

		// Is a given variable an arguments object?
		_.isArguments = function(obj) {
			return toString.call(obj) == '[object Arguments]';
		};
		if (!_.isArguments(arguments)) {
			_.isArguments = function(obj) {
				return !!(obj && _.has(obj, 'callee'));
			};
		}

		// Is a given value a function?
		_.isFunction = function(obj) {
			return toString.call(obj) == '[object Function]';
		};

		// Is a given value a string?
		_.isString = function(obj) {
			return toString.call(obj) == '[object String]';
		};

		// Is a given value a number?
		_.isNumber = function(obj) {
			return toString.call(obj) == '[object Number]';
		};

		// Is a given object a finite number?
		_.isFinite = function(obj) {
			return _.isNumber(obj) && isFinite(obj);
		};

		// Is the given value `NaN`?
		_.isNaN = function(obj) {
			// `NaN` is the only value for which `===` is not reflexive.
			return obj !== obj;
		};

		// Is a given value a boolean?
		_.isBoolean = function(obj) {
			return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
		};

		// Is a given value a date?
		_.isDate = function(obj) {
			return toString.call(obj) == '[object Date]';
		};

		// Is the given value a regular expression?
		_.isRegExp = function(obj) {
			return toString.call(obj) == '[object RegExp]';
		};

		// Is a given value equal to null?
		_.isNull = function(obj) {
			return obj === null;
		};

		// Is a given variable undefined?
		_.isUndefined = function(obj) {
			return obj === void 0;
		};

		// Has own property?
		_.has = function(obj, key) {
			return hasOwnProperty.call(obj, key);
		};

		// Utility Functions
		// -----------------

		// Run Underscore.js in *noConflict* mode, returning the `_` variable to its
		// previous owner. Returns a reference to the Underscore object.
		_.noConflict = function() {
			root._ = previousUnderscore;
			return this;
		};

		// Keep the identity function around for default iterators.
		_.identity = function(value) {
			return value;
		};

		// Run a function **n** times.
		_.times = function (n, iterator, context) {
			for (var i = 0; i < n; i++) iterator.call(context, i);
		};

		// Escape a string for HTML interpolation.
		_.escape = function(string) {
			return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
		};

		// If the value of the named property is a function then invoke it;
		// otherwise, return it.
		_.result = function(object, property) {
			if (object == null) return null;
			var value = object[property];
			return _.isFunction(value) ? value.call(object) : value;
		};

		// Add your own custom functions to the Underscore object, ensuring that
		// they're correctly added to the OOP wrapper as well.
		_.mixin = function(obj) {
			each(_.functions(obj), function(name){
				addToWrapper(name, _[name] = obj[name]);
			});
		};

		// Generate a unique integer id (unique within the entire client session).
		// Useful for temporary DOM ids.
		var idCounter = 0;
		_.uniqueId = function(prefix) {
			var id = idCounter++;
			return prefix ? prefix + id : id;
		};

		// By default, Underscore uses ERB-style template delimiters, change the
		// following template settings to use alternative delimiters.
		_.templateSettings = {
			evaluate    : /<%([\s\S]+?)%>/g,
			interpolate : /<%=([\s\S]+?)%>/g,
			escape      : /<%-([\s\S]+?)%>/g
		};

		// When customizing `templateSettings`, if you don't want to define an
		// interpolation, evaluation or escaping regex, we need one that is
		// guaranteed not to match.
		var noMatch = /.^/;

		// Certain characters need to be escaped so that they can be put into a
		// string literal.
		var escapes = {
			'\\': '\\',
			"'": "'",
			'r': '\r',
			'n': '\n',
			't': '\t',
			'u2028': '\u2028',
			'u2029': '\u2029'
		};

		for (var p in escapes) escapes[escapes[p]] = p;
		var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
		var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

		// Within an interpolation, evaluation, or escaping, remove HTML escaping
		// that had been previously added.
		var unescape = function(code) {
			return code.replace(unescaper, function(match, escape) {
				return escapes[escape];
			});
		};

		// JavaScript micro-templating, similar to John Resig's implementation.
		// Underscore templating handles arbitrary delimiters, preserves whitespace,
		// and correctly escapes quotes within interpolated code.
		_.template = function(text, data, settings) {
			settings = _.defaults(settings || {}, _.templateSettings);

			// Compile the template source, taking care to escape characters that
			// cannot be included in a string literal and then unescape them in code
			// blocks.
			var source = "__p+='" + text
				.replace(escaper, function(match) {
					return '\\' + escapes[match];
				})
				.replace(settings.escape || noMatch, function(match, code) {
					return "'+\n_.escape(" + unescape(code) + ")+\n'";
				})
				.replace(settings.interpolate || noMatch, function(match, code) {
					return "'+\n(" + unescape(code) + ")+\n'";
				})
				.replace(settings.evaluate || noMatch, function(match, code) {
					return "';\n" + unescape(code) + "\n;__p+='";
				}) + "';\n";

			// If a variable is not specified, place data values in local scope.
			if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

			source = "var __p='';" +
				"var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" +
				source + "return __p;\n";

			var render = new Function(settings.variable || 'obj', '_', source);
			if (data) return render(data, _);
			var template = function(data) {
				return render.call(this, data, _);
			};

			// Provide the compiled function source as a convenience for build time
			// precompilation.
			template.source = 'function(' + (settings.variable || 'obj') + '){\n' +
				source + '}';

			return template;
		};

		// Add a "chain" function, which will delegate to the wrapper.
		_.chain = function(obj) {
			return _(obj).chain();
		};

		// The OOP Wrapper
		// ---------------

		// If Underscore is called as a function, it returns a wrapped object that
		// can be used OO-style. This wrapper holds altered versions of all the
		// underscore functions. Wrapped objects may be chained.
		var wrapper = function(obj) { this._wrapped = obj; };

		// Expose `wrapper.prototype` as `_.prototype`
		_.prototype = wrapper.prototype;

		// Helper function to continue chaining intermediate results.
		var result = function(obj, chain) {
			return chain ? _(obj).chain() : obj;
		};

		// A method to easily add functions to the OOP wrapper.
		var addToWrapper = function(name, func) {
			wrapper.prototype[name] = function() {
				var args = slice.call(arguments);
				unshift.call(args, this._wrapped);
				return result(func.apply(_, args), this._chain);
			};
		};

		// Add all of the Underscore functions to the wrapper object.
		_.mixin(_);

		// Add all mutator Array functions to the wrapper.
		each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
			var method = ArrayProto[name];
			wrapper.prototype[name] = function() {
				var wrapped = this._wrapped;
				method.apply(wrapped, arguments);
				var length = wrapped.length;
				if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
				return result(wrapped, this._chain);
			};
		});

		// Add all accessor Array functions to the wrapper.
		each(['concat', 'join', 'slice'], function(name) {
			var method = ArrayProto[name];
			wrapper.prototype[name] = function() {
				return result(method.apply(this._wrapped, arguments), this._chain);
			};
		});

		// Start chaining a wrapped Underscore object.
		wrapper.prototype.chain = function() {
			this._chain = true;
			return this;
		};

		// Extracts the result from a wrapped and chained object.
		wrapper.prototype.value = function() {
			return this._wrapped;
		};

	}).call(this);

});

require.define("/lib/topogrid/mixins",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */

	/* ********* EXPORTS ******** */

	var mixin = {

		_width:  0,
		_height: 0,

		clone: function (cb) {
			var TopoGrid = require('./../TopoGrid');
			TopoGrid({}, {source: this.data.slice(0), source_type: 'array', width: this._width, height: this._height}, cb);
		},

		orth_distance: function (x, y, x2, y2) {
			return Math.abs(x - x2) + Math.abs(y - y2);
		},

		distance: function (x, y, x2, y2) {
			var xd = x - x2, yd = y - y2;
			return Math.sqrt(xd * xd + yd * yd);
		},

		neighbors: require('./neighbors'),

		neighbor_values: function (x, y, r, asInt) {
			var out = this.neighbors(x, y, r);
			out = _.pluck(out, 'value');
			return asInt ? _.map(out, Math.round) : out;
		},

		compress_to_greyscale: require('./compress_to_greyscale'),

		filter: require('./filter'),

		combine: require('./combine')

	}; // end exports

	_.extend(mixin, require('./xy_mixins'));

	_.extend(mixin, require('./digest_mixins'));

	module.exports = mixin;
});

require.define("/lib/topogrid/neighbors",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */

	/* ********* EXPORTS ******** */

	module.exports = function (x, y, r, ring) {
		var self = this;
		//	console.log('neighbors: %s, %s, - %s', x, y, r);
		var value = this.value(x,y);

		var out = _.compact(_.flatten(_.map(_.range(y- r, y + r + 1), function (y_value) {
			return _.map(_.range(x - r, x + r + 1), function (x_value) {
				if (self.xy_good(x_value, y_value)) {

					var xy_value = self.value(x_value, y_value);

					if (_DEBUG) console.log('sampling %s, %s', x_value, y_value)
					var out =  {x:         x_value, y: y_value,
						distance:      self.distance(x, y, x_value, y_value),
						orth_distance: self.orth_distance(x, y, x_value, y_value),
						x_offset:      x_value - x,
						y_offset:      y_value - y,
						value:         xy_value
					}

					if (_.isNumber(xy_value) && _.isNumber(value)){
						out.rise =  xy_value - value
					}

					return out;

				} else {
					if (_DEBUG) console.log('skipping %s, %s - bad', x_value, y_value)
					return false;
				}
			})
		})));

		if (ring) {
			if (_DEBUG) console.log('removing center of %s member ring', out.length);

			out = _.filter(out, function (data) {
				var abs_x_offset = Math.abs(data.x_offset);
				if (abs_x_offset == r){
					if (_DEBUG)  console.log('abs_x_offset %s == %s', abs_x_offset, r);
					return true;
				}

				var abs_y_offset = Math.abs(data.y_offset);
				if (abs_y_offset == r){
					if (_DEBUG)  console.log('abs_y_offset %s == %s', abs_y_offset, r);
					return true;
				}

				if (_DEBUG) console.log('rejecting %s, %s', data.x, data.y);
				return false;
			})
			if (_DEBUG) console.log('.. to %s members', out.length);
		}

		if (_DEBUG == 2){
			console.log('neighbor output: %s', util.inspect(out));
		}
		return out;
	}
});

require.define("/lib/topogrid/compress_to_greyscale",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */

	/* ********* EXPORTS ******** */

	module.exports = function (method) {
		var _compressor;
		if (_.isFunction(method)) {
			_compressor = method;
		} else if (_.isArray(method)) {
			_compressor = function (value) {
				if (value <= 0) {
					value = 0;
				} else if (value >= method.length) {
					value = method.length - 1;
				} else {
					value = Math.floor(method);
				}
				return method[value];
			}
		} else {
			switch (method) {
				case 'r':
					_compressor = function (value) {
						return value[0];
					}
					break;
				case 'g':
					_compressor = function (value) {
						return value[1];
					}
					break;
				case 'b':
					_compressor = function (value) {
						return value[2];
					}
					break;
				case 'a':
					_compressor = function (value) {
						return value[3];
					}
					break;

				case 'avg':

				default:
					_compressor = function (value) {
						return (value[0] + value[1] + value[2]) / 3;
					}
			}
		}
		if (_DEBUG) console.log('values in: %s', util.inspect(this.data));
		this.data = _.map(this.data, _compressor);
		if (_DEBUG) console.log('values out: %s', util.inspect(this.data));
	}
});

require.define("/lib/topogrid/filter",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */

	/* ********* EXPORTS ******** */

	module.exports = function (cb, r_function, clone) {
		var data;
		if (_.isArray(r_function)) {
			data = _.map(this.data, function (value) {
				if (value > r_function.length) return null;
				return r_function[value];
			}, this);
		} else {
			r_function = _.bind(r_function, this);
			data = _.map(this.data, function (value, index) {
				//		console.log('mapping %s, %s,', value, index);
				var xy = this.deindex(index);
				return r_function(value, xy[0], xy[1]);
			}, this);
			//	console.log('cloned data: %s', util.inspect(data));
		}

		if (clone) {
			this.clone(function (err, topo) {
				topo.data = data;
				cb(null, topo);
			})
		} else {
			this.data = data;
			cb(null, this);
		}

	}
});

require.define("/lib/topogrid/combine",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */
	var combines = 0;

	/* ********* EXPORTS ******** */

	module.exports = function (cb, other_topo, combiner_filter, clone) {
		if (!_.isFunction(combiner_filter)){
			throw new Error(util.format(
				'bad combiner_filter: %s', util.inspect(combiner_filter)));
		}
		var c = ++combines;
		if (_DEBUG) console.log('starting combine %s: %s (%s)', c, combiner_filter.toString(), clone ? "clone" : 'alter');

		function done(){
			if (_DEBUG) console.log('done with combine %s', c);
			cb(null, this);
		}
		done = _.bind(done, this);
		if (clone){
			this.clone(function(err, new_this){
				new_this.combine(function(){
					cb(null, new_this);
				}, other_topo, combiner_filter);
			})
		} else {
			combiner_filter = _.bind(combiner_filter, this);
			var new_data = _.map(this.data, function(value, index){

				var combiner_value = other_topo.data[index];
				var xy = this.deindex(index);

				return combiner_filter(value, combiner_value, xy[0], xy[1]);

			}, this);
			if (_DEBUG) console.log('new data: %s', util.inspect(new_data));
			this.data = new_data;
			done();
		}
	}; // end export function
});

require.define("/lib/topogrid/xy_mixins",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;

	/* ************************************
	 * Basic coordiante, i/o for values
	 * ************************************ */

	/* ******* CLOSURE ********* */

	/* ********* EXPORTS ******** */

	module.exports = {

		xy: function (x, y) {
			if (_.isArray(x)) {
				y = x[1];
				x = x[0];
			}
			x = parseInt(x);
			y = parseInt(y);

			if (!this.xy_good(x, y)) throw new Error('bad XY ' + x + ',' + y);
			var w = this._width;
			return y * w + x;
		},

		deindex: function (index) {
			var y = Math.floor(index / this._width);
			var x = index % this._width;
			return [x, y]
		},

		xy_good: function (x, y) {
			return ((x >= 0) && (y >= 0) && (x < this._width) && (y < this._height));
		},

		value: function (x, y) {
			if (_.isArray(x)) {
				y = x[1];
				x = x[0];
			}
			var index = this.xy(x, y);
			if (_DEBUG) console.log('x/y: %s, %s, index: %s', x, y, index);
			return this.data[index];
		}

	} // end exports
});

require.define("/lib/topogrid/digest_mixins",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');
	var fs = require('fs');
	var _DEBUG = false;

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */

	/* ********* EXPORTS ******** */

	module.exports = {


		digest_canvas: function (canvas, cb) {
				console.log('digesting canvas');

			this.canvas_to_data(canvas);

			if (cb) cb();
		},

		data_to_canvas: function (canvas) {
			this._width = canvas.width;
			this._height = canvas.height;
			var id = canvas.getContext('2d').getImageData(0, 0, this._width, this._height);
			var image_data = id.data;
			var flat_data = _.flatten(this.data);
			_.each(image_data, function (v, i) {
				id.data[i] = flat_data[i];
			}, this);
			canvas.getContext('2d').putImageData(id, 0, 0);
		},

		canvas_to_data: function (canvas) {
			this._width = canvas.width;
			this._height = canvas.height;
			var image_data = canvas.getContext('2d').getImageData(0, 0, this._width, this._height).data;
			this.data = _.reduce(image_data, function (out, value, i) {
				var target_index = Math.floor(i / 4);
				var channel = i % 4;

				if (channel == 0) {
					out[target_index] = [value];
				} else {
					out[target_index].push(value);
				}
				return out;

			}, []);

		},

		digest: function (cb) {
			var st = this.get_config('source_type');
			var src = this.get_config('source');
           console.log('digesting: source type ', st);
			if ((src && st ) && this['digest_' + st]) {
				this['digest_' + st](src, cb)
			} else {
				throw new Error('cannot digest ' + st);
			}
		},

		digest_array: function (array, cb) {

			this.data = this.get_config('source');
			if (this.get_config('width')) {
				this._width = this.get_config('width');
			}
			if (this.get_config('height')) {
				this._height = this.get_config('height');
			}
			cb();
		},

		digest_function: function (fn, cb) {
			this._width = this.get_config('width');
			this._height = this.get_config('height');
			var array_size = this._width * this._height;
			var fnb = _.bind(fn, this);
			this.data = _.map(_.range(0, array_size),
				function (index) {
					var xy = this.deindex(index);
					return fnb(xy[0], xy[1]);
				}, this);

			cb();
		}
	}; // end exports
});

require.define("/lib/topogrid/config",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */

	function _digest(cb) {
		this.digest(cb);
	}
	/* ********* EXPORTS ******** */

	module.exports = {
		init_tasks:        [_digest],
		source:             null, // the source of the color data
		source_type:        'none', // the type of data the source is
		elevations:         _.range(0, 255 * 3), // an array that maps intensity to world units
		distance_per_pixel: 1, // the number of world units wide each pixel is
		intensities:        [], // the color matrix of the input
		heights:            [] // the translated heights of the matrix
	} // end exports
});

require.define("/lib/filters/shadow",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */

	/* ********* EXPORTS ******** */

	module.exports = function (params) {

		_.defaults(params, {distance: 1, rise: 1.5,  fade: 1.25, post_filter: false});
		if (_DEBUG)	console.log('params: %s', util.inspect(params));

		return function (value, x, y) {
			var pix_distance = 0;
			var shade = 0;
			while (x && y) {
				--x; --y;
				++pix_distance;
				var rise = this.value(x, y) - value;
				if (rise > 0){
					var run = (pix_distance * params.distance);
					var overhang = (rise - run);
					var denom = params.distance * Math.pow(2, pix_distance * params.fade);
					var new_shade = overhang/denom;

					if (_DEBUG )	console.log('rise: %s, run: %s, overhang: %s, denom: %s, pix_distance: %s, new_shace: %s',
						rise, run, overhang,
						denom.toFixed(2), pix_distance, new_shade.toFixed(3));
					shade = Math.max(shade, new_shade);

				}
			}
			return Math.max(0, 1 - shade);
		}
	} // end export function
});

require.define("/lib/filters/ambient_occlusion",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */

	/* ********* EXPORTS ******** */

	module.exports = function (params) {

		_.defaults(params, {max_effect: 0.5, shine: 0.25, radius: 2});
		if (_DEBUG)    console.log('params: %s', util.inspect(params));

		return function (value, x, y) {
			var self = this;
			var net_offset = 0;

			_.each(_.range(1, params.radius), function (radius) {
				var ring = self.neighbors(x, y, radius);

				_.each(ring, function (data) {
					if (data.value > value){
						data.value -= value;
					} else {
						data.value = 0;
					}
					data.influence = 1 / (Math.pow(2, data.distance));
				});

				var weight = _.reduce(ring, function (out, data) {
					return out + data.influence;
				}, 0);

				if (_DEBUG) console.log('neighbor ring (%s, %s): %s',
					x, y, util.inspect(_.pluck(ring, 'value')));

				var offset = _.reduce(ring, function (out, data) {

					return out + data.value * data.influence;
				}, 0);

				net_offset -= offset/weight;

			});

			if (net_offset && _DEBUG){
				console.log('net offset at %s,%s(%s): %s', x, y, value, net_offset);
			}
			if (net_offset > 0) net_offset *= params.shine;
			return net_offset;
		};

	} // end export function
});

require.define("/lib/filters/aoi",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;
	var Vector3 = require('./../util/vector3');
	var cross_vector = require('./../util/cross_vector');

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */

	var i = 0;

	/* ********* EXPORTS ******** */

	function normal_map_gen(params) {

		var _params = _.extend({
			distance:    1,
			isGreyscale: false,
			light_x: -0.2,
			light_y: -0.2,
			light_z: 1,
			max_light: 2,
			light_scale: 255,
			gsMap:       _.range(0, 256)
		}, params || {});

		var light_normal = new Vector3(_params.light_x, _params.light_y, _params.light_z);

		return function (value, x, y) {
			try {

				var north_value = null, south_value = null;
				if(this.xy_good(x, y - 1)){
					north_value = this.value(x, y - 1);
				}

				if (this.xy_good(x, y + 1)){
					south_value = this.value(x, y + 1);
				}

				var east_value = null, west_value = null;

				if (this.xy_good(x - 1, y)){
					east_value = this.value(x - 1, y);
				} else {
					east_value = value;
				}
				if (this.xy_good(x + 1, y)){
					west_value = this.value(x + 1, y);
				} else {
					west_value = value;
				}

				var slope_normal = cross_vector(value, north_value, south_value, east_value, west_value, _params.distance);

				var angle = slope_normal.angleTo(light_normal); // angle ranges from 0 ... PI/2; realistically, in the 0.. PI/4 range

				if (_DEBUG) console.log('(%s, %s) slope: %s, angle: %s', x, y, util.inspect(slope_normal), angle)
				var lightness = Math.floor((Math.PI/2 - angle) * 255);

				return [lightness, lightness, lightness, 255];
			} catch(err){
				console.log('error: %s', util.inspect(err));
			}

		}

	} // end export function

	module.exports = normal_map_gen;
});

require.define("/lib/util/vector3",function(require,module,exports,__dirname,__filename,process,global){/**
 * @author mrdoob / http://mrdoob.com/
 * @author *kile / http://kile.stravaganza.org/
 * @author philogb / http://blog.thejit.org/
 * @author mikael emtinger / http://gomo.se/
 * @author egraether / http://egraether.com/
 * @author WestLangley / http://github.com/WestLangley
 */

Vector3 = function ( x, y, z ) {

	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;

};


	Vector3.prototype = {

		constructor: Vector3,

		set: function ( x, y, z ) {

			this.x = x;
			this.y = y;
			this.z = z;

			return this;

		},

		setX: function ( x ) {

			this.x = x;

			return this;

		},

		setY: function ( y ) {

			this.y = y;

			return this;

		},

		setZ: function ( z ) {

			this.z = z;

			return this;

		},

		setComponent: function ( index, value ) {

			switch ( index ) {

				case 0: this.x = value; break;
				case 1: this.y = value; break;
				case 2: this.z = value; break;
				default: throw new Error( "index is out of range: " + index );

			}

		},

		getComponent: function ( index ) {

			switch ( index ) {

				case 0: return this.x;
				case 1: return this.y;
				case 2: return this.z;
				default: throw new Error( "index is out of range: " + index );

			}

		},

		copy: function ( v ) {

			this.x = v.x;
			this.y = v.y;
			this.z = v.z;

			return this;

		},

		add: function ( v, w ) {

			if ( w !== undefined ) {

				console.warn( 'DEPRECATED: Vector3\'s .add() now only accepts one argument. Use .addVectors( a, b ) instead.' );
				return this.addVectors( v, w );

			}

			this.x += v.x;
			this.y += v.y;
			this.z += v.z;

			return this;

		},

		addScalar: function ( s ) {

			this.x += s;
			this.y += s;
			this.z += s;

			return this;

		},

		addVectors: function ( a, b ) {

			this.x = a.x + b.x;
			this.y = a.y + b.y;
			this.z = a.z + b.z;

			return this;

		},

		sub: function ( v, w ) {

			if ( w !== undefined ) {

				console.warn( 'DEPRECATED: Vector3\'s .sub() now only accepts one argument. Use .subVectors( a, b ) instead.' );
				return this.subVectors( v, w );

			}

			this.x -= v.x;
			this.y -= v.y;
			this.z -= v.z;

			return this;

		},

		subVectors: function ( a, b ) {

			this.x = a.x - b.x;
			this.y = a.y - b.y;
			this.z = a.z - b.z;

			return this;

		},

		multiply: function ( v, w ) {

			if ( w !== undefined ) {

				console.warn( 'DEPRECATED: Vector3\'s .multiply() now only accepts one argument. Use .multiplyVectors( a, b ) instead.' );
				return this.multiplyVectors( v, w );

			}

			this.x *= v.x;
			this.y *= v.y;
			this.z *= v.z;

			return this;

		},

		multiplyScalar: function ( s ) {

			this.x *= s;
			this.y *= s;
			this.z *= s;

			return this;

		},

		multiplyVectors: function ( a, b ) {

			this.x = a.x * b.x;
			this.y = a.y * b.y;
			this.z = a.z * b.z;

			return this;

		},

		applyMatrix3: function ( m ) {

			var x = this.x;
			var y = this.y;
			var z = this.z;

			var e = m.elements;

			this.x = e[0] * x + e[3] * y + e[6] * z;
			this.y = e[1] * x + e[4] * y + e[7] * z;
			this.z = e[2] * x + e[5] * y + e[8] * z;

			return this;

		},

		applyMatrix4: function ( m ) {

			// input: THREE.Matrix4 affine matrix

			var x = this.x, y = this.y, z = this.z;

			var e = m.elements;

			this.x = e[0] * x + e[4] * y + e[8]  * z + e[12];
			this.y = e[1] * x + e[5] * y + e[9]  * z + e[13];
			this.z = e[2] * x + e[6] * y + e[10] * z + e[14];

			return this;

		},

		applyProjection: function ( m ) {

			// input: THREE.Matrix4 projection matrix

			var x = this.x, y = this.y, z = this.z;

			var e = m.elements;
			var d = 1 / ( e[3] * x + e[7] * y + e[11] * z + e[15] ); // perspective divide

			this.x = ( e[0] * x + e[4] * y + e[8]  * z + e[12] ) * d;
			this.y = ( e[1] * x + e[5] * y + e[9]  * z + e[13] ) * d;
			this.z = ( e[2] * x + e[6] * y + e[10] * z + e[14] ) * d;

			return this;

		},

		applyQuaternion: function ( q ) {

			var x = this.x;
			var y = this.y;
			var z = this.z;

			var qx = q.x;
			var qy = q.y;
			var qz = q.z;
			var qw = q.w;

			// calculate quat * vector

			var ix =  qw * x + qy * z - qz * y;
			var iy =  qw * y + qz * x - qx * z;
			var iz =  qw * z + qx * y - qy * x;
			var iw = -qx * x - qy * y - qz * z;

			// calculate result * inverse quat

			this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
			this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
			this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;

			return this;

		},

		applyEuler: function ( v, eulerOrder ) {

			var quaternion = Vector3.__q1.setFromEuler( v, eulerOrder );

			this.applyQuaternion( quaternion );

			return this;

		},

		applyAxisAngle: function ( axis, angle ) {

			var quaternion = Vector3.__q1.setFromAxisAngle( axis, angle );

			this.applyQuaternion( quaternion );

			return this;

		},

		divide: function ( v ) {

			this.x /= v.x;
			this.y /= v.y;
			this.z /= v.z;

			return this;

		},

		divideScalar: function ( s ) {

			if ( s !== 0 ) {

				this.x /= s;
				this.y /= s;
				this.z /= s;

			} else {

				this.x = 0;
				this.y = 0;
				this.z = 0;

			}

			return this;

		},

		min: function ( v ) {

			if ( this.x > v.x ) {

				this.x = v.x;

			}

			if ( this.y > v.y ) {

				this.y = v.y;

			}

			if ( this.z > v.z ) {

				this.z = v.z;

			}

			return this;

		},

		max: function ( v ) {

			if ( this.x < v.x ) {

				this.x = v.x;

			}

			if ( this.y < v.y ) {

				this.y = v.y;

			}

			if ( this.z < v.z ) {

				this.z = v.z;

			}

			return this;

		},

		clamp: function ( min, max ) {

			// This function assumes min < max, if this assumption isn't true it will not operate correctly

			if ( this.x < min.x ) {

				this.x = min.x;

			} else if ( this.x > max.x ) {

				this.x = max.x;

			}

			if ( this.y < min.y ) {

				this.y = min.y;

			} else if ( this.y > max.y ) {

				this.y = max.y;

			}

			if ( this.z < min.z ) {

				this.z = min.z;

			} else if ( this.z > max.z ) {

				this.z = max.z;

			}

			return this;

		},

		negate: function() {

			return this.multiplyScalar( - 1 );

		},

		dot: function ( v ) {

			return this.x * v.x + this.y * v.y + this.z * v.z;

		},

		lengthSq: function () {

			return this.x * this.x + this.y * this.y + this.z * this.z;

		},

		length: function () {

			return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z );

		},

		lengthManhattan: function () {

			return Math.abs( this.x ) + Math.abs( this.y ) + Math.abs( this.z );

		},

		normalize: function () {

			return this.divideScalar( this.length() );

		},

		setLength: function ( l ) {

			var oldLength = this.length();

			if ( oldLength !== 0 && l !== oldLength  ) {

				this.multiplyScalar( l / oldLength );
			}

			return this;

		},

		lerp: function ( v, alpha ) {

			this.x += ( v.x - this.x ) * alpha;
			this.y += ( v.y - this.y ) * alpha;
			this.z += ( v.z - this.z ) * alpha;

			return this;

		},

		cross: function ( v, w ) {

			if ( w !== undefined ) {

				console.warn( 'DEPRECATED: Vector3\'s .cross() now only accepts one argument. Use .crossVectors( a, b ) instead.' );
				return this.crossVectors( v, w );

			}

			var x = this.x, y = this.y, z = this.z;

			this.x = y * v.z - z * v.y;
			this.y = z * v.x - x * v.z;
			this.z = x * v.y - y * v.x;

			return this;

		},

		crossVectors: function ( a, b ) {

			this.x = a.y * b.z - a.z * b.y;
			this.y = a.z * b.x - a.x * b.z;
			this.z = a.x * b.y - a.y * b.x;

			return this;

		},

		angleTo: function ( v ) {

			return Math.acos( this.dot( v ) / this.length() / v.length() );

		},

		distanceTo: function ( v ) {

			return Math.sqrt( this.distanceToSquared( v ) );

		},

		distanceToSquared: function ( v ) {

			var dx = this.x - v.x;
			var dy = this.y - v.y;
			var dz = this.z - v.z;

			return dx * dx + dy * dy + dz * dz;

		},

		getPositionFromMatrix: function ( m ) {

			this.x = m.elements[12];
			this.y = m.elements[13];
			this.z = m.elements[14];

			return this;

		},

		setEulerFromRotationMatrix: function ( m, order ) {

			// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

			// clamp, to handle numerical problems

			function clamp( x ) {

				return Math.min( Math.max( x, -1 ), 1 );

			}

			var te = m.elements;
			var m11 = te[0], m12 = te[4], m13 = te[8];
			var m21 = te[1], m22 = te[5], m23 = te[9];
			var m31 = te[2], m32 = te[6], m33 = te[10];

			if ( order === undefined || order === 'XYZ' ) {

				this.y = Math.asin( clamp( m13 ) );

				if ( Math.abs( m13 ) < 0.99999 ) {

					this.x = Math.atan2( - m23, m33 );
					this.z = Math.atan2( - m12, m11 );

				} else {

					this.x = Math.atan2( m32, m22 );
					this.z = 0;

				}

			} else if ( order === 'YXZ' ) {

				this.x = Math.asin( - clamp( m23 ) );

				if ( Math.abs( m23 ) < 0.99999 ) {

					this.y = Math.atan2( m13, m33 );
					this.z = Math.atan2( m21, m22 );

				} else {

					this.y = Math.atan2( - m31, m11 );
					this.z = 0;

				}

			} else if ( order === 'ZXY' ) {

				this.x = Math.asin( clamp( m32 ) );

				if ( Math.abs( m32 ) < 0.99999 ) {

					this.y = Math.atan2( - m31, m33 );
					this.z = Math.atan2( - m12, m22 );

				} else {

					this.y = 0;
					this.z = Math.atan2( m21, m11 );

				}

			} else if ( order === 'ZYX' ) {

				this.y = Math.asin( - clamp( m31 ) );

				if ( Math.abs( m31 ) < 0.99999 ) {

					this.x = Math.atan2( m32, m33 );
					this.z = Math.atan2( m21, m11 );

				} else {

					this.x = 0;
					this.z = Math.atan2( - m12, m22 );

				}

			} else if ( order === 'YZX' ) {

				this.z = Math.asin( clamp( m21 ) );

				if ( Math.abs( m21 ) < 0.99999 ) {

					this.x = Math.atan2( - m23, m22 );
					this.y = Math.atan2( - m31, m11 );

				} else {

					this.x = 0;
					this.y = Math.atan2( m13, m33 );

				}

			} else if ( order === 'XZY' ) {

				this.z = Math.asin( - clamp( m12 ) );

				if ( Math.abs( m12 ) < 0.99999 ) {

					this.x = Math.atan2( m32, m22 );
					this.y = Math.atan2( m13, m11 );

				} else {

					this.x = Math.atan2( - m23, m33 );
					this.y = 0;

				}

			}

			return this;

		},

		setEulerFromQuaternion: function ( q, order ) {

			// q is assumed to be normalized

			// clamp, to handle numerical problems

			function clamp( x ) {

				return Math.min( Math.max( x, -1 ), 1 );

			}

			// http://www.mathworks.com/matlabcentral/fileexchange/20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/content/SpinCalc.m

			var sqx = q.x * q.x;
			var sqy = q.y * q.y;
			var sqz = q.z * q.z;
			var sqw = q.w * q.w;

			if ( order === undefined || order === 'XYZ' ) {

				this.x = Math.atan2( 2 * ( q.x * q.w - q.y * q.z ), ( sqw - sqx - sqy + sqz ) );
				this.y = Math.asin(  clamp( 2 * ( q.x * q.z + q.y * q.w ) ) );
				this.z = Math.atan2( 2 * ( q.z * q.w - q.x * q.y ), ( sqw + sqx - sqy - sqz ) );

			} else if ( order ===  'YXZ' ) {

				this.x = Math.asin(  clamp( 2 * ( q.x * q.w - q.y * q.z ) ) );
				this.y = Math.atan2( 2 * ( q.x * q.z + q.y * q.w ), ( sqw - sqx - sqy + sqz ) );
				this.z = Math.atan2( 2 * ( q.x * q.y + q.z * q.w ), ( sqw - sqx + sqy - sqz ) );

			} else if ( order === 'ZXY' ) {

				this.x = Math.asin(  clamp( 2 * ( q.x * q.w + q.y * q.z ) ) );
				this.y = Math.atan2( 2 * ( q.y * q.w - q.z * q.x ), ( sqw - sqx - sqy + sqz ) );
				this.z = Math.atan2( 2 * ( q.z * q.w - q.x * q.y ), ( sqw - sqx + sqy - sqz ) );

			} else if ( order === 'ZYX' ) {

				this.x = Math.atan2( 2 * ( q.x * q.w + q.z * q.y ), ( sqw - sqx - sqy + sqz ) );
				this.y = Math.asin(  clamp( 2 * ( q.y * q.w - q.x * q.z ) ) );
				this.z = Math.atan2( 2 * ( q.x * q.y + q.z * q.w ), ( sqw + sqx - sqy - sqz ) );

			} else if ( order === 'YZX' ) {

				this.x = Math.atan2( 2 * ( q.x * q.w - q.z * q.y ), ( sqw - sqx + sqy - sqz ) );
				this.y = Math.atan2( 2 * ( q.y * q.w - q.x * q.z ), ( sqw + sqx - sqy - sqz ) );
				this.z = Math.asin(  clamp( 2 * ( q.x * q.y + q.z * q.w ) ) );

			} else if ( order === 'XZY' ) {

				this.x = Math.atan2( 2 * ( q.x * q.w + q.y * q.z ), ( sqw - sqx + sqy - sqz ) );
				this.y = Math.atan2( 2 * ( q.x * q.z + q.y * q.w ), ( sqw + sqx - sqy - sqz ) );
				this.z = Math.asin(  clamp( 2 * ( q.z * q.w - q.x * q.y ) ) );

			}

			return this;

		},

		getScaleFromMatrix: function ( m ) {

			var sx = this.set( m.elements[0], m.elements[1], m.elements[2] ).length();
			var sy = this.set( m.elements[4], m.elements[5], m.elements[6] ).length();
			var sz = this.set( m.elements[8], m.elements[9], m.elements[10] ).length();

			this.x = sx;
			this.y = sy;
			this.z = sz;

			return this;
		},

		equals: function ( v ) {

			return ( ( v.x === this.x ) && ( v.y === this.y ) && ( v.z === this.z ) );

		},

		clone: function () {

			return new Vector3( this.x, this.y, this.z );

		}

	};

	module.exports = Vector3;

});

require.define("/lib/util/cross_vector",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = false;

	var Vector3 = require("./vector3");
	var Plane = require('./plane');

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */
	function ab_rise(a, b, d) {
		var tan = (a - b) / d;
		var angle = Math.atan(tan); //PI/2 > angle > -PI/2
		if (_DEBUG) console.log('angle of (%s .. %s)/%s = %s degrees', a, b, d, angle * 180 / Math.PI);
		var float_angle = angle * 2 / Math.PI; // 1 > float_angle > -1
		if (_DEBUG) console.log('angle of (%s .. %s)/%s = %s in 1 .. -1', a, b, d, float_angle);
		return float_angle
	}

	function magnitude(x, y) {
		return Math.sqrt(x * x + y * y);
	}

	function cross_vector(m, n, s, e, w, d) {
		var s_point, e_point
		if (_.isNull(n)) {  // n is not a value
			if (_.isNull(s)) { // s is not a value
				throw new Error('no value for n or s')
			} else { // n is not a value, s is a value,
				s_point = new Vector3(0, d, s - m);
			}
		} else { // n is a value
			if (_.isNull(s)) { // n is a value, s is not a value
				s_point = new Vector3(0, d, m - n);
			} else { // n and s are values
				s_point = new Vector3(0, 2 * d, s - n);
			}
		}

		if (_.isNull(w)) {
			if (_.isNull(e)) {
				throw new Error('no value for e or w');
			} else { // w is null, e is not null
				e_point = new Vector3(d, 0, m - e);
			}
		} else { // w is not null
			if (_.isNull(e)) { // w is not null, e is null
				e_point = new Vector3(d, 0, w - m)
			} else { // w is not null, e is not null
				e_point = new Vector3(d * 2, 0, w - e);
			}
		}

		var p = new Plane().setFromCoplanarPoints(s_point, new Vector3(0,0,0), e_point);
		return p.normal;
	}

	cross_vector.ab_rise = ab_rise;
	cross_vector.magnitude = magnitude;

	/* ********* EXPORTS ******** */

	module.exports = cross_vector; // end export function
});

require.define("/lib/util/plane",function(require,module,exports,__dirname,__filename,process,global){var Vector3 = require('./vector3');

	/**
	 * @author bhouston / http://exocortex.com
	 */

	Plane = function ( normal, constant ) {

		this.normal = ( normal !== undefined ) ? normal : new Vector3( 1, 0, 0 );
		this.constant = ( constant !== undefined ) ? constant : 0;

	};

	Plane.prototype = {

		constructor: Plane,

		set: function ( normal, constant ) {

			this.normal.copy( normal );
			this.constant = constant;

			return this;

		},

		setComponents: function ( x, y, z, w ) {

			this.normal.set( x, y, z );
			this.constant = w;

			return this;

		},

		setFromNormalAndCoplanarPoint: function ( normal, point ) {

			this.normal.copy( normal );
			this.constant = - point.dot( this.normal );	// must be this.normal, not normal, as this.normal is normalized

			return this;

		},

		setFromCoplanarPoints: function ( a, b, c ) {

			var normal = Plane.__v1.subVectors( c, b ).cross( Plane.__v2.subVectors( a, b ) ).normalize();

			// Q: should an error be thrown if normal is zero (e.g. degenerate plane)?

			this.setFromNormalAndCoplanarPoint( normal, a );

			return this;

		},

		copy: function ( plane ) {

			this.normal.copy( plane.normal );
			this.constant = plane.constant;

			return this;

		},

		normalize: function () {

			// Note: will lead to a divide by zero if the plane is invalid.

			var inverseNormalLength = 1.0 / this.normal.length();
			this.normal.multiplyScalar( inverseNormalLength );
			this.constant *= inverseNormalLength;

			return this;

		},

		negate: function () {

			this.constant *= -1;
			this.normal.negate();

			return this;

		},

		distanceToPoint: function ( point ) {

			return this.normal.dot( point ) + this.constant;

		},

		distanceToSphere: function ( sphere ) {

			return this.distanceToPoint( sphere.center ) - sphere.radius;

		},

		projectPoint: function ( point, optionalTarget ) {

			return this.orthoPoint( point, optionalTarget ).sub( point ).negate();

		},

		orthoPoint: function ( point, optionalTarget ) {

			var perpendicularMagnitude = this.distanceToPoint( point );

			var result = optionalTarget || new Vector3();
			return result.copy( this.normal ).multiplyScalar( perpendicularMagnitude );

		},

		isIntersectionLine: function ( startPoint, endPoint ) {

			// Note: this tests if a line intersects the plane, not whether it (or its end-points) are coplanar with it.

			var startSign = this.distanceToPoint( startPoint );
			var endSign = this.distanceToPoint( endPoint );

			return ( startSign < 0 && endSign > 0 ) || ( endSign < 0 && startSign > 0 );

		},

		intersectLine: function ( startPoint, endPoint, optionalTarget ) {

			var result = optionalTarget || new Vector3();

			var direction = Plane.__v1.subVectors( endPoint, startPoint );

			var denominator = this.normal.dot( direction );

			if ( denominator == 0 ) {

				// line is coplanar, return origin
				if( this.distanceToPoint( startPoint ) == 0 ) {

					return result.copy( startPoint );

				}

				// Unsure if this is the correct method to handle this case.
				return undefined;

			}

			var t = - ( startPoint.dot( this.normal ) + this.constant ) / denominator;

			if( t < 0 || t > 1 ) {

				return undefined;

			}

			return result.copy( direction ).multiplyScalar( t ).add( startPoint );

		},

		coplanarPoint: function ( optionalTarget ) {

			var result = optionalTarget || new Vector3();
			return result.copy( this.normal ).multiplyScalar( - this.constant );

		},

		transform: function ( matrix, optionalNormalMatrix ) {

			// compute new normal based on theory here:
			// http://www.songho.ca/opengl/gl_normaltransform.html
			optionalNormalMatrix = optionalNormalMatrix || new THREE.Matrix3().getInverse( matrix ).transpose();
			var newNormal = Plane.__v1.copy( this.normal ).applyMatrix3( optionalNormalMatrix );

			var newCoplanarPoint = this.coplanarPoint( Plane.__v2 );
			newCoplanarPoint.applyMatrix4( matrix );

			this.setFromNormalAndCoplanarPoint( newNormal, newCoplanarPoint );

			return this;

		},

		translate: function ( offset ) {

			this.constant = this.constant - offset.dot( this.normal );

			return this;

		},

		equals: function ( plane ) {

			return plane.normal.equals( this.normal ) && ( plane.constant == this.constant );

		},

		clone: function () {

			return new Plane().copy( this );

		}

	};

	Plane.__vZero = new Vector3( 0, 0, 0 );
	Plane.__v1 = new Vector3();
	Plane.__v2 = new Vector3();

	module.exports = Plane;
});

require.define("/lib/filters/normal_map",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');
	var util = require('util');


	var _DEBUG = true;

	/* ************************************
	 * 
	 * ************************************ */

	/* ******* CLOSURE ********* */

	var i = 0;

	/* ********* EXPORTS ******** */

	function normal_map_gen(params) {

		var _params = _.extend({
			distance:    1,
			isGreyscale: false,
			gsMap:       _.range(0, 256)
		}, params || {});


		return function (value, x, y) {
			var north_south_distance = 0;
			var north_value, south_value;
			if(this.xy_good(x, y - 1)){
				north_south_distance += _params.distance;
				north_value = this.value(x, y - 1);
			} else {
				north_value = value;
			}

			if (this.xy_good(x, y + 1)){
				north_south_distance += _params.distance;
				south_value = this.value(x, y + 1);
			} else {
				south_value = value;
			}

			var ns_difference = south_value - north_value;

			var green = 255 * (ns_difference / north_south_distance) + 127;


			var east_west_distance = 0;
			var east_value, west_value;

			if (this.xy_good(x - 1, y)){
				east_value = this.value(x - 1, y);
				east_west_distance += _params.distance;
			} else {
				east_value = value;
			}
			if (this.xy_good(x + 1, y)){
				west_value = this.value(x + 1, y);
				east_west_distance += _params.distance;
			} else {
				west_value = value;
			}
			var ew_differnce = west_value - east_value;
			var red = -255 * (ew_differnce / east_west_distance) + 127;

			return [red, green, 255, 255]

		}

	} // end export function

	module.exports = normal_map_gen;
});
