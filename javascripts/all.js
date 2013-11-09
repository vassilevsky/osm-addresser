/*
 Leaflet, a JavaScript library for mobile-friendly interactive maps. http://leafletjs.com
 (c) 2010-2013, Vladimir Agafonkin
 (c) 2010-2011, CloudMade
*/

(function (window, document, undefined) {
var oldL = window.L,
    L = {};

L.version = '0.7-dev';

// define Leaflet for Node module pattern loaders, including Browserify
if (typeof module === 'object' && typeof module.exports === 'object') {
	module.exports = L;

// define Leaflet as an AMD module
} else if (typeof define === 'function' && define.amd) {
	define(L);
}

// define Leaflet as a global L variable, saving the original L to restore later if needed

L.noConflict = function () {
	window.L = oldL;
	return this;
};

window.L = L;


/*
 * L.Util contains various utility functions used throughout Leaflet code.
 */

L.Util = {
	extend: function (dest) { // (Object[, Object, ...]) ->
		var sources = Array.prototype.slice.call(arguments, 1),
		    i, j, len, src;

		for (j = 0, len = sources.length; j < len; j++) {
			src = sources[j] || {};
			for (i in src) {
				if (src.hasOwnProperty(i)) {
					dest[i] = src[i];
				}
			}
		}
		return dest;
	},

	bind: function (fn, obj) { // (Function, Object) -> Function
		var args = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : null;
		return function () {
			return fn.apply(obj, args || arguments);
		};
	},

	stamp: (function () {
		var lastId = 0,
		    key = '_leaflet_id';
		return function (obj) {
			obj[key] = obj[key] || ++lastId;
			return obj[key];
		};
	}()),

	invokeEach: function (obj, method, context) {
		var i, args;

		if (typeof obj === 'object') {
			args = Array.prototype.slice.call(arguments, 3);

			for (i in obj) {
				method.apply(context, [i, obj[i]].concat(args));
			}
			return true;
		}

		return false;
	},

	limitExecByInterval: function (fn, time, context) {
		var lock, execOnUnlock;

		return function wrapperFn() {
			var args = arguments;

			if (lock) {
				execOnUnlock = true;
				return;
			}

			lock = true;

			setTimeout(function () {
				lock = false;

				if (execOnUnlock) {
					wrapperFn.apply(context, args);
					execOnUnlock = false;
				}
			}, time);

			fn.apply(context, args);
		};
	},

	falseFn: function () {
		return false;
	},

	formatNum: function (num, digits) {
		var pow = Math.pow(10, digits || 5);
		return Math.round(num * pow) / pow;
	},

	trim: function (str) {
		return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
	},

	splitWords: function (str) {
		return L.Util.trim(str).split(/\s+/);
	},

	setOptions: function (obj, options) {
		obj.options = L.extend({}, obj.options, options);
		return obj.options;
	},

	getParamString: function (obj, existingUrl, uppercase) {
		var params = [];
		for (var i in obj) {
			params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + '=' + encodeURIComponent(obj[i]));
		}
		return ((!existingUrl || existingUrl.indexOf('?') === -1) ? '?' : '&') + params.join('&');
	},

	compileTemplate: function (str, data) {
		// based on https://gist.github.com/padolsey/6008842
		str = str.replace(/\{ *([\w_]+) *\}/g, function (str, key) {
			return '" + o["' + key + '"]' + (typeof data[key] === 'function' ? '(o)' : '') + ' + "';
		});
		// jshint evil: true
		return new Function('o', 'return "' + str + '";');
	},

	template: function (str, data) {
		var cache = L.Util._templateCache = L.Util._templateCache || {};
		cache[str] = cache[str] || L.Util.compileTemplate(str, data);
		return cache[str](data);
	},

	isArray: Array.isArray || function (obj) {
		return (Object.prototype.toString.call(obj) === '[object Array]');
	},

	emptyImageUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
};

(function () {

	// inspired by http://paulirish.com/2011/requestanimationframe-for-smart-animating/

	function getPrefixed(name) {
		var i, fn,
		    prefixes = ['webkit', 'moz', 'o', 'ms'];

		for (i = 0; i < prefixes.length && !fn; i++) {
			fn = window[prefixes[i] + name];
		}

		return fn;
	}

	var lastTime = 0;

	function timeoutDefer(fn) {
		var time = +new Date(),
		    timeToCall = Math.max(0, 16 - (time - lastTime));

		lastTime = time + timeToCall;
		return window.setTimeout(fn, timeToCall);
	}

	var requestFn = window.requestAnimationFrame ||
	        getPrefixed('RequestAnimationFrame') || timeoutDefer;

	var cancelFn = window.cancelAnimationFrame ||
	        getPrefixed('CancelAnimationFrame') ||
	        getPrefixed('CancelRequestAnimationFrame') ||
	        function (id) { window.clearTimeout(id); };


	L.Util.requestAnimFrame = function (fn, context, immediate, element) {
		fn = L.bind(fn, context);

		if (immediate && requestFn === timeoutDefer) {
			fn();
		} else {
			return requestFn.call(window, fn, element);
		}
	};

	L.Util.cancelAnimFrame = function (id) {
		if (id) {
			cancelFn.call(window, id);
		}
	};

}());

// shortcuts for most used utility functions
L.extend = L.Util.extend;
L.bind = L.Util.bind;
L.stamp = L.Util.stamp;
L.setOptions = L.Util.setOptions;


/*
 * L.Class powers the OOP facilities of the library.
 * Thanks to John Resig and Dean Edwards for inspiration!
 */

L.Class = function () {};

L.Class.extend = function (props) {

	// extended class with the new prototype
	var NewClass = function () {

		// call the constructor
		if (this.initialize) {
			this.initialize.apply(this, arguments);
		}

		// call all constructor hooks
		if (this._initHooks) {
			this.callInitHooks();
		}
	};

	// instantiate class without calling constructor
	var F = function () {};
	F.prototype = this.prototype;

	var proto = new F();
	proto.constructor = NewClass;

	NewClass.prototype = proto;

	//inherit parent's statics
	for (var i in this) {
		if (this.hasOwnProperty(i) && i !== 'prototype') {
			NewClass[i] = this[i];
		}
	}

	// mix static properties into the class
	if (props.statics) {
		L.extend(NewClass, props.statics);
		delete props.statics;
	}

	// mix includes into the prototype
	if (props.includes) {
		L.Util.extend.apply(null, [proto].concat(props.includes));
		delete props.includes;
	}

	// merge options
	if (props.options && proto.options) {
		props.options = L.extend({}, proto.options, props.options);
	}

	// mix given properties into the prototype
	L.extend(proto, props);

	proto._initHooks = [];

	var parent = this;
	// jshint camelcase: false
	NewClass.__super__ = parent.prototype;

	// add method for calling all hooks
	proto.callInitHooks = function () {

		if (this._initHooksCalled) { return; }

		if (parent.prototype.callInitHooks) {
			parent.prototype.callInitHooks.call(this);
		}

		this._initHooksCalled = true;

		for (var i = 0, len = proto._initHooks.length; i < len; i++) {
			proto._initHooks[i].call(this);
		}
	};

	return NewClass;
};


// method for adding properties to prototype
L.Class.include = function (props) {
	L.extend(this.prototype, props);
};

// merge new default options to the Class
L.Class.mergeOptions = function (options) {
	L.extend(this.prototype.options, options);
};

// add a constructor hook
L.Class.addInitHook = function (fn) { // (Function) || (String, args...)
	var args = Array.prototype.slice.call(arguments, 1);

	var init = typeof fn === 'function' ? fn : function () {
		this[fn].apply(this, args);
	};

	this.prototype._initHooks = this.prototype._initHooks || [];
	this.prototype._initHooks.push(init);
};


/*
 * L.Mixin.Events is used to add custom events functionality to Leaflet classes.
 */

var eventsKey = '_leaflet_events';

L.Mixin = {};

L.Mixin.Events = {

	addEventListener: function (types, fn, context) { // (String, Function[, Object]) or (Object[, Object])

		// types can be a map of types/handlers
		if (L.Util.invokeEach(types, this.addEventListener, this, fn, context)) { return this; }

		var events = this[eventsKey] = this[eventsKey] || {},
		    contextId = context && L.stamp(context),
		    i, len, event, type, indexKey, indexLenKey, typeIndex;

		// types can be a string of space-separated words
		types = L.Util.splitWords(types);

		for (i = 0, len = types.length; i < len; i++) {
			event = {
				action: fn,
				context: context || this
			};
			type = types[i];

			if (context) {
				// store listeners of a particular context in a separate hash (if it has an id)
				// gives a major performance boost when removing thousands of map layers

				indexKey = type + '_idx';
				indexLenKey = indexKey + '_len';

				typeIndex = events[indexKey] = events[indexKey] || {};

				if (!typeIndex[contextId]) {
					typeIndex[contextId] = [];

					// keep track of the number of keys in the index to quickly check if it's empty
					events[indexLenKey] = (events[indexLenKey] || 0) + 1;
				}

				typeIndex[contextId].push(event);


			} else {
				events[type] = events[type] || [];
				events[type].push(event);
			}
		}

		return this;
	},

	hasEventListeners: function (type) { // (String) -> Boolean
		var events = this[eventsKey];
		return !!events && ((type in events && events[type].length > 0) ||
		                    (type + '_idx' in events && events[type + '_idx_len'] > 0));
	},

	removeEventListener: function (types, fn, context) { // ([String, Function, Object]) or (Object[, Object])

		if (!this[eventsKey]) {
			return this;
		}

		if (!types) {
			return this.clearAllEventListeners();
		}

		if (L.Util.invokeEach(types, this.removeEventListener, this, fn, context)) { return this; }

		var events = this[eventsKey],
		    contextId = context && L.stamp(context),
		    i, len, type, listeners, j, indexKey, indexLenKey, typeIndex, removed;

		types = L.Util.splitWords(types);

		for (i = 0, len = types.length; i < len; i++) {
			type = types[i];
			indexKey = type + '_idx';
			indexLenKey = indexKey + '_len';

			typeIndex = events[indexKey];

			if (!fn) {
				// clear all listeners for a type if function isn't specified
				delete events[type];
				delete events[indexKey];

			} else {
				listeners = context && typeIndex ? typeIndex[contextId] : events[type];

				if (listeners) {
					for (j = listeners.length - 1; j >= 0; j--) {
						if ((listeners[j].action === fn) && (!context || (listeners[j].context === context))) {
							removed = listeners.splice(j, 1);
							// set the old action to a no-op, because it is possible
							// that the listener is being iterated over as part of a dispatch
							removed[0].action = L.Util.falseFn;
						}
					}

					if (context && typeIndex && (listeners.length === 0)) {
						delete typeIndex[contextId];
						events[indexLenKey]--;
					}
				}
			}
		}

		return this;
	},

	clearAllEventListeners: function () {
		delete this[eventsKey];
		return this;
	},

	fireEvent: function (type, data) { // (String[, Object])
		if (!this.hasEventListeners(type)) {
			return this;
		}

		var event = L.Util.extend({}, data, { type: type, target: this });

		var events = this[eventsKey],
		    listeners, i, len, typeIndex, contextId;

		if (events[type]) {
			// make sure adding/removing listeners inside other listeners won't cause infinite loop
			listeners = events[type].slice();

			for (i = 0, len = listeners.length; i < len; i++) {
				listeners[i].action.call(listeners[i].context || this, event);
			}
		}

		// fire event for the context-indexed listeners as well
		typeIndex = events[type + '_idx'];

		for (contextId in typeIndex) {
			listeners = typeIndex[contextId].slice();

			if (listeners) {
				for (i = 0, len = listeners.length; i < len; i++) {
					listeners[i].action.call(listeners[i].context || this, event);
				}
			}
		}

		return this;
	},

	addOneTimeEventListener: function (types, fn, context) {

		if (L.Util.invokeEach(types, this.addOneTimeEventListener, this, fn, context)) { return this; }

		var handler = L.bind(function () {
			this
			    .removeEventListener(types, fn, context)
			    .removeEventListener(types, handler, context);
		}, this);

		return this
		    .addEventListener(types, fn, context)
		    .addEventListener(types, handler, context);
	}
};

L.Mixin.Events.on = L.Mixin.Events.addEventListener;
L.Mixin.Events.off = L.Mixin.Events.removeEventListener;
L.Mixin.Events.once = L.Mixin.Events.addOneTimeEventListener;
L.Mixin.Events.fire = L.Mixin.Events.fireEvent;


/*
 * L.Browser handles different browser and feature detections for internal Leaflet use.
 */

(function () {

	var ie = 'ActiveXObject' in window,
	    ie6 = ie && !window.XMLHttpRequest,
	    ie7 = ie && !document.querySelector,
		ielt9 = ie && !document.addEventListener,

	    // terrible browser detection to work around Safari / iOS / Android browser bugs
	    ua = navigator.userAgent.toLowerCase(),
	    webkit = ua.indexOf('webkit') !== -1,
	    chrome = ua.indexOf('chrome') !== -1,
	    phantomjs = ua.indexOf('phantom') !== -1,
	    android = ua.indexOf('android') !== -1,
	    android23 = ua.search('android [23]') !== -1,

	    mobile = typeof orientation !== undefined + '',
	    msPointer = window.navigator && window.navigator.msPointerEnabled &&
	              window.navigator.msMaxTouchPoints && !window.PointerEvent,
		pointer = (window.PointerEvent && window.navigator.pointerEnabled && window.navigator.maxTouchPoints) ||
				  msPointer,
	    retina = ('devicePixelRatio' in window && window.devicePixelRatio > 1) ||
	             ('matchMedia' in window && window.matchMedia('(min-resolution:144dpi)') &&
	              window.matchMedia('(min-resolution:144dpi)').matches),

	    doc = document.documentElement,
	    ie3d = ie && ('transition' in doc.style),
	    webkit3d = ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()),
	    gecko3d = 'MozPerspective' in doc.style,
	    opera3d = 'OTransition' in doc.style,
	    any3d = !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d || opera3d) && !phantomjs;


	// PhantomJS has 'ontouchstart' in document.documentElement, but doesn't actually support touch.
	// https://github.com/Leaflet/Leaflet/pull/1434#issuecomment-13843151

	var touch = !window.L_NO_TOUCH && !phantomjs && (function () {

		var startName = 'ontouchstart';

		// IE10+ (We simulate these into touch* events in L.DomEvent and L.DomEvent.Pointer) or WebKit, etc.
		if (pointer || (startName in doc)) {
			return true;
		}

		// Firefox/Gecko
		var div = document.createElement('div'),
		    supported = false;

		if (!div.setAttribute) {
			return false;
		}
		div.setAttribute(startName, 'return;');

		if (typeof div[startName] === 'function') {
			supported = true;
		}

		div.removeAttribute(startName);
		div = null;

		return supported;
	}());


	L.Browser = {
		ie: ie,
		ie6: ie6,
		ie7: ie7,
		ielt9: ielt9,
		webkit: webkit,

		android: android,
		android23: android23,

		chrome: chrome,

		ie3d: ie3d,
		webkit3d: webkit3d,
		gecko3d: gecko3d,
		opera3d: opera3d,
		any3d: any3d,

		mobile: mobile,
		mobileWebkit: mobile && webkit,
		mobileWebkit3d: mobile && webkit3d,
		mobileOpera: mobile && window.opera,

		touch: touch,
		msPointer: msPointer,
		pointer: pointer,

		retina: retina
	};

}());


/*
 * L.Point represents a point with x and y coordinates.
 */

L.Point = function (/*Number*/ x, /*Number*/ y, /*Boolean*/ round) {
	this.x = (round ? Math.round(x) : x);
	this.y = (round ? Math.round(y) : y);
};

L.Point.prototype = {

	clone: function () {
		return new L.Point(this.x, this.y);
	},

	// non-destructive, returns a new point
	add: function (point) {
		return this.clone()._add(L.point(point));
	},

	// destructive, used directly for performance in situations where it's safe to modify existing point
	_add: function (point) {
		this.x += point.x;
		this.y += point.y;
		return this;
	},

	subtract: function (point) {
		return this.clone()._subtract(L.point(point));
	},

	_subtract: function (point) {
		this.x -= point.x;
		this.y -= point.y;
		return this;
	},

	divideBy: function (num) {
		return this.clone()._divideBy(num);
	},

	_divideBy: function (num) {
		this.x /= num;
		this.y /= num;
		return this;
	},

	multiplyBy: function (num) {
		return this.clone()._multiplyBy(num);
	},

	_multiplyBy: function (num) {
		this.x *= num;
		this.y *= num;
		return this;
	},

	round: function () {
		return this.clone()._round();
	},

	_round: function () {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	},

	floor: function () {
		return this.clone()._floor();
	},

	_floor: function () {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	},

	distanceTo: function (point) {
		point = L.point(point);

		var x = point.x - this.x,
		    y = point.y - this.y;

		return Math.sqrt(x * x + y * y);
	},

	equals: function (point) {
		point = L.point(point);

		return point.x === this.x &&
		       point.y === this.y;
	},

	contains: function (point) {
		point = L.point(point);

		return Math.abs(point.x) <= Math.abs(this.x) &&
		       Math.abs(point.y) <= Math.abs(this.y);
	},

	toString: function () {
		return 'Point(' +
		        L.Util.formatNum(this.x) + ', ' +
		        L.Util.formatNum(this.y) + ')';
	}
};

L.point = function (x, y, round) {
	if (x instanceof L.Point) {
		return x;
	}
	if (L.Util.isArray(x)) {
		return new L.Point(x[0], x[1]);
	}
	if (x === undefined || x === null) {
		return x;
	}
	return new L.Point(x, y, round);
};


/*
 * L.Bounds represents a rectangular area on the screen in pixel coordinates.
 */

L.Bounds = function (a, b) { //(Point, Point) or Point[]
	if (!a) { return; }

	var points = b ? [a, b] : a;

	for (var i = 0, len = points.length; i < len; i++) {
		this.extend(points[i]);
	}
};

L.Bounds.prototype = {
	// extend the bounds to contain the given point
	extend: function (point) { // (Point)
		point = L.point(point);

		if (!this.min && !this.max) {
			this.min = point.clone();
			this.max = point.clone();
		} else {
			this.min.x = Math.min(point.x, this.min.x);
			this.max.x = Math.max(point.x, this.max.x);
			this.min.y = Math.min(point.y, this.min.y);
			this.max.y = Math.max(point.y, this.max.y);
		}
		return this;
	},

	getCenter: function (round) { // (Boolean) -> Point
		return new L.Point(
		        (this.min.x + this.max.x) / 2,
		        (this.min.y + this.max.y) / 2, round);
	},

	getBottomLeft: function () { // -> Point
		return new L.Point(this.min.x, this.max.y);
	},

	getTopRight: function () { // -> Point
		return new L.Point(this.max.x, this.min.y);
	},

	getSize: function () {
		return this.max.subtract(this.min);
	},

	contains: function (obj) { // (Bounds) or (Point) -> Boolean
		var min, max;

		if (typeof obj[0] === 'number' || obj instanceof L.Point) {
			obj = L.point(obj);
		} else {
			obj = L.bounds(obj);
		}

		if (obj instanceof L.Bounds) {
			min = obj.min;
			max = obj.max;
		} else {
			min = max = obj;
		}

		return (min.x >= this.min.x) &&
		       (max.x <= this.max.x) &&
		       (min.y >= this.min.y) &&
		       (max.y <= this.max.y);
	},

	intersects: function (bounds) { // (Bounds) -> Boolean
		bounds = L.bounds(bounds);

		var min = this.min,
		    max = this.max,
		    min2 = bounds.min,
		    max2 = bounds.max,
		    xIntersects = (max2.x >= min.x) && (min2.x <= max.x),
		    yIntersects = (max2.y >= min.y) && (min2.y <= max.y);

		return xIntersects && yIntersects;
	},

	isValid: function () {
		return !!(this.min && this.max);
	}
};

L.bounds = function (a, b) { // (Bounds) or (Point, Point) or (Point[])
	if (!a || a instanceof L.Bounds) {
		return a;
	}
	return new L.Bounds(a, b);
};


/*
 * L.Transformation is an utility class to perform simple point transformations through a 2d-matrix.
 */

L.Transformation = function (a, b, c, d) {
	this._a = a;
	this._b = b;
	this._c = c;
	this._d = d;
};

L.Transformation.prototype = {
	transform: function (point, scale) { // (Point, Number) -> Point
		return this._transform(point.clone(), scale);
	},

	// destructive transform (faster)
	_transform: function (point, scale) {
		scale = scale || 1;
		point.x = scale * (this._a * point.x + this._b);
		point.y = scale * (this._c * point.y + this._d);
		return point;
	},

	untransform: function (point, scale) {
		scale = scale || 1;
		return new L.Point(
		        (point.x / scale - this._b) / this._a,
		        (point.y / scale - this._d) / this._c);
	}
};


/*
 * L.DomUtil contains various utility functions for working with DOM.
 */

L.DomUtil = {
	get: function (id) {
		return (typeof id === 'string' ? document.getElementById(id) : id);
	},

	getStyle: function (el, style) {

		var value = el.style[style];

		if (!value && el.currentStyle) {
			value = el.currentStyle[style];
		}

		if ((!value || value === 'auto') && document.defaultView) {
			var css = document.defaultView.getComputedStyle(el, null);
			value = css ? css[style] : null;
		}

		return value === 'auto' ? null : value;
	},

	getViewportOffset: function (element) {

		var top = 0,
		    left = 0,
		    el = element,
		    docBody = document.body,
		    docEl = document.documentElement,
		    pos,
		    ie7 = L.Browser.ie7;

		do {
			top  += el.offsetTop  || 0;
			left += el.offsetLeft || 0;

			//add borders
			top += parseInt(L.DomUtil.getStyle(el, 'borderTopWidth'), 10) || 0;
			left += parseInt(L.DomUtil.getStyle(el, 'borderLeftWidth'), 10) || 0;

			pos = L.DomUtil.getStyle(el, 'position');

			if (el.offsetParent === docBody && pos === 'absolute') { break; }

			if (pos === 'fixed') {
				top  += docBody.scrollTop  || docEl.scrollTop  || 0;
				left += docBody.scrollLeft || docEl.scrollLeft || 0;
				break;
			}

			if (pos === 'relative' && !el.offsetLeft) {
				var width = L.DomUtil.getStyle(el, 'width'),
				    maxWidth = L.DomUtil.getStyle(el, 'max-width'),
				    r = el.getBoundingClientRect();

				if (width !== 'none' || maxWidth !== 'none') {
					left += r.left + el.clientLeft;
				}

				//calculate full y offset since we're breaking out of the loop
				top += r.top + (docBody.scrollTop  || docEl.scrollTop  || 0);

				break;
			}

			el = el.offsetParent;

		} while (el);

		el = element;

		do {
			if (el === docBody) { break; }

			top  -= el.scrollTop  || 0;
			left -= el.scrollLeft || 0;

			// webkit (and ie <= 7) handles RTL scrollLeft different to everyone else
			// https://code.google.com/p/closure-library/source/browse/trunk/closure/goog/style/bidi.js
			if (!L.DomUtil.documentIsLtr() && (L.Browser.webkit || ie7)) {
				left += el.scrollWidth - el.clientWidth;

				// ie7 shows the scrollbar by default and provides clientWidth counting it, so we
				// need to add it back in if it is visible; scrollbar is on the left as we are RTL
				if (ie7 && L.DomUtil.getStyle(el, 'overflow-y') !== 'hidden' &&
				           L.DomUtil.getStyle(el, 'overflow') !== 'hidden') {
					left += 17;
				}
			}

			el = el.parentNode;
		} while (el);

		return new L.Point(left, top);
	},

	documentIsLtr: function () {
		if (!L.DomUtil._docIsLtrCached) {
			L.DomUtil._docIsLtrCached = true;
			L.DomUtil._docIsLtr = L.DomUtil.getStyle(document.body, 'direction') === 'ltr';
		}
		return L.DomUtil._docIsLtr;
	},

	create: function (tagName, className, container) {

		var el = document.createElement(tagName);
		el.className = className;

		if (container) {
			container.appendChild(el);
		}

		return el;
	},

	hasClass: function (el, name) {
		return (el.className.length > 0) &&
		        new RegExp('(^|\\s)' + name + '(\\s|$)').test(el.className);
	},

	addClass: function (el, name) {
		if (!L.DomUtil.hasClass(el, name)) {
			el.className += (el.className ? ' ' : '') + name;
		}
	},

	removeClass: function (el, name) {
		el.className = L.Util.trim((' ' + el.className + ' ').replace(' ' + name + ' ', ' '));
	},

	setOpacity: function (el, value) {

		if ('opacity' in el.style) {
			el.style.opacity = value;

		} else if ('filter' in el.style) {

			var filter = false,
			    filterName = 'DXImageTransform.Microsoft.Alpha';

			// filters collection throws an error if we try to retrieve a filter that doesn't exist
			try {
				filter = el.filters.item(filterName);
			} catch (e) {
				// don't set opacity to 1 if we haven't already set an opacity,
				// it isn't needed and breaks transparent pngs.
				if (value === 1) { return; }
			}

			value = Math.round(value * 100);

			if (filter) {
				filter.Enabled = (value !== 100);
				filter.Opacity = value;
			} else {
				el.style.filter += ' progid:' + filterName + '(opacity=' + value + ')';
			}
		}
	},

	testProp: function (props) {

		var style = document.documentElement.style;

		for (var i = 0; i < props.length; i++) {
			if (props[i] in style) {
				return props[i];
			}
		}
		return false;
	},

	getTranslateString: function (point) {
		// on WebKit browsers (Chrome/Safari/iOS Safari/Android) using translate3d instead of translate
		// makes animation smoother as it ensures HW accel is used. Firefox 13 doesn't care
		// (same speed either way), Opera 12 doesn't support translate3d

		var is3d = L.Browser.webkit3d,
		    open = 'translate' + (is3d ? '3d' : '') + '(',
		    close = (is3d ? ',0' : '') + ')';

		return open + point.x + 'px,' + point.y + 'px' + close;
	},

	getScaleString: function (scale, origin) {

		var preTranslateStr = L.DomUtil.getTranslateString(origin.add(origin.multiplyBy(-1 * scale))),
		    scaleStr = ' scale(' + scale + ') ';

		return preTranslateStr + scaleStr;
	},

	setPosition: function (el, point, disable3D) { // (HTMLElement, Point[, Boolean])

		// jshint camelcase: false
		el._leaflet_pos = point;

		if (!disable3D && L.Browser.any3d) {
			el.style[L.DomUtil.TRANSFORM] =  L.DomUtil.getTranslateString(point);

			// workaround for Android 2/3 stability (https://github.com/CloudMade/Leaflet/issues/69)
			if (L.Browser.mobileWebkit3d) {
				el.style.WebkitBackfaceVisibility = 'hidden';
			}
		} else {
			el.style.left = point.x + 'px';
			el.style.top = point.y + 'px';
		}
	},

	getPosition: function (el) {
		// this method is only used for elements previously positioned using setPosition,
		// so it's safe to cache the position for performance

		// jshint camelcase: false
		return el._leaflet_pos;
	}
};


// prefix style property names

L.DomUtil.TRANSFORM = L.DomUtil.testProp(
        ['transform', 'WebkitTransform', 'OTransform', 'MozTransform', 'msTransform']);

// webkitTransition comes first because some browser versions that drop vendor prefix don't do
// the same for the transitionend event, in particular the Android 4.1 stock browser

L.DomUtil.TRANSITION = L.DomUtil.testProp(
        ['webkitTransition', 'transition', 'OTransition', 'MozTransition', 'msTransition']);

L.DomUtil.TRANSITION_END =
        L.DomUtil.TRANSITION === 'webkitTransition' || L.DomUtil.TRANSITION === 'OTransition' ?
        L.DomUtil.TRANSITION + 'End' : 'transitionend';

(function () {
	var userSelectProperty = L.DomUtil.testProp(
		['userSelect', 'WebkitUserSelect', 'OUserSelect', 'MozUserSelect', 'msUserSelect']);

	L.extend(L.DomUtil, {
		disableTextSelection: function () {
			L.DomEvent.on(window, 'selectstart', L.DomEvent.preventDefault);
			if (userSelectProperty) {
				var style = document.documentElement.style;
				this._userSelect = style[userSelectProperty];
				style[userSelectProperty] = 'none';
			}
		},

		enableTextSelection: function () {
			L.DomEvent.off(window, 'selectstart', L.DomEvent.preventDefault);
			if (userSelectProperty) {
				document.documentElement.style[userSelectProperty] = this._userSelect;
				delete this._userSelect;
			}
		},

		disableImageDrag: function () {
			L.DomEvent.on(window, 'dragstart', L.DomEvent.preventDefault);
		},

		enableImageDrag: function () {
			L.DomEvent.off(window, 'dragstart', L.DomEvent.preventDefault);
		}
	});
})();


/*
 * L.LatLng represents a geographical point with latitude and longitude coordinates.
 */

L.LatLng = function (rawLat, rawLng) { // (Number, Number)
	var lat = parseFloat(rawLat),
	    lng = parseFloat(rawLng);

	if (isNaN(lat) || isNaN(lng)) {
		throw new Error('Invalid LatLng object: (' + rawLat + ', ' + rawLng + ')');
	}

	this.lat = lat;
	this.lng = lng;
};

L.extend(L.LatLng, {
	DEG_TO_RAD: Math.PI / 180,
	RAD_TO_DEG: 180 / Math.PI,
	MAX_MARGIN: 1.0E-9 // max margin of error for the "equals" check
});

L.LatLng.prototype = {
	equals: function (obj) { // (LatLng) -> Boolean
		if (!obj) { return false; }

		obj = L.latLng(obj);

		var margin = Math.max(
		        Math.abs(this.lat - obj.lat),
		        Math.abs(this.lng - obj.lng));

		return margin <= L.LatLng.MAX_MARGIN;
	},

	toString: function (precision) { // (Number) -> String
		return 'LatLng(' +
		        L.Util.formatNum(this.lat, precision) + ', ' +
		        L.Util.formatNum(this.lng, precision) + ')';
	},

	// Haversine distance formula, see http://en.wikipedia.org/wiki/Haversine_formula
	// TODO move to projection code, LatLng shouldn't know about Earth
	distanceTo: function (other) { // (LatLng) -> Number
		other = L.latLng(other);

		var R = 6378137, // earth radius in meters
		    d2r = L.LatLng.DEG_TO_RAD,
		    dLat = (other.lat - this.lat) * d2r,
		    dLon = (other.lng - this.lng) * d2r,
		    lat1 = this.lat * d2r,
		    lat2 = other.lat * d2r,
		    sin1 = Math.sin(dLat / 2),
		    sin2 = Math.sin(dLon / 2);

		var a = sin1 * sin1 + sin2 * sin2 * Math.cos(lat1) * Math.cos(lat2);

		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	},

	wrap: function (a, b) { // (Number, Number) -> LatLng
		var lng = this.lng;

		a = a || -180;
		b = b ||  180;

		lng = (lng + b) % (b - a) + (lng < a || lng === b ? b : a);

		return new L.LatLng(this.lat, lng);
	}
};

L.latLng = function (a, b) { // (LatLng) or ([Number, Number]) or (Number, Number)
	if (a instanceof L.LatLng) {
		return a;
	}
	if (L.Util.isArray(a)) {
		if (typeof a[0] === 'number' || typeof a[0] === 'string') {
			return new L.LatLng(a[0], a[1]);
		} else {
			return null;
		}
	}
	if (a === undefined || a === null) {
		return a;
	}
	if (typeof a === 'object' && 'lat' in a) {
		return new L.LatLng(a.lat, 'lng' in a ? a.lng : a.lon);
	}
	if (b === undefined) {
		return null;
	}
	return new L.LatLng(a, b);
};



/*
 * L.LatLngBounds represents a rectangular area on the map in geographical coordinates.
 */

L.LatLngBounds = function (southWest, northEast) { // (LatLng, LatLng) or (LatLng[])
	if (!southWest) { return; }

	var latlngs = northEast ? [southWest, northEast] : southWest;

	for (var i = 0, len = latlngs.length; i < len; i++) {
		this.extend(latlngs[i]);
	}
};

L.LatLngBounds.prototype = {
	// extend the bounds to contain the given point or bounds
	extend: function (obj) { // (LatLng) or (LatLngBounds)
		if (!obj) { return this; }

		var latLng = L.latLng(obj);
		if (latLng !== null) {
			obj = latLng;
		} else {
			obj = L.latLngBounds(obj);
		}

		if (obj instanceof L.LatLng) {
			if (!this._southWest && !this._northEast) {
				this._southWest = new L.LatLng(obj.lat, obj.lng);
				this._northEast = new L.LatLng(obj.lat, obj.lng);
			} else {
				this._southWest.lat = Math.min(obj.lat, this._southWest.lat);
				this._southWest.lng = Math.min(obj.lng, this._southWest.lng);

				this._northEast.lat = Math.max(obj.lat, this._northEast.lat);
				this._northEast.lng = Math.max(obj.lng, this._northEast.lng);
			}
		} else if (obj instanceof L.LatLngBounds) {
			this.extend(obj._southWest);
			this.extend(obj._northEast);
		}
		return this;
	},

	// extend the bounds by a percentage
	pad: function (bufferRatio) { // (Number) -> LatLngBounds
		var sw = this._southWest,
		    ne = this._northEast,
		    heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio,
		    widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;

		return new L.LatLngBounds(
		        new L.LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer),
		        new L.LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer));
	},

	getCenter: function () { // -> LatLng
		return new L.LatLng(
		        (this._southWest.lat + this._northEast.lat) / 2,
		        (this._southWest.lng + this._northEast.lng) / 2);
	},

	getSouthWest: function () {
		return this._southWest;
	},

	getNorthEast: function () {
		return this._northEast;
	},

	getNorthWest: function () {
		return new L.LatLng(this.getNorth(), this.getWest());
	},

	getSouthEast: function () {
		return new L.LatLng(this.getSouth(), this.getEast());
	},

	getWest: function () {
		return this._southWest.lng;
	},

	getSouth: function () {
		return this._southWest.lat;
	},

	getEast: function () {
		return this._northEast.lng;
	},

	getNorth: function () {
		return this._northEast.lat;
	},

	contains: function (obj) { // (LatLngBounds) or (LatLng) -> Boolean
		if (typeof obj[0] === 'number' || obj instanceof L.LatLng) {
			obj = L.latLng(obj);
		} else {
			obj = L.latLngBounds(obj);
		}

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2, ne2;

		if (obj instanceof L.LatLngBounds) {
			sw2 = obj.getSouthWest();
			ne2 = obj.getNorthEast();
		} else {
			sw2 = ne2 = obj;
		}

		return (sw2.lat >= sw.lat) && (ne2.lat <= ne.lat) &&
		       (sw2.lng >= sw.lng) && (ne2.lng <= ne.lng);
	},

	intersects: function (bounds) { // (LatLngBounds)
		bounds = L.latLngBounds(bounds);

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2 = bounds.getSouthWest(),
		    ne2 = bounds.getNorthEast(),

		    latIntersects = (ne2.lat >= sw.lat) && (sw2.lat <= ne.lat),
		    lngIntersects = (ne2.lng >= sw.lng) && (sw2.lng <= ne.lng);

		return latIntersects && lngIntersects;
	},

	toBBoxString: function () {
		return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(',');
	},

	equals: function (bounds) { // (LatLngBounds)
		if (!bounds) { return false; }

		bounds = L.latLngBounds(bounds);

		return this._southWest.equals(bounds.getSouthWest()) &&
		       this._northEast.equals(bounds.getNorthEast());
	},

	isValid: function () {
		return !!(this._southWest && this._northEast);
	}
};

//TODO International date line?

L.latLngBounds = function (a, b) { // (LatLngBounds) or (LatLng, LatLng)
	if (!a || a instanceof L.LatLngBounds) {
		return a;
	}
	return new L.LatLngBounds(a, b);
};


/*
 * L.Projection contains various geographical projections used by CRS classes.
 */

L.Projection = {};


/*
 * Spherical Mercator is the most popular map projection, used by EPSG:3857 CRS used by default.
 */

L.Projection.SphericalMercator = {
	MAX_LATITUDE: 85.0511287798,

	project: function (latlng) { // (LatLng) -> Point
		var d = L.LatLng.DEG_TO_RAD,
		    max = this.MAX_LATITUDE,
		    lat = Math.max(Math.min(max, latlng.lat), -max),
		    x = latlng.lng * d,
		    y = lat * d;

		y = Math.log(Math.tan((Math.PI / 4) + (y / 2)));

		return new L.Point(x, y);
	},

	unproject: function (point) { // (Point, Boolean) -> LatLng
		var d = L.LatLng.RAD_TO_DEG,
		    lng = point.x * d,
		    lat = (2 * Math.atan(Math.exp(point.y)) - (Math.PI / 2)) * d;

		return new L.LatLng(lat, lng);
	}
};


/*
 * Simple equirectangular (Plate Carree) projection, used by CRS like EPSG:4326 and Simple.
 */

L.Projection.LonLat = {
	project: function (latlng) {
		return new L.Point(latlng.lng, latlng.lat);
	},

	unproject: function (point) {
		return new L.LatLng(point.y, point.x);
	}
};


/*
 * L.CRS is a base object for all defined CRS (Coordinate Reference Systems) in Leaflet.
 */

L.CRS = {
	latLngToPoint: function (latlng, zoom) { // (LatLng, Number) -> Point
		var projectedPoint = this.projection.project(latlng),
		    scale = this.scale(zoom);

		return this.transformation._transform(projectedPoint, scale);
	},

	pointToLatLng: function (point, zoom) { // (Point, Number[, Boolean]) -> LatLng
		var scale = this.scale(zoom),
		    untransformedPoint = this.transformation.untransform(point, scale);

		return this.projection.unproject(untransformedPoint);
	},

	project: function (latlng) {
		return this.projection.project(latlng);
	},

	scale: function (zoom) {
		return 256 * Math.pow(2, zoom);
	}
};


/*
 * A simple CRS that can be used for flat non-Earth maps like panoramas or game maps.
 */

L.CRS.Simple = L.extend({}, L.CRS, {
	projection: L.Projection.LonLat,
	transformation: new L.Transformation(1, 0, -1, 0),

	scale: function (zoom) {
		return Math.pow(2, zoom);
	}
});


/*
 * L.CRS.EPSG3857 (Spherical Mercator) is the most common CRS for web mapping
 * and is used by Leaflet by default.
 */

L.CRS.EPSG3857 = L.extend({}, L.CRS, {
	code: 'EPSG:3857',

	projection: L.Projection.SphericalMercator,
	transformation: new L.Transformation(0.5 / Math.PI, 0.5, -0.5 / Math.PI, 0.5),

	project: function (latlng) { // (LatLng) -> Point
		var projectedPoint = this.projection.project(latlng),
		    earthRadius = 6378137;
		return projectedPoint.multiplyBy(earthRadius);
	}
});

L.CRS.EPSG900913 = L.extend({}, L.CRS.EPSG3857, {
	code: 'EPSG:900913'
});


/*
 * L.CRS.EPSG4326 is a CRS popular among advanced GIS specialists.
 */

L.CRS.EPSG4326 = L.extend({}, L.CRS, {
	code: 'EPSG:4326',

	projection: L.Projection.LonLat,
	transformation: new L.Transformation(1 / 360, 0.5, -1 / 360, 0.5)
});


/*
 * L.Map is the central class of the API - it is used to create a map.
 */

L.Map = L.Class.extend({

	includes: L.Mixin.Events,

	options: {
		crs: L.CRS.EPSG3857,

		/*
		center: LatLng,
		zoom: Number,
		layers: Array,
		*/

		fadeAnimation: L.DomUtil.TRANSITION && !L.Browser.android23,
		trackResize: true,
		markerZoomAnimation: L.DomUtil.TRANSITION && L.Browser.any3d
	},

	initialize: function (id, options) { // (HTMLElement or String, Object)
		options = L.setOptions(this, options);


		this._initContainer(id);
		this._initLayout();

		// hack for https://github.com/Leaflet/Leaflet/issues/1980
		this._onResize = L.bind(this._onResize, this);

		this._initEvents();

		if (options.maxBounds) {
			this.setMaxBounds(options.maxBounds);
		}

		if (options.center && options.zoom !== undefined) {
			this.setView(L.latLng(options.center), options.zoom, {reset: true});
		}

		this._handlers = [];

		this._layers = {};
		this._zoomBoundLayers = {};
		this._tileLayersNum = 0;

		this.callInitHooks();

		this._addLayers(options.layers);
	},


	// public methods that modify map state

	// replaced by animation-powered implementation in Map.PanAnimation.js
	setView: function (center, zoom) {
		zoom = zoom === undefined ? this.getZoom() : zoom;
		this._resetView(L.latLng(center), this._limitZoom(zoom));
		return this;
	},

	setZoom: function (zoom, options) {
		if (!this._loaded) {
			this._zoom = this._limitZoom(zoom);
			return this;
		}
		return this.setView(this.getCenter(), zoom, {zoom: options});
	},

	zoomIn: function (delta, options) {
		return this.setZoom(this._zoom + (delta || 1), options);
	},

	zoomOut: function (delta, options) {
		return this.setZoom(this._zoom - (delta || 1), options);
	},

	setZoomAround: function (latlng, zoom, options) {
		var scale = this.getZoomScale(zoom),
		    viewHalf = this.getSize().divideBy(2),
		    containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng),

		    centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale),
		    newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

		return this.setView(newCenter, zoom, {zoom: options});
	},

	fitBounds: function (bounds, options) {

		options = options || {};
		bounds = bounds.getBounds ? bounds.getBounds() : L.latLngBounds(bounds);

		var paddingTL = L.point(options.paddingTopLeft || options.padding || [0, 0]),
		    paddingBR = L.point(options.paddingBottomRight || options.padding || [0, 0]),

		    zoom = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR)),
		    paddingOffset = paddingBR.subtract(paddingTL).divideBy(2),

		    swPoint = this.project(bounds.getSouthWest(), zoom),
		    nePoint = this.project(bounds.getNorthEast(), zoom),
		    center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom);

		zoom = options && options.maxZoom ? Math.min(options.maxZoom, zoom) : zoom;

		return this.setView(center, zoom, options);
	},

	fitWorld: function (options) {
		return this.fitBounds([[-90, -180], [90, 180]], options);
	},

	panTo: function (center, options) { // (LatLng)
		return this.setView(center, this._zoom, {pan: options});
	},

	panBy: function (offset) { // (Point)
		// replaced with animated panBy in Map.Animation.js
		this.fire('movestart');

		this._rawPanBy(L.point(offset));

		this.fire('move');
		return this.fire('moveend');
	},

	setMaxBounds: function (bounds, options) {
		bounds = L.latLngBounds(bounds);

		this.options.maxBounds = bounds;

		if (!bounds) {
			this._boundsMinZoom = null;
			this.off('moveend', this._panInsideMaxBounds, this);
			return this;
		}

		var minZoom = this.getBoundsZoom(bounds, true);

		this._boundsMinZoom = minZoom;

		if (this._loaded) {
			if (this._zoom < minZoom) {
				this.setView(bounds.getCenter(), minZoom, options);
			} else {
				this.panInsideBounds(bounds);
			}
		}

		this.on('moveend', this._panInsideMaxBounds, this);

		return this;
	},

	panInsideBounds: function (bounds) {
		bounds = L.latLngBounds(bounds);

		var viewBounds = this.getPixelBounds(),
		    viewSw = viewBounds.getBottomLeft(),
		    viewNe = viewBounds.getTopRight(),
		    sw = this.project(bounds.getSouthWest()),
		    ne = this.project(bounds.getNorthEast()),
		    dx = 0,
		    dy = 0;

		if (viewNe.y < ne.y) { // north
			dy = Math.ceil(ne.y - viewNe.y);
		}
		if (viewNe.x > ne.x) { // east
			dx = Math.floor(ne.x - viewNe.x);
		}
		if (viewSw.y > sw.y) { // south
			dy = Math.floor(sw.y - viewSw.y);
		}
		if (viewSw.x < sw.x) { // west
			dx = Math.ceil(sw.x - viewSw.x);
		}

		if (dx || dy) {
			return this.panBy([dx, dy]);
		}

		return this;
	},

	addLayer: function (layer) {
		// TODO method is too big, refactor

		var id = L.stamp(layer);

		if (this._layers[id]) { return this; }

		this._layers[id] = layer;

		// TODO getMaxZoom, getMinZoom in ILayer (instead of options)
		if (layer.options && (!isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom))) {
			this._zoomBoundLayers[id] = layer;
			this._updateZoomLevels();
		}

		// TODO looks ugly, refactor!!!
		if (this.options.zoomAnimation && L.TileLayer && (layer instanceof L.TileLayer)) {
			this._tileLayersNum++;
			this._tileLayersToLoad++;
			layer.on('load', this._onTileLayerLoad, this);
		}

		if (this._loaded) {
			this._layerAdd(layer);
		}

		return this;
	},

	removeLayer: function (layer) {
		var id = L.stamp(layer);

		if (!this._layers[id]) { return this; }

		if (this._loaded) {
			layer.onRemove(this);
		}

		delete this._layers[id];

		if (this._loaded) {
			this.fire('layerremove', {layer: layer});
		}

		if (this._zoomBoundLayers[id]) {
			delete this._zoomBoundLayers[id];
			this._updateZoomLevels();
		}

		// TODO looks ugly, refactor
		if (this.options.zoomAnimation && L.TileLayer && (layer instanceof L.TileLayer)) {
			this._tileLayersNum--;
			this._tileLayersToLoad--;
			layer.off('load', this._onTileLayerLoad, this);
		}

		return this;
	},

	hasLayer: function (layer) {
		if (!layer) { return false; }

		return (L.stamp(layer) in this._layers);
	},

	eachLayer: function (method, context) {
		for (var i in this._layers) {
			method.call(context, this._layers[i]);
		}
		return this;
	},

	invalidateSize: function (options) {
		options = L.extend({
			animate: false,
			pan: true
		}, options === true ? {animate: true} : options);

		var oldSize = this.getSize();
		this._sizeChanged = true;
		this._initialCenter = null;

		if (this.options.maxBounds) {
			this.setMaxBounds(this.options.maxBounds);
		}

		if (!this._loaded) { return this; }

		var newSize = this.getSize(),
		    oldCenter = oldSize.divideBy(2).round(),
		    newCenter = newSize.divideBy(2).round(),
		    offset = oldCenter.subtract(newCenter);

		if (!offset.x && !offset.y) { return this; }

		if (options.animate && options.pan) {
			this.panBy(offset);

		} else {
			if (options.pan) {
				this._rawPanBy(offset);
			}

			this.fire('move');

			// make sure moveend is not fired too often on resize
			clearTimeout(this._sizeTimer);
			this._sizeTimer = setTimeout(L.bind(this.fire, this, 'moveend'), 200);
		}

		return this.fire('resize', {
			oldSize: oldSize,
			newSize: newSize
		});
	},

	// TODO handler.addTo
	addHandler: function (name, HandlerClass) {
		if (!HandlerClass) { return this; }

		var handler = this[name] = new HandlerClass(this);

		this._handlers.push(handler);

		if (this.options[name]) {
			handler.enable();
		}

		return this;
	},

	remove: function () {
		if (this._loaded) {
			this.fire('unload');
		}

		this._initEvents('off');

		try {
			// throws error in IE6-8
			delete this._container._leaflet;
		} catch (e) {
			this._container._leaflet = undefined;
		}

		this._clearPanes();
		if (this._clearControlPos) {
			this._clearControlPos();
		}

		this._clearHandlers();

		return this;
	},


	// public methods for getting map state

	getCenter: function () { // (Boolean) -> LatLng
		this._checkIfLoaded();

		if (this._initialCenter && !this._moved()) {
			return this._initialCenter;
		}
		return this.layerPointToLatLng(this._getCenterLayerPoint());
	},

	getZoom: function () {
		return this._zoom;
	},

	getBounds: function () {
		var bounds = this.getPixelBounds(),
		    sw = this.unproject(bounds.getBottomLeft()),
		    ne = this.unproject(bounds.getTopRight());

		return new L.LatLngBounds(sw, ne);
	},

	getMinZoom: function () {
		var z1 = this._layersMinZoom === undefined ? 0 : this._layersMinZoom,
		    z2 = this._boundsMinZoom === undefined ? 0 : this._boundsMinZoom;
		return this.options.minZoom === undefined ? Math.max(z1, z2) : this.options.minZoom;
	},

	getMaxZoom: function () {
		return this.options.maxZoom === undefined ?
			(this._layersMaxZoom === undefined ? Infinity : this._layersMaxZoom) :
			this.options.maxZoom;
	},

	getBoundsZoom: function (bounds, inside, padding) { // (LatLngBounds[, Boolean, Point]) -> Number
		bounds = L.latLngBounds(bounds);

		var zoom = this.getMinZoom() - (inside ? 1 : 0),
		    maxZoom = this.getMaxZoom(),
		    size = this.getSize(),

		    nw = bounds.getNorthWest(),
		    se = bounds.getSouthEast(),

		    zoomNotFound = true,
		    boundsSize;

		padding = L.point(padding || [0, 0]);

		do {
			zoom++;
			boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom)).add(padding);
			zoomNotFound = !inside ? size.contains(boundsSize) : boundsSize.x < size.x || boundsSize.y < size.y;

		} while (zoomNotFound && zoom <= maxZoom);

		if (zoomNotFound && inside) {
			return null;
		}

		return inside ? zoom : zoom - 1;
	},

	getSize: function () {
		if (!this._size || this._sizeChanged) {
			this._size = new L.Point(
				this._container.clientWidth,
				this._container.clientHeight);

			this._sizeChanged = false;
		}
		return this._size.clone();
	},

	getPixelBounds: function () {
		var topLeftPoint = this._getTopLeftPoint();
		return new L.Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
	},

	getPixelOrigin: function () {
		this._checkIfLoaded();
		return this._initialTopLeftPoint;
	},

	getPanes: function () {
		return this._panes;
	},

	getContainer: function () {
		return this._container;
	},


	// TODO replace with universal implementation after refactoring projections

	getZoomScale: function (toZoom) {
		var crs = this.options.crs;
		return crs.scale(toZoom) / crs.scale(this._zoom);
	},

	getScaleZoom: function (scale) {
		return this._zoom + (Math.log(scale) / Math.LN2);
	},


	// conversion methods

	project: function (latlng, zoom) { // (LatLng[, Number]) -> Point
		zoom = zoom === undefined ? this._zoom : zoom;
		return this.options.crs.latLngToPoint(L.latLng(latlng), zoom);
	},

	unproject: function (point, zoom) { // (Point[, Number]) -> LatLng
		zoom = zoom === undefined ? this._zoom : zoom;
		return this.options.crs.pointToLatLng(L.point(point), zoom);
	},

	layerPointToLatLng: function (point) { // (Point)
		var projectedPoint = L.point(point).add(this.getPixelOrigin());
		return this.unproject(projectedPoint);
	},

	latLngToLayerPoint: function (latlng) { // (LatLng)
		var projectedPoint = this.project(L.latLng(latlng))._round();
		return projectedPoint._subtract(this.getPixelOrigin());
	},

	containerPointToLayerPoint: function (point) { // (Point)
		return L.point(point).subtract(this._getMapPanePos());
	},

	layerPointToContainerPoint: function (point) { // (Point)
		return L.point(point).add(this._getMapPanePos());
	},

	containerPointToLatLng: function (point) {
		var layerPoint = this.containerPointToLayerPoint(L.point(point));
		return this.layerPointToLatLng(layerPoint);
	},

	latLngToContainerPoint: function (latlng) {
		return this.layerPointToContainerPoint(this.latLngToLayerPoint(L.latLng(latlng)));
	},

	mouseEventToContainerPoint: function (e) { // (MouseEvent)
		return L.DomEvent.getMousePosition(e, this._container);
	},

	mouseEventToLayerPoint: function (e) { // (MouseEvent)
		return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
	},

	mouseEventToLatLng: function (e) { // (MouseEvent)
		return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
	},


	// map initialization methods

	_initContainer: function (id) {
		var container = this._container = L.DomUtil.get(id);

		if (!container) {
			throw new Error('Map container not found.');
		} else if (container._leaflet) {
			throw new Error('Map container is already initialized.');
		}

		container._leaflet = true;
	},

	_initLayout: function () {
		var container = this._container;

		L.DomUtil.addClass(container, 'leaflet-container' +
			(L.Browser.touch ? ' leaflet-touch' : '') +
			(L.Browser.retina ? ' leaflet-retina' : '') +
			(this.options.fadeAnimation ? ' leaflet-fade-anim' : ''));

		var position = L.DomUtil.getStyle(container, 'position');

		if (position !== 'absolute' && position !== 'relative' && position !== 'fixed') {
			container.style.position = 'relative';
		}

		this._initPanes();

		if (this._initControlPos) {
			this._initControlPos();
		}
	},

	_initPanes: function () {
		var panes = this._panes = {};

		this._mapPane = panes.mapPane = this._createPane('leaflet-map-pane', this._container);

		this._tilePane = panes.tilePane = this._createPane('leaflet-tile-pane', this._mapPane);
		panes.objectsPane = this._createPane('leaflet-objects-pane', this._mapPane);
		panes.shadowPane = this._createPane('leaflet-shadow-pane');
		panes.overlayPane = this._createPane('leaflet-overlay-pane');
		panes.markerPane = this._createPane('leaflet-marker-pane');
		panes.popupPane = this._createPane('leaflet-popup-pane');

		var zoomHide = ' leaflet-zoom-hide';

		if (!this.options.markerZoomAnimation) {
			L.DomUtil.addClass(panes.markerPane, zoomHide);
			L.DomUtil.addClass(panes.shadowPane, zoomHide);
			L.DomUtil.addClass(panes.popupPane, zoomHide);
		}
	},

	_createPane: function (className, container) {
		return L.DomUtil.create('div', className, container || this._panes.objectsPane);
	},

	_clearPanes: function () {
		this._container.removeChild(this._mapPane);
	},

	_addLayers: function (layers) {
		layers = layers ? (L.Util.isArray(layers) ? layers : [layers]) : [];

		for (var i = 0, len = layers.length; i < len; i++) {
			this.addLayer(layers[i]);
		}
	},


	// private methods that modify map state

	_resetView: function (center, zoom, preserveMapOffset, afterZoomAnim) {

		var zoomChanged = (this._zoom !== zoom);

		if (!afterZoomAnim) {
			this.fire('movestart');

			if (zoomChanged) {
				this.fire('zoomstart');
			}
		}

		this._zoom = zoom;
		this._initialCenter = center;

		this._initialTopLeftPoint = this._getNewTopLeftPoint(center);

		if (!preserveMapOffset) {
			L.DomUtil.setPosition(this._mapPane, new L.Point(0, 0));
		} else {
			this._initialTopLeftPoint._add(this._getMapPanePos());
		}

		this._tileLayersToLoad = this._tileLayersNum;

		var loading = !this._loaded;
		this._loaded = true;

		if (loading) {
			this.fire('load');
			this.eachLayer(this._layerAdd, this);
		}

		this.fire('viewreset', {hard: !preserveMapOffset});

		this.fire('move');

		if (zoomChanged || afterZoomAnim) {
			this.fire('zoomend');
		}

		this.fire('moveend', {hard: !preserveMapOffset});
	},

	_rawPanBy: function (offset) {
		L.DomUtil.setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
	},

	_getZoomSpan: function () {
		return this.getMaxZoom() - this.getMinZoom();
	},

	_updateZoomLevels: function () {
		var i,
			minZoom = Infinity,
			maxZoom = -Infinity,
			oldZoomSpan = this._getZoomSpan();

		for (i in this._zoomBoundLayers) {
			var layer = this._zoomBoundLayers[i];
			if (!isNaN(layer.options.minZoom)) {
				minZoom = Math.min(minZoom, layer.options.minZoom);
			}
			if (!isNaN(layer.options.maxZoom)) {
				maxZoom = Math.max(maxZoom, layer.options.maxZoom);
			}
		}

		if (i === undefined) { // we have no tilelayers
			this._layersMaxZoom = this._layersMinZoom = undefined;
		} else {
			this._layersMaxZoom = maxZoom;
			this._layersMinZoom = minZoom;
		}

		if (oldZoomSpan !== this._getZoomSpan()) {
			this.fire('zoomlevelschange');
		}
	},

	_panInsideMaxBounds: function () {
		this.panInsideBounds(this.options.maxBounds);
	},

	_checkIfLoaded: function () {
		if (!this._loaded) {
			throw new Error('Set map center and zoom first.');
		}
	},

	// map events

	_initEvents: function (onOff) {
		if (!L.DomEvent) { return; }

		onOff = onOff || 'on';

		L.DomEvent[onOff](this._container, 'click', this._onMouseClick, this);

		var events = ['dblclick', 'mousedown', 'mouseup', 'mouseenter',
		              'mouseleave', 'mousemove', 'contextmenu'],
		    i, len;

		for (i = 0, len = events.length; i < len; i++) {
			L.DomEvent[onOff](this._container, events[i], this._fireMouseEvent, this);
		}

		if (this.options.trackResize) {
			L.DomEvent[onOff](window, 'resize', this._onResize, this);
		}
	},

	_onResize: function () {
		L.Util.cancelAnimFrame(this._resizeRequest);
		this._resizeRequest = L.Util.requestAnimFrame(
		        this.invalidateSize, this, false, this._container);
	},

	_onMouseClick: function (e) {
		if (!this._loaded || (!e._simulated &&
		        ((this.dragging && this.dragging.moved()) ||
		         (this.boxZoom  && this.boxZoom.moved()))) ||
		            L.DomEvent._skipped(e)) { return; }

		this.fire('preclick');
		this._fireMouseEvent(e);
	},

	_fireMouseEvent: function (e) {
		if (!this._loaded || L.DomEvent._skipped(e)) { return; }

		var type = e.type;

		type = (type === 'mouseenter' ? 'mouseover' : (type === 'mouseleave' ? 'mouseout' : type));

		if (!this.hasEventListeners(type)) { return; }

		if (type === 'contextmenu') {
			L.DomEvent.preventDefault(e);
		}

		var containerPoint = this.mouseEventToContainerPoint(e),
		    layerPoint = this.containerPointToLayerPoint(containerPoint),
		    latlng = this.layerPointToLatLng(layerPoint);

		this.fire(type, {
			latlng: latlng,
			layerPoint: layerPoint,
			containerPoint: containerPoint,
			originalEvent: e
		});
	},

	_onTileLayerLoad: function () {
		this._tileLayersToLoad--;
		if (this._tileLayersNum && !this._tileLayersToLoad) {
			this.fire('tilelayersload');
		}
	},

	_clearHandlers: function () {
		for (var i = 0, len = this._handlers.length; i < len; i++) {
			this._handlers[i].disable();
		}
	},

	whenReady: function (callback, context) {
		if (this._loaded) {
			callback.call(context || this, this);
		} else {
			this.on('load', callback, context);
		}
		return this;
	},

	_layerAdd: function (layer) {
		layer.onAdd(this);
		this.fire('layeradd', {layer: layer});
	},


	// private methods for getting map state

	_getMapPanePos: function () {
		return L.DomUtil.getPosition(this._mapPane);
	},

	_moved: function () {
		var pos = this._getMapPanePos();
		return pos && !pos.equals([0, 0]);
	},

	_getTopLeftPoint: function () {
		return this.getPixelOrigin().subtract(this._getMapPanePos());
	},

	_getNewTopLeftPoint: function (center, zoom) {
		var viewHalf = this.getSize()._divideBy(2);
		// TODO round on display, not calculation to increase precision?
		return this.project(center, zoom)._subtract(viewHalf)._round();
	},

	_latLngToNewLayerPoint: function (latlng, newZoom, newCenter) {
		var topLeft = this._getNewTopLeftPoint(newCenter, newZoom).add(this._getMapPanePos());
		return this.project(latlng, newZoom)._subtract(topLeft);
	},

	// layer point of the current center
	_getCenterLayerPoint: function () {
		return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
	},

	// offset of the specified place to the current center in pixels
	_getCenterOffset: function (latlng) {
		return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
	},

	_limitZoom: function (zoom) {
		var min = this.getMinZoom(),
		    max = this.getMaxZoom();

		return Math.max(min, Math.min(max, zoom));
	}
});

L.map = function (id, options) {
	return new L.Map(id, options);
};


/*
 * L.TileLayer is used for standard xyz-numbered tile layers.
 */

L.TileLayer = L.Class.extend({
	includes: L.Mixin.Events,

	options: {
		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,
		subdomains: 'abc',
		errorTileUrl: '',
		attribution: '',
		zoomOffset: 0,
		opacity: 1,
		/*
		maxNativeZoom: null,
		zIndex: null,
		tms: false,
		continuousWorld: false,
		noWrap: false,
		zoomReverse: false,
		detectRetina: false,
		reuseTiles: false,
		bounds: false,
		*/
		unloadInvisibleTiles: L.Browser.mobile,
		updateWhenIdle: L.Browser.mobile
	},

	initialize: function (url, options) {
		options = L.setOptions(this, options);

		// detecting retina displays, adjusting tileSize and zoom levels
		if (options.detectRetina && L.Browser.retina && options.maxZoom > 0) {

			options.tileSize = Math.floor(options.tileSize / 2);
			options.zoomOffset++;

			if (options.minZoom > 0) {
				options.minZoom--;
			}
			this.options.maxZoom--;
		}

		if (options.bounds) {
			options.bounds = L.latLngBounds(options.bounds);
		}

		this._url = url;

		var subdomains = this.options.subdomains;

		if (typeof subdomains === 'string') {
			this.options.subdomains = subdomains.split('');
		}
	},

	onAdd: function (map) {
		this._map = map;
		this._animated = map._zoomAnimated;

		// create a container div for tiles
		this._initContainer();

		// set up events
		map.on({
			'viewreset': this._reset,
			'moveend': this._update
		}, this);

		if (this._animated) {
			map.on({
				'zoomanim': this._animateZoom,
				'zoomend': this._endZoomAnim
			}, this);
		}

		if (!this.options.updateWhenIdle) {
			this._limitedUpdate = L.Util.limitExecByInterval(this._update, 150, this);
			map.on('move', this._limitedUpdate, this);
		}

		this._reset();
		this._update();
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	onRemove: function (map) {
		this._container.parentNode.removeChild(this._container);

		map.off({
			'viewreset': this._reset,
			'moveend': this._update
		}, this);

		if (this._animated) {
			map.off({
				'zoomanim': this._animateZoom,
				'zoomend': this._endZoomAnim
			}, this);
		}

		if (!this.options.updateWhenIdle) {
			map.off('move', this._limitedUpdate, this);
		}

		this._container = null;
		this._map = null;
	},

	bringToFront: function () {
		var pane = this._map._panes.tilePane;

		if (this._container) {
			pane.appendChild(this._container);
			this._setAutoZIndex(pane, Math.max);
		}

		return this;
	},

	bringToBack: function () {
		var pane = this._map._panes.tilePane;

		if (this._container) {
			pane.insertBefore(this._container, pane.firstChild);
			this._setAutoZIndex(pane, Math.min);
		}

		return this;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	getContainer: function () {
		return this._container;
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;

		if (this._map) {
			this._updateOpacity();
		}

		return this;
	},

	setZIndex: function (zIndex) {
		this.options.zIndex = zIndex;
		this._updateZIndex();

		return this;
	},

	setUrl: function (url, noRedraw) {
		this._url = url;

		if (!noRedraw) {
			this.redraw();
		}

		return this;
	},

	redraw: function () {
		if (this._map) {
			this._reset({hard: true});
			this._update();
		}
		return this;
	},

	_updateZIndex: function () {
		if (this._container && this.options.zIndex !== undefined) {
			this._container.style.zIndex = this.options.zIndex;
		}
	},

	_setAutoZIndex: function (pane, compare) {

		var layers = pane.children,
		    edgeZIndex = -compare(Infinity, -Infinity), // -Infinity for max, Infinity for min
		    zIndex, i, len;

		for (i = 0, len = layers.length; i < len; i++) {

			if (layers[i] !== this._container) {
				zIndex = parseInt(layers[i].style.zIndex, 10);

				if (!isNaN(zIndex)) {
					edgeZIndex = compare(edgeZIndex, zIndex);
				}
			}
		}

		this.options.zIndex = this._container.style.zIndex =
		        (isFinite(edgeZIndex) ? edgeZIndex : 0) + compare(1, -1);
	},

	_updateOpacity: function () {
		var i,
		    tiles = this._tiles;

		if (L.Browser.ielt9) {
			for (i in tiles) {
				L.DomUtil.setOpacity(tiles[i], this.options.opacity);
			}
		} else {
			L.DomUtil.setOpacity(this._container, this.options.opacity);
		}
	},

	_initContainer: function () {
		var tilePane = this._map._panes.tilePane;

		if (!this._container) {
			this._container = L.DomUtil.create('div', 'leaflet-layer');

			this._updateZIndex();

			if (this._animated) {
				var className = 'leaflet-tile-container';

				this._bgBuffer = L.DomUtil.create('div', className, this._container);
				this._tileContainer = L.DomUtil.create('div', className, this._container);

			} else {
				this._tileContainer = this._container;
			}

			tilePane.appendChild(this._container);

			if (this.options.opacity < 1) {
				this._updateOpacity();
			}
		}
	},

	_reset: function (e) {
		for (var key in this._tiles) {
			this.fire('tileunload', {tile: this._tiles[key]});
		}

		this._tiles = {};
		this._tilesToLoad = 0;

		if (this.options.reuseTiles) {
			this._unusedTiles = [];
		}

		this._tileContainer.innerHTML = '';

		if (this._animated && e && e.hard) {
			this._clearBgBuffer();
		}

		this._initContainer();
	},

	_getTileSize: function () {
		var map = this._map,
		    zoom = map.getZoom(),
		    zoomN = this.options.maxNativeZoom,
		    tileSize = this.options.tileSize;

		if (zoomN && zoom > zoomN) {
			tileSize = Math.round(map.getZoomScale(zoom) / map.getZoomScale(zoomN) * tileSize);
		}

		return tileSize;
	},

	_update: function () {

		if (!this._map) { return; }

		var map = this._map,
		    bounds = map.getPixelBounds(),
		    zoom = map.getZoom(),
		    tileSize = this._getTileSize();

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}

		var tileBounds = L.bounds(
		        bounds.min.divideBy(tileSize)._floor(),
		        bounds.max.divideBy(tileSize)._floor());

		this._addTilesFromCenterOut(tileBounds);

		if (this.options.unloadInvisibleTiles || this.options.reuseTiles) {
			this._removeOtherTiles(tileBounds);
		}
	},

	_addTilesFromCenterOut: function (bounds) {
		var queue = [],
		    center = bounds.getCenter();

		var j, i, point;

		for (j = bounds.min.y; j <= bounds.max.y; j++) {
			for (i = bounds.min.x; i <= bounds.max.x; i++) {
				point = new L.Point(i, j);

				if (this._tileShouldBeLoaded(point)) {
					queue.push(point);
				}
			}
		}

		var tilesToLoad = queue.length;

		if (tilesToLoad === 0) { return; }

		// load tiles in order of their distance to center
		queue.sort(function (a, b) {
			return a.distanceTo(center) - b.distanceTo(center);
		});

		var fragment = document.createDocumentFragment();

		// if its the first batch of tiles to load
		if (!this._tilesToLoad) {
			this.fire('loading');
		}

		this._tilesToLoad += tilesToLoad;

		for (i = 0; i < tilesToLoad; i++) {
			this._addTile(queue[i], fragment);
		}

		this._tileContainer.appendChild(fragment);
	},

	_tileShouldBeLoaded: function (tilePoint) {
		if ((tilePoint.x + ':' + tilePoint.y) in this._tiles) {
			return false; // already loaded
		}

		var options = this.options;

		if (!options.continuousWorld) {
			var limit = this._getWrapTileNum();

			// don't load if exceeds world bounds
			if ((options.noWrap && (tilePoint.x < 0 || tilePoint.x >= limit)) ||
				tilePoint.y < 0 || tilePoint.y >= limit) { return false; }
		}

		if (options.bounds) {
			var tileSize = options.tileSize,
			    nwPoint = tilePoint.multiplyBy(tileSize),
			    sePoint = nwPoint.add([tileSize, tileSize]),
			    nw = this._map.unproject(nwPoint),
			    se = this._map.unproject(sePoint);

			// TODO temporary hack, will be removed after refactoring projections
			// https://github.com/Leaflet/Leaflet/issues/1618
			if (!options.continuousWorld && !options.noWrap) {
				nw = nw.wrap();
				se = se.wrap();
			}

			if (!options.bounds.intersects([nw, se])) { return false; }
		}

		return true;
	},

	_removeOtherTiles: function (bounds) {
		var kArr, x, y, key;

		for (key in this._tiles) {
			kArr = key.split(':');
			x = parseInt(kArr[0], 10);
			y = parseInt(kArr[1], 10);

			// remove tile if it's out of bounds
			if (x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) {
				this._removeTile(key);
			}
		}
	},

	_removeTile: function (key) {
		var tile = this._tiles[key];

		this.fire('tileunload', {tile: tile, url: tile.src});

		if (this.options.reuseTiles) {
			L.DomUtil.removeClass(tile, 'leaflet-tile-loaded');
			this._unusedTiles.push(tile);

		} else if (tile.parentNode === this._tileContainer) {
			this._tileContainer.removeChild(tile);
		}

		// for https://github.com/CloudMade/Leaflet/issues/137
		if (!L.Browser.android) {
			tile.onload = null;
			tile.src = L.Util.emptyImageUrl;
		}

		delete this._tiles[key];
	},

	_addTile: function (tilePoint, container) {
		var tilePos = this._getTilePos(tilePoint);

		// get unused tile - or create a new tile
		var tile = this._getTile();

		/*
		Chrome 20 layouts much faster with top/left (verify with timeline, frames)
		Android 4 browser has display issues with top/left and requires transform instead
		Android 2 browser requires top/left or tiles disappear on load or first drag
		(reappear after zoom) https://github.com/CloudMade/Leaflet/issues/866
		(other browsers don't currently care) - see debug/hacks/jitter.html for an example
		*/
		L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome || L.Browser.android23);

		this._tiles[tilePoint.x + ':' + tilePoint.y] = tile;

		this._loadTile(tile, tilePoint);

		if (tile.parentNode !== this._tileContainer) {
			container.appendChild(tile);
		}
	},

	_getZoomForUrl: function () {

		var options = this.options,
		    zoom = this._map.getZoom();

		if (options.zoomReverse) {
			zoom = options.maxZoom - zoom;
		}

		zoom += options.zoomOffset;

		return options.maxNativeZoom ? Math.min(zoom, options.maxNativeZoom) : zoom;
	},

	_getTilePos: function (tilePoint) {
		var origin = this._map.getPixelOrigin(),
		    tileSize = this._getTileSize();

		return tilePoint.multiplyBy(tileSize).subtract(origin);
	},

	// image-specific code (override to implement e.g. Canvas or SVG tile layer)

	getTileUrl: function (tilePoint) {
		return L.Util.template(this._url, L.extend({
			s: this._getSubdomain(tilePoint),
			z: tilePoint.z,
			x: tilePoint.x,
			y: tilePoint.y
		}, this.options));
	},

	_getWrapTileNum: function () {
		// TODO refactor, limit is not valid for non-standard projections
		return Math.pow(2, this._getZoomForUrl());
	},

	_adjustTilePoint: function (tilePoint) {

		var limit = this._getWrapTileNum();

		// wrap tile coordinates
		if (!this.options.continuousWorld && !this.options.noWrap) {
			tilePoint.x = ((tilePoint.x % limit) + limit) % limit;
		}

		if (this.options.tms) {
			tilePoint.y = limit - tilePoint.y - 1;
		}

		tilePoint.z = this._getZoomForUrl();
	},

	_getSubdomain: function (tilePoint) {
		var index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
		return this.options.subdomains[index];
	},

	_getTile: function () {
		if (this.options.reuseTiles && this._unusedTiles.length > 0) {
			var tile = this._unusedTiles.pop();
			this._resetTile(tile);
			return tile;
		}
		return this._createTile();
	},

	// Override if data stored on a tile needs to be cleaned up before reuse
	_resetTile: function (/*tile*/) {},

	_createTile: function () {
		var tile = L.DomUtil.create('img', 'leaflet-tile');
		tile.style.width = tile.style.height = this._getTileSize() + 'px';
		tile.galleryimg = 'no';

		tile.onselectstart = tile.onmousemove = L.Util.falseFn;

		if (L.Browser.ielt9 && this.options.opacity !== undefined) {
			L.DomUtil.setOpacity(tile, this.options.opacity);
		}
		return tile;
	},

	_loadTile: function (tile, tilePoint) {
		tile._layer  = this;
		tile.onload  = this._tileOnLoad;
		tile.onerror = this._tileOnError;

		this._adjustTilePoint(tilePoint);
		tile.src     = this.getTileUrl(tilePoint);
	},

	_tileLoaded: function () {
		this._tilesToLoad--;

		if (this._animated) {
			L.DomUtil.addClass(this._tileContainer, 'leaflet-zoom-animated');
		}

		if (!this._tilesToLoad) {
			this.fire('load');

			if (this._animated) {
				// clear scaled tiles after all new tiles are loaded (for performance)
				clearTimeout(this._clearBgBufferTimer);
				this._clearBgBufferTimer = setTimeout(L.bind(this._clearBgBuffer, this), 500);
			}
		}
	},

	_tileOnLoad: function () {
		var layer = this._layer;

		//Only if we are loading an actual image
		if (this.src !== L.Util.emptyImageUrl) {
			L.DomUtil.addClass(this, 'leaflet-tile-loaded');

			layer.fire('tileload', {
				tile: this,
				url: this.src
			});
		}

		layer._tileLoaded();
	},

	_tileOnError: function () {
		var layer = this._layer;

		layer.fire('tileerror', {
			tile: this,
			url: this.src
		});

		var newUrl = layer.options.errorTileUrl;
		if (newUrl) {
			this.src = newUrl;
		}

		layer._tileLoaded();
	}
});

L.tileLayer = function (url, options) {
	return new L.TileLayer(url, options);
};


/*
 * L.Path is a base class for rendering vector paths on a map. Inherited by Polyline, Circle, etc.
 */

L.Path = L.Class.extend({
	includes: [L.Mixin.Events],

	statics: {
		// how much to extend the clip area around the map view
		// (relative to its size, e.g. 0.5 is half the screen in each direction)
		// set it so that SVG element doesn't exceed 1280px (vectors flicker on dragend if it is)
		CLIP_PADDING: (function () {
			var max = L.Browser.mobile ? 1280 : 2000,
			    target = (max / Math.max(window.outerWidth, window.outerHeight) - 1) / 2;
			return Math.max(0, Math.min(0.5, target));
		})()
	},

	options: {
		stroke: true,
		color: '#0033ff',
		dashArray: null,
		lineCap: null,
		lineJoin: null,
		weight: 5,
		opacity: 0.5,

		fill: false,
		fillColor: null, //same as color by default
		fillOpacity: 0.2,

		clickable: true
	},

	initialize: function (options) {
		L.setOptions(this, options);
	},

	onAdd: function (map) {
		this._map = map;

		if (!this._container) {
			this._initElements();
			this._initEvents();
		}

		this.projectLatlngs();
		this._updatePath();

		if (this._container) {
			this._map._pathRoot.appendChild(this._container);
		}

		this.fire('add');

		map.on({
			'viewreset': this.projectLatlngs,
			'moveend': this._updatePath
		}, this);
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	onRemove: function (map) {
		map._pathRoot.removeChild(this._container);

		// Need to fire remove event before we set _map to null as the event hooks might need the object
		this.fire('remove');
		this._map = null;

		if (L.Browser.vml) {
			this._container = null;
			this._stroke = null;
			this._fill = null;
		}

		map.off({
			'viewreset': this.projectLatlngs,
			'moveend': this._updatePath
		}, this);
	},

	projectLatlngs: function () {
		// do all projection stuff here
	},

	setStyle: function (style) {
		L.setOptions(this, style);

		if (this._container) {
			this._updateStyle();
		}

		return this;
	},

	redraw: function () {
		if (this._map) {
			this.projectLatlngs();
			this._updatePath();
		}
		return this;
	}
});

L.Map.include({
	_updatePathViewport: function () {
		var p = L.Path.CLIP_PADDING,
		    size = this.getSize(),
		    panePos = L.DomUtil.getPosition(this._mapPane),
		    min = panePos.multiplyBy(-1)._subtract(size.multiplyBy(p)._round()),
		    max = min.add(size.multiplyBy(1 + p * 2)._round());

		this._pathViewport = new L.Bounds(min, max);
	}
});


/*
 * Extends L.Path with SVG-specific rendering code.
 */

L.Path.SVG_NS = 'http://www.w3.org/2000/svg';

L.Browser.svg = !!(document.createElementNS && document.createElementNS(L.Path.SVG_NS, 'svg').createSVGRect);

L.Path = L.Path.extend({
	statics: {
		SVG: L.Browser.svg
	},

	bringToFront: function () {
		var root = this._map._pathRoot,
		    path = this._container;

		if (path && root.lastChild !== path) {
			root.appendChild(path);
		}
		return this;
	},

	bringToBack: function () {
		var root = this._map._pathRoot,
		    path = this._container,
		    first = root.firstChild;

		if (path && first !== path) {
			root.insertBefore(path, first);
		}
		return this;
	},

	getPathString: function () {
		// form path string here
	},

	_createElement: function (name) {
		return document.createElementNS(L.Path.SVG_NS, name);
	},

	_initElements: function () {
		this._map._initPathRoot();
		this._initPath();
		this._initStyle();
	},

	_initPath: function () {
		this._container = this._createElement('g');

		this._path = this._createElement('path');
		this._container.appendChild(this._path);
	},

	_initStyle: function () {
		if (this.options.stroke) {
			this._path.setAttribute('stroke-linejoin', 'round');
			this._path.setAttribute('stroke-linecap', 'round');
		}
		if (this.options.fill) {
			this._path.setAttribute('fill-rule', 'evenodd');
		}
		if (this.options.pointerEvents) {
			this._path.setAttribute('pointer-events', this.options.pointerEvents);
		}
		if (!this.options.clickable && !this.options.pointerEvents) {
			this._path.setAttribute('pointer-events', 'none');
		}
		this._updateStyle();
	},

	_updateStyle: function () {
		if (this.options.stroke) {
			this._path.setAttribute('stroke', this.options.color);
			this._path.setAttribute('stroke-opacity', this.options.opacity);
			this._path.setAttribute('stroke-width', this.options.weight);
			if (this.options.dashArray) {
				this._path.setAttribute('stroke-dasharray', this.options.dashArray);
			} else {
				this._path.removeAttribute('stroke-dasharray');
			}
			if (this.options.lineCap) {
				this._path.setAttribute('stroke-linecap', this.options.lineCap);
			}
			if (this.options.lineJoin) {
				this._path.setAttribute('stroke-linejoin', this.options.lineJoin);
			}
		} else {
			this._path.setAttribute('stroke', 'none');
		}
		if (this.options.fill) {
			this._path.setAttribute('fill', this.options.fillColor || this.options.color);
			this._path.setAttribute('fill-opacity', this.options.fillOpacity);
		} else {
			this._path.setAttribute('fill', 'none');
		}
	},

	_updatePath: function () {
		var str = this.getPathString();
		if (!str) {
			// fix webkit empty string parsing bug
			str = 'M0 0';
		}
		this._path.setAttribute('d', str);
	},

	// TODO remove duplication with L.Map
	_initEvents: function () {
		if (this.options.clickable) {
			if (L.Browser.svg || !L.Browser.vml) {
				this._path.setAttribute('class', 'leaflet-clickable');
			}

			L.DomEvent.on(this._container, 'click', this._onMouseClick, this);

			var events = ['dblclick', 'mousedown', 'mouseover',
			              'mouseout', 'mousemove', 'contextmenu'];
			for (var i = 0; i < events.length; i++) {
				L.DomEvent.on(this._container, events[i], this._fireMouseEvent, this);
			}
		}
	},

	_onMouseClick: function (e) {
		if (this._map.dragging && this._map.dragging.moved()) { return; }

		this._fireMouseEvent(e);
	},

	_fireMouseEvent: function (e) {
		if (!this.hasEventListeners(e.type)) { return; }

		var map = this._map,
		    containerPoint = map.mouseEventToContainerPoint(e),
		    layerPoint = map.containerPointToLayerPoint(containerPoint),
		    latlng = map.layerPointToLatLng(layerPoint);

		this.fire(e.type, {
			latlng: latlng,
			layerPoint: layerPoint,
			containerPoint: containerPoint,
			originalEvent: e
		});

		if (e.type === 'contextmenu') {
			L.DomEvent.preventDefault(e);
		}
		if (e.type !== 'mousemove') {
			L.DomEvent.stopPropagation(e);
		}
	}
});

L.Map.include({
	_initPathRoot: function () {
		if (!this._pathRoot) {
			this._pathRoot = L.Path.prototype._createElement('svg');
			this._panes.overlayPane.appendChild(this._pathRoot);

			if (this.options.zoomAnimation && L.Browser.any3d) {
				this._pathRoot.setAttribute('class', ' leaflet-zoom-animated');

				this.on({
					'zoomanim': this._animatePathZoom,
					'zoomend': this._endPathZoom
				});
			} else {
				this._pathRoot.setAttribute('class', ' leaflet-zoom-hide');
			}

			this.on('moveend', this._updateSvgViewport);
			this._updateSvgViewport();
		}
	},

	_animatePathZoom: function (e) {
		var scale = this.getZoomScale(e.zoom),
		    offset = this._getCenterOffset(e.center)._multiplyBy(-scale)._add(this._pathViewport.min);

		this._pathRoot.style[L.DomUtil.TRANSFORM] =
		        L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ') ';

		this._pathZooming = true;
	},

	_endPathZoom: function () {
		this._pathZooming = false;
	},

	_updateSvgViewport: function () {

		if (this._pathZooming) {
			// Do not update SVGs while a zoom animation is going on otherwise the animation will break.
			// When the zoom animation ends we will be updated again anyway
			// This fixes the case where you do a momentum move and zoom while the move is still ongoing.
			return;
		}

		this._updatePathViewport();

		var vp = this._pathViewport,
		    min = vp.min,
		    max = vp.max,
		    width = max.x - min.x,
		    height = max.y - min.y,
		    root = this._pathRoot,
		    pane = this._panes.overlayPane;

		// Hack to make flicker on drag end on mobile webkit less irritating
		if (L.Browser.mobileWebkit) {
			pane.removeChild(root);
		}

		L.DomUtil.setPosition(root, min);
		root.setAttribute('width', width);
		root.setAttribute('height', height);
		root.setAttribute('viewBox', [min.x, min.y, width, height].join(' '));

		if (L.Browser.mobileWebkit) {
			pane.appendChild(root);
		}
	}
});


/*
 * Popup extension to L.Path (polylines, polygons, circles), adding popup-related methods.
 */

L.Path.include({

	bindPopup: function (content, options) {

		if (content instanceof L.Popup) {
			this._popup = content;
		} else {
			if (!this._popup || options) {
				this._popup = new L.Popup(options, this);
			}
			this._popup.setContent(content);
		}

		if (!this._popupHandlersAdded) {
			this
			    .on('click', this._openPopup, this)
			    .on('remove', this.closePopup, this);

			this._popupHandlersAdded = true;
		}

		return this;
	},

	unbindPopup: function () {
		if (this._popup) {
			this._popup = null;
			this
			    .off('click', this._openPopup)
			    .off('remove', this.closePopup);

			this._popupHandlersAdded = false;
		}
		return this;
	},

	openPopup: function (latlng) {

		if (this._popup) {
			// open the popup from one of the path's points if not specified
			latlng = latlng || this._latlng ||
			         this._latlngs[Math.floor(this._latlngs.length / 2)];

			this._openPopup({latlng: latlng});
		}

		return this;
	},

	closePopup: function () {
		if (this._popup) {
			this._popup._close();
		}
		return this;
	},

	_openPopup: function (e) {
		this._popup.setLatLng(e.latlng);
		this._map.openPopup(this._popup);
	}
});


/*
 * L.LineUtil contains different utility functions for line segments
 * and polylines (clipping, simplification, distances, etc.)
 */

/*jshint bitwise:false */ // allow bitwise oprations for this file

L.LineUtil = {

	// Simplify polyline with vertex reduction and Douglas-Peucker simplification.
	// Improves rendering performance dramatically by lessening the number of points to draw.

	simplify: function (/*Point[]*/ points, /*Number*/ tolerance) {
		if (!tolerance || !points.length) {
			return points.slice();
		}

		var sqTolerance = tolerance * tolerance;

		// stage 1: vertex reduction
		points = this._reducePoints(points, sqTolerance);

		// stage 2: Douglas-Peucker simplification
		points = this._simplifyDP(points, sqTolerance);

		return points;
	},

	// distance from a point to a segment between two points
	pointToSegmentDistance:  function (/*Point*/ p, /*Point*/ p1, /*Point*/ p2) {
		return Math.sqrt(this._sqClosestPointOnSegment(p, p1, p2, true));
	},

	closestPointOnSegment: function (/*Point*/ p, /*Point*/ p1, /*Point*/ p2) {
		return this._sqClosestPointOnSegment(p, p1, p2);
	},

	// Douglas-Peucker simplification, see http://en.wikipedia.org/wiki/Douglas-Peucker_algorithm
	_simplifyDP: function (points, sqTolerance) {

		var len = points.length,
		    ArrayConstructor = typeof Uint8Array !== undefined + '' ? Uint8Array : Array,
		    markers = new ArrayConstructor(len);

		markers[0] = markers[len - 1] = 1;

		this._simplifyDPStep(points, markers, sqTolerance, 0, len - 1);

		var i,
		    newPoints = [];

		for (i = 0; i < len; i++) {
			if (markers[i]) {
				newPoints.push(points[i]);
			}
		}

		return newPoints;
	},

	_simplifyDPStep: function (points, markers, sqTolerance, first, last) {

		var maxSqDist = 0,
		    index, i, sqDist;

		for (i = first + 1; i <= last - 1; i++) {
			sqDist = this._sqClosestPointOnSegment(points[i], points[first], points[last], true);

			if (sqDist > maxSqDist) {
				index = i;
				maxSqDist = sqDist;
			}
		}

		if (maxSqDist > sqTolerance) {
			markers[index] = 1;

			this._simplifyDPStep(points, markers, sqTolerance, first, index);
			this._simplifyDPStep(points, markers, sqTolerance, index, last);
		}
	},

	// reduce points that are too close to each other to a single point
	_reducePoints: function (points, sqTolerance) {
		var reducedPoints = [points[0]];

		for (var i = 1, prev = 0, len = points.length; i < len; i++) {
			if (this._sqDist(points[i], points[prev]) > sqTolerance) {
				reducedPoints.push(points[i]);
				prev = i;
			}
		}
		if (prev < len - 1) {
			reducedPoints.push(points[len - 1]);
		}
		return reducedPoints;
	},

	// Cohen-Sutherland line clipping algorithm.
	// Used to avoid rendering parts of a polyline that are not currently visible.

	clipSegment: function (a, b, bounds, useLastCode) {
		var codeA = useLastCode ? this._lastCode : this._getBitCode(a, bounds),
		    codeB = this._getBitCode(b, bounds),

		    codeOut, p, newCode;

		// save 2nd code to avoid calculating it on the next segment
		this._lastCode = codeB;

		while (true) {
			// if a,b is inside the clip window (trivial accept)
			if (!(codeA | codeB)) {
				return [a, b];
			// if a,b is outside the clip window (trivial reject)
			} else if (codeA & codeB) {
				return false;
			// other cases
			} else {
				codeOut = codeA || codeB;
				p = this._getEdgeIntersection(a, b, codeOut, bounds);
				newCode = this._getBitCode(p, bounds);

				if (codeOut === codeA) {
					a = p;
					codeA = newCode;
				} else {
					b = p;
					codeB = newCode;
				}
			}
		}
	},

	_getEdgeIntersection: function (a, b, code, bounds) {
		var dx = b.x - a.x,
		    dy = b.y - a.y,
		    min = bounds.min,
		    max = bounds.max;

		if (code & 8) { // top
			return new L.Point(a.x + dx * (max.y - a.y) / dy, max.y);
		} else if (code & 4) { // bottom
			return new L.Point(a.x + dx * (min.y - a.y) / dy, min.y);
		} else if (code & 2) { // right
			return new L.Point(max.x, a.y + dy * (max.x - a.x) / dx);
		} else if (code & 1) { // left
			return new L.Point(min.x, a.y + dy * (min.x - a.x) / dx);
		}
	},

	_getBitCode: function (/*Point*/ p, bounds) {
		var code = 0;

		if (p.x < bounds.min.x) { // left
			code |= 1;
		} else if (p.x > bounds.max.x) { // right
			code |= 2;
		}
		if (p.y < bounds.min.y) { // bottom
			code |= 4;
		} else if (p.y > bounds.max.y) { // top
			code |= 8;
		}

		return code;
	},

	// square distance (to avoid unnecessary Math.sqrt calls)
	_sqDist: function (p1, p2) {
		var dx = p2.x - p1.x,
		    dy = p2.y - p1.y;
		return dx * dx + dy * dy;
	},

	// return closest point on segment or distance to that point
	_sqClosestPointOnSegment: function (p, p1, p2, sqDist) {
		var x = p1.x,
		    y = p1.y,
		    dx = p2.x - x,
		    dy = p2.y - y,
		    dot = dx * dx + dy * dy,
		    t;

		if (dot > 0) {
			t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

			if (t > 1) {
				x = p2.x;
				y = p2.y;
			} else if (t > 0) {
				x += dx * t;
				y += dy * t;
			}
		}

		dx = p.x - x;
		dy = p.y - y;

		return sqDist ? dx * dx + dy * dy : new L.Point(x, y);
	}
};


/*
 * L.Polyline is used to display polylines on a map.
 */

L.Polyline = L.Path.extend({
	initialize: function (latlngs, options) {
		L.Path.prototype.initialize.call(this, options);

		this._latlngs = this._convertLatLngs(latlngs);
	},

	options: {
		// how much to simplify the polyline on each zoom level
		// more = better performance and smoother look, less = more accurate
		smoothFactor: 1.0,
		noClip: false
	},

	projectLatlngs: function () {
		this._originalPoints = [];

		for (var i = 0, len = this._latlngs.length; i < len; i++) {
			this._originalPoints[i] = this._map.latLngToLayerPoint(this._latlngs[i]);
		}
	},

	getPathString: function () {
		for (var i = 0, len = this._parts.length, str = ''; i < len; i++) {
			str += this._getPathPartStr(this._parts[i]);
		}
		return str;
	},

	getLatLngs: function () {
		return this._latlngs;
	},

	setLatLngs: function (latlngs) {
		this._latlngs = this._convertLatLngs(latlngs);
		return this.redraw();
	},

	addLatLng: function (latlng) {
		this._latlngs.push(L.latLng(latlng));
		return this.redraw();
	},

	spliceLatLngs: function () { // (Number index, Number howMany)
		var removed = [].splice.apply(this._latlngs, arguments);
		this._convertLatLngs(this._latlngs, true);
		this.redraw();
		return removed;
	},

	closestLayerPoint: function (p) {
		var minDistance = Infinity, parts = this._parts, p1, p2, minPoint = null;

		for (var j = 0, jLen = parts.length; j < jLen; j++) {
			var points = parts[j];
			for (var i = 1, len = points.length; i < len; i++) {
				p1 = points[i - 1];
				p2 = points[i];
				var sqDist = L.LineUtil._sqClosestPointOnSegment(p, p1, p2, true);
				if (sqDist < minDistance) {
					minDistance = sqDist;
					minPoint = L.LineUtil._sqClosestPointOnSegment(p, p1, p2);
				}
			}
		}
		if (minPoint) {
			minPoint.distance = Math.sqrt(minDistance);
		}
		return minPoint;
	},

	getBounds: function () {
		return new L.LatLngBounds(this.getLatLngs());
	},

	_convertLatLngs: function (latlngs, overwrite) {
		var i, len, target = overwrite ? latlngs : [];

		for (i = 0, len = latlngs.length; i < len; i++) {
			if (L.Util.isArray(latlngs[i]) && typeof latlngs[i][0] !== 'number') {
				return;
			}
			target[i] = L.latLng(latlngs[i]);
		}
		return target;
	},

	_initEvents: function () {
		L.Path.prototype._initEvents.call(this);
	},

	_getPathPartStr: function (points) {
		var round = L.Path.VML;

		for (var j = 0, len2 = points.length, str = '', p; j < len2; j++) {
			p = points[j];
			if (round) {
				p._round();
			}
			str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
		}
		return str;
	},

	_clipPoints: function () {
		var points = this._originalPoints,
		    len = points.length,
		    i, k, segment;

		if (this.options.noClip) {
			this._parts = [points];
			return;
		}

		this._parts = [];

		var parts = this._parts,
		    vp = this._map._pathViewport,
		    lu = L.LineUtil;

		for (i = 0, k = 0; i < len - 1; i++) {
			segment = lu.clipSegment(points[i], points[i + 1], vp, i);
			if (!segment) {
				continue;
			}

			parts[k] = parts[k] || [];
			parts[k].push(segment[0]);

			// if segment goes out of screen, or it's the last one, it's the end of the line part
			if ((segment[1] !== points[i + 1]) || (i === len - 2)) {
				parts[k].push(segment[1]);
				k++;
			}
		}
	},

	// simplify each clipped part of the polyline
	_simplifyPoints: function () {
		var parts = this._parts,
		    lu = L.LineUtil;

		for (var i = 0, len = parts.length; i < len; i++) {
			parts[i] = lu.simplify(parts[i], this.options.smoothFactor);
		}
	},

	_updatePath: function () {
		if (!this._map) { return; }

		this._clipPoints();
		this._simplifyPoints();

		L.Path.prototype._updatePath.call(this);
	}
});

L.polyline = function (latlngs, options) {
	return new L.Polyline(latlngs, options);
};


/*
 * L.PolyUtil contains utility functions for polygons (clipping, etc.).
 */

/*jshint bitwise:false */ // allow bitwise operations here

L.PolyUtil = {};

/*
 * Sutherland-Hodgeman polygon clipping algorithm.
 * Used to avoid rendering parts of a polygon that are not currently visible.
 */
L.PolyUtil.clipPolygon = function (points, bounds) {
	var clippedPoints,
	    edges = [1, 4, 2, 8],
	    i, j, k,
	    a, b,
	    len, edge, p,
	    lu = L.LineUtil;

	for (i = 0, len = points.length; i < len; i++) {
		points[i]._code = lu._getBitCode(points[i], bounds);
	}

	// for each edge (left, bottom, right, top)
	for (k = 0; k < 4; k++) {
		edge = edges[k];
		clippedPoints = [];

		for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
			a = points[i];
			b = points[j];

			// if a is inside the clip window
			if (!(a._code & edge)) {
				// if b is outside the clip window (a->b goes out of screen)
				if (b._code & edge) {
					p = lu._getEdgeIntersection(b, a, edge, bounds);
					p._code = lu._getBitCode(p, bounds);
					clippedPoints.push(p);
				}
				clippedPoints.push(a);

			// else if b is inside the clip window (a->b enters the screen)
			} else if (!(b._code & edge)) {
				p = lu._getEdgeIntersection(b, a, edge, bounds);
				p._code = lu._getBitCode(p, bounds);
				clippedPoints.push(p);
			}
		}
		points = clippedPoints;
	}

	return points;
};


/*
 * L.Polygon is used to display polygons on a map.
 */

L.Polygon = L.Polyline.extend({
	options: {
		fill: true
	},

	initialize: function (latlngs, options) {
		L.Polyline.prototype.initialize.call(this, latlngs, options);
		this._initWithHoles(latlngs);
	},

	_initWithHoles: function (latlngs) {
		var i, len, hole;
		if (latlngs && L.Util.isArray(latlngs[0]) && (typeof latlngs[0][0] !== 'number')) {
			this._latlngs = this._convertLatLngs(latlngs[0]);
			this._holes = latlngs.slice(1);

			for (i = 0, len = this._holes.length; i < len; i++) {
				hole = this._holes[i] = this._convertLatLngs(this._holes[i]);
				if (hole[0].equals(hole[hole.length - 1])) {
					hole.pop();
				}
			}
		}

		// filter out last point if its equal to the first one
		latlngs = this._latlngs;

		if (latlngs.length >= 2 && latlngs[0].equals(latlngs[latlngs.length - 1])) {
			latlngs.pop();
		}
	},

	projectLatlngs: function () {
		L.Polyline.prototype.projectLatlngs.call(this);

		// project polygon holes points
		// TODO move this logic to Polyline to get rid of duplication
		this._holePoints = [];

		if (!this._holes) { return; }

		var i, j, len, len2;

		for (i = 0, len = this._holes.length; i < len; i++) {
			this._holePoints[i] = [];

			for (j = 0, len2 = this._holes[i].length; j < len2; j++) {
				this._holePoints[i][j] = this._map.latLngToLayerPoint(this._holes[i][j]);
			}
		}
	},

	setLatLngs: function (latlngs) {
		if (latlngs && L.Util.isArray(latlngs[0]) && (typeof latlngs[0][0] !== 'number')) {
			this._initWithHoles(latlngs);
			return this.redraw();
		} else {
			return L.Polyline.prototype.setLatLngs.call(this, latlngs);
		}
	},

	_clipPoints: function () {
		var points = this._originalPoints,
		    newParts = [];

		this._parts = [points].concat(this._holePoints);

		if (this.options.noClip) { return; }

		for (var i = 0, len = this._parts.length; i < len; i++) {
			var clipped = L.PolyUtil.clipPolygon(this._parts[i], this._map._pathViewport);
			if (clipped.length) {
				newParts.push(clipped);
			}
		}

		this._parts = newParts;
	},

	_getPathPartStr: function (points) {
		var str = L.Polyline.prototype._getPathPartStr.call(this, points);
		return str + (L.Browser.svg ? 'z' : 'x');
	}
});

L.polygon = function (latlngs, options) {
	return new L.Polygon(latlngs, options);
};


/*
 * L.DomEvent contains functions for working with DOM events.
 */

L.DomEvent = {
	/* inspired by John Resig, Dean Edwards and YUI addEvent implementations */
	addListener: function (obj, type, fn, context) { // (HTMLElement, String, Function[, Object])

		var id = L.stamp(fn),
		    key = '_leaflet_' + type + id,
		    handler, originalHandler, newType;

		if (obj[key]) { return this; }

		handler = function (e) {
			return fn.call(context || obj, e || L.DomEvent._getEvent());
		};

		if (L.Browser.pointer && type.indexOf('touch') === 0) {
			return this.addPointerListener(obj, type, handler, id);
		}
		if (L.Browser.touch && (type === 'dblclick') && this.addDoubleTapListener) {
			this.addDoubleTapListener(obj, handler, id);
		}

		if ('addEventListener' in obj) {

			if (type === 'mousewheel') {
				obj.addEventListener('DOMMouseScroll', handler, false);
				obj.addEventListener(type, handler, false);

			} else if ((type === 'mouseenter') || (type === 'mouseleave')) {

				originalHandler = handler;
				newType = (type === 'mouseenter' ? 'mouseover' : 'mouseout');

				handler = function (e) {
					if (!L.DomEvent._checkMouse(obj, e)) { return; }
					return originalHandler(e);
				};

				obj.addEventListener(newType, handler, false);

			} else if (type === 'click' && L.Browser.android) {
				originalHandler = handler;
				handler = function (e) {
					return L.DomEvent._filterClick(e, originalHandler);
				};

				obj.addEventListener(type, handler, false);
			} else {
				obj.addEventListener(type, handler, false);
			}

		} else if ('attachEvent' in obj) {
			obj.attachEvent('on' + type, handler);
		}

		obj[key] = handler;

		return this;
	},

	removeListener: function (obj, type, fn) {  // (HTMLElement, String, Function)

		var id = L.stamp(fn),
		    key = '_leaflet_' + type + id,
		    handler = obj[key];

		if (!handler) { return this; }

		if (L.Browser.pointer && type.indexOf('touch') === 0) {
			this.removePointerListener(obj, type, id);
		} else if (L.Browser.touch && (type === 'dblclick') && this.removeDoubleTapListener) {
			this.removeDoubleTapListener(obj, id);

		} else if ('removeEventListener' in obj) {

			if (type === 'mousewheel') {
				obj.removeEventListener('DOMMouseScroll', handler, false);
				obj.removeEventListener(type, handler, false);

			} else if ((type === 'mouseenter') || (type === 'mouseleave')) {
				obj.removeEventListener((type === 'mouseenter' ? 'mouseover' : 'mouseout'), handler, false);
			} else {
				obj.removeEventListener(type, handler, false);
			}
		} else if ('detachEvent' in obj) {
			obj.detachEvent('on' + type, handler);
		}

		obj[key] = null;

		return this;
	},

	stopPropagation: function (e) {

		if (e.stopPropagation) {
			e.stopPropagation();
		} else {
			e.cancelBubble = true;
		}
		L.DomEvent._skipped(e);

		return this;
	},

	disableScrollPropagation: function (el) {
		var stop = L.DomEvent.stopPropagation;

		return L.DomEvent
			.on(el, 'mousewheel', stop)
			.on(el, 'MozMousePixelScroll', stop);
	},

	disableClickPropagation: function (el) {
		var stop = L.DomEvent.stopPropagation;

		for (var i = L.Draggable.START.length - 1; i >= 0; i--) {
			L.DomEvent.on(el, L.Draggable.START[i], stop);
		}

		return L.DomEvent
			.on(el, 'click', L.DomEvent._fakeStop)
			.on(el, 'dblclick', stop);
	},

	preventDefault: function (e) {

		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
		return this;
	},

	stop: function (e) {
		return L.DomEvent
			.preventDefault(e)
			.stopPropagation(e);
	},

	getMousePosition: function (e, container) {

		var ie7 = L.Browser.ie7,
		    body = document.body,
		    docEl = document.documentElement,
		    x = e.pageX ? e.pageX - body.scrollLeft - docEl.scrollLeft: e.clientX,
		    y = e.pageY ? e.pageY - body.scrollTop - docEl.scrollTop: e.clientY,
		    pos = new L.Point(x, y);

		if (!container) {
			return pos;
		}

		var rect = container.getBoundingClientRect(),
		    left = rect.left - container.clientLeft,
		    top = rect.top - container.clientTop;

		// webkit (and ie <= 7) handles RTL scrollLeft different to everyone else
		// https://code.google.com/p/closure-library/source/browse/trunk/closure/goog/style/bidi.js
		if (!L.DomUtil.documentIsLtr() && (L.Browser.webkit || ie7)) {
			left += container.scrollWidth - container.clientWidth;

			// ie7 shows the scrollbar by default and provides clientWidth counting it, so we
			// need to add it back in if it is visible; scrollbar is on the left as we are RTL
			if (ie7 && L.DomUtil.getStyle(container, 'overflow-y') !== 'hidden' &&
			           L.DomUtil.getStyle(container, 'overflow') !== 'hidden') {
				left += 17;
			}
		}

		return pos._subtract(new L.Point(left, top));
	},

	getWheelDelta: function (e) {

		var delta = 0;

		if (e.wheelDelta) {
			delta = e.wheelDelta / 120;
		}
		if (e.detail) {
			delta = -e.detail / 3;
		}
		return delta;
	},

	_skipEvents: {},

	_fakeStop: function (e) {
		// fakes stopPropagation by setting a special event flag, checked/reset with L.DomEvent._skipped(e)
		L.DomEvent._skipEvents[e.type] = true;
	},

	_skipped: function (e) {
		var skipped = this._skipEvents[e.type];
		// reset when checking, as it's only used in map container and propagates outside of the map
		this._skipEvents[e.type] = false;
		return skipped;
	},

	// check if element really left/entered the event target (for mouseenter/mouseleave)
	_checkMouse: function (el, e) {

		var related = e.relatedTarget;

		if (!related) { return true; }

		try {
			while (related && (related !== el)) {
				related = related.parentNode;
			}
		} catch (err) {
			return false;
		}
		return (related !== el);
	},

	_getEvent: function () { // evil magic for IE
		/*jshint noarg:false */
		var e = window.event;
		if (!e) {
			var caller = arguments.callee.caller;
			while (caller) {
				e = caller['arguments'][0];
				if (e && window.Event === e.constructor) {
					break;
				}
				caller = caller.caller;
			}
		}
		return e;
	},

	// this is a horrible workaround for a bug in Android where a single touch triggers two click events
	_filterClick: function (e, handler) {
		var timeStamp = (e.timeStamp || e.originalEvent.timeStamp),
			elapsed = L.DomEvent._lastClick && (timeStamp - L.DomEvent._lastClick);

		// are they closer together than 1000ms yet more than 100ms?
		// Android typically triggers them ~300ms apart while multiple listeners
		// on the same event should be triggered far faster;
		// or check if click is simulated on the element, and if it is, reject any non-simulated events

		if ((elapsed && elapsed > 100 && elapsed < 1000) || (e.target._simulatedClick && !e._simulated)) {
			L.DomEvent.stop(e);
			return;
		}
		L.DomEvent._lastClick = timeStamp;

		return handler(e);
	}
};

L.DomEvent.on = L.DomEvent.addListener;
L.DomEvent.off = L.DomEvent.removeListener;


/*
 * L.Draggable allows you to add dragging capabilities to any element. Supports mobile devices too.
 */

L.Draggable = L.Class.extend({
	includes: L.Mixin.Events,

	statics: {
		START: L.Browser.touch ? ['touchstart', 'mousedown'] : ['mousedown'],
		END: {
			mousedown: 'mouseup',
			touchstart: 'touchend',
			pointerdown: 'touchend',
			MSPointerDown: 'touchend'
		},
		MOVE: {
			mousedown: 'mousemove',
			touchstart: 'touchmove',
			pointerdown: 'touchmove',
			MSPointerDown: 'touchmove'
		}
	},

	initialize: function (element, dragStartTarget) {
		this._element = element;
		this._dragStartTarget = dragStartTarget || element;
	},

	enable: function () {
		if (this._enabled) { return; }

		for (var i = L.Draggable.START.length - 1; i >= 0; i--) {
			L.DomEvent.on(this._dragStartTarget, L.Draggable.START[i], this._onDown, this);
		}

		this._enabled = true;
	},

	disable: function () {
		if (!this._enabled) { return; }

		for (var i = L.Draggable.START.length - 1; i >= 0; i--) {
			L.DomEvent.off(this._dragStartTarget, L.Draggable.START[i], this._onDown, this);
		}

		this._enabled = false;
		this._moved = false;
	},

	_onDown: function (e) {
		this._moved = false;

		if (e.shiftKey || ((e.which !== 1) && (e.button !== 1) && !e.touches)) { return; }

		L.DomEvent.stopPropagation(e);

		if (L.Draggable._disabled) { return; }

		L.DomUtil.disableImageDrag();
		L.DomUtil.disableTextSelection();

		if (this._moving) { return; }

		var first = e.touches ? e.touches[0] : e;

		this._startPoint = new L.Point(first.clientX, first.clientY);
		this._startPos = this._newPos = L.DomUtil.getPosition(this._element);

		L.DomEvent
		    .on(document, L.Draggable.MOVE[e.type], this._onMove, this)
		    .on(document, L.Draggable.END[e.type], this._onUp, this);
	},

	_onMove: function (e) {
		if (e.touches && e.touches.length > 1) {
			this._moved = true;
			return;
		}

		var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
		    newPoint = new L.Point(first.clientX, first.clientY),
		    offset = newPoint.subtract(this._startPoint);

		if (!offset.x && !offset.y) { return; }

		L.DomEvent.preventDefault(e);

		if (!this._moved) {
			this.fire('dragstart');

			this._moved = true;
			this._startPos = L.DomUtil.getPosition(this._element).subtract(offset);

			if (!L.Browser.touch) {
				L.DomUtil.addClass(document.body, 'leaflet-dragging');
			}
		}

		this._newPos = this._startPos.add(offset);
		this._moving = true;

		L.Util.cancelAnimFrame(this._animRequest);
		this._animRequest = L.Util.requestAnimFrame(this._updatePosition, this, true, this._dragStartTarget);
	},

	_updatePosition: function () {
		this.fire('predrag');
		L.DomUtil.setPosition(this._element, this._newPos);
		this.fire('drag');
	},

	_onUp: function () {
		if (!L.Browser.touch) {
			L.DomUtil.removeClass(document.body, 'leaflet-dragging');
		}

		for (var i in L.Draggable.MOVE) {
			L.DomEvent
			    .off(document, L.Draggable.MOVE[i], this._onMove)
			    .off(document, L.Draggable.END[i], this._onUp);
		}

		L.DomUtil.enableImageDrag();
		L.DomUtil.enableTextSelection();

		if (this._moved) {
			// ensure drag is not fired after dragend
			L.Util.cancelAnimFrame(this._animRequest);

			this.fire('dragend');
		}

		this._moving = false;
	}
});


/*
	L.Handler is a base class for handler classes that are used internally to inject
	interaction features like dragging to classes like Map and Marker.
*/

L.Handler = L.Class.extend({
	initialize: function (map) {
		this._map = map;
	},

	enable: function () {
		if (this._enabled) { return; }

		this._enabled = true;
		this.addHooks();
	},

	disable: function () {
		if (!this._enabled) { return; }

		this._enabled = false;
		this.removeHooks();
	},

	enabled: function () {
		return !!this._enabled;
	}
});


/*
 * L.Handler.MapDrag is used to make the map draggable (with panning inertia), enabled by default.
 */

L.Map.mergeOptions({
	dragging: true,

	inertia: !L.Browser.android23,
	inertiaDeceleration: 3400, // px/s^2
	inertiaMaxSpeed: Infinity, // px/s
	inertiaThreshold: L.Browser.touch ? 32 : 18, // ms
	easeLinearity: 0.25,

	// TODO refactor, move to CRS
	worldCopyJump: false
});

L.Map.Drag = L.Handler.extend({
	addHooks: function () {
		if (!this._draggable) {
			var map = this._map;

			this._draggable = new L.Draggable(map._mapPane, map._container);

			this._draggable.on({
				'dragstart': this._onDragStart,
				'drag': this._onDrag,
				'dragend': this._onDragEnd
			}, this);

			if (map.options.worldCopyJump) {
				this._draggable.on('predrag', this._onPreDrag, this);
				map.on('viewreset', this._onViewReset, this);

				map.whenReady(this._onViewReset, this);
			}
		}
		this._draggable.enable();
	},

	removeHooks: function () {
		this._draggable.disable();
	},

	moved: function () {
		return this._draggable && this._draggable._moved;
	},

	_onDragStart: function () {
		var map = this._map;

		if (map._panAnim) {
			map._panAnim.stop();
		}

		map
		    .fire('movestart')
		    .fire('dragstart');

		if (map.options.inertia) {
			this._positions = [];
			this._times = [];
		}
	},

	_onDrag: function () {
		if (this._map.options.inertia) {
			var time = this._lastTime = +new Date(),
			    pos = this._lastPos = this._draggable._newPos;

			this._positions.push(pos);
			this._times.push(time);

			if (time - this._times[0] > 200) {
				this._positions.shift();
				this._times.shift();
			}
		}

		this._map
		    .fire('move')
		    .fire('drag');
	},

	_onViewReset: function () {
		// TODO fix hardcoded Earth values
		var pxCenter = this._map.getSize()._divideBy(2),
		    pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);

		this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
		this._worldWidth = this._map.project([0, 180]).x;
	},

	_onPreDrag: function () {
		// TODO refactor to be able to adjust map pane position after zoom
		var worldWidth = this._worldWidth,
		    halfWidth = Math.round(worldWidth / 2),
		    dx = this._initialWorldOffset,
		    x = this._draggable._newPos.x,
		    newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx,
		    newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx,
		    newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;

		this._draggable._newPos.x = newX;
	},

	_onDragEnd: function () {
		var map = this._map,
		    options = map.options,
		    delay = +new Date() - this._lastTime,

		    noInertia = !options.inertia || delay > options.inertiaThreshold || !this._positions[0];

		map.fire('dragend');

		if (noInertia) {
			map.fire('moveend');

		} else {

			var direction = this._lastPos.subtract(this._positions[0]),
			    duration = (this._lastTime + delay - this._times[0]) / 1000,
			    ease = options.easeLinearity,

			    speedVector = direction.multiplyBy(ease / duration),
			    speed = speedVector.distanceTo([0, 0]),

			    limitedSpeed = Math.min(options.inertiaMaxSpeed, speed),
			    limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed),

			    decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease),
			    offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();

			if (!offset.x || !offset.y) {
				map.fire('moveend');

			} else {
				L.Util.requestAnimFrame(function () {
					map.panBy(offset, {
						duration: decelerationDuration,
						easeLinearity: ease,
						noMoveStart: true
					});
				});
			}
		}
	}
});

L.Map.addInitHook('addHandler', 'dragging', L.Map.Drag);


/*
 * L.Handler.DoubleClickZoom is used to handle double-click zoom on the map, enabled by default.
 */

L.Map.mergeOptions({
	doubleClickZoom: true
});

L.Map.DoubleClickZoom = L.Handler.extend({
	addHooks: function () {
		this._map.on('dblclick', this._onDoubleClick, this);
	},

	removeHooks: function () {
		this._map.off('dblclick', this._onDoubleClick, this);
	},

	_onDoubleClick: function (e) {
		var map = this._map,
		    zoom = map.getZoom() + 1;

		if (map.options.doubleClickZoom === 'center') {
			map.setZoom(zoom);
		} else {
			map.setZoomAround(e.containerPoint, zoom);
		}
	}
});

L.Map.addInitHook('addHandler', 'doubleClickZoom', L.Map.DoubleClickZoom);


/*
 * L.Handler.ScrollWheelZoom is used by L.Map to enable mouse scroll wheel zoom on the map.
 */

L.Map.mergeOptions({
	scrollWheelZoom: true
});

L.Map.ScrollWheelZoom = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, 'mousewheel', this._onWheelScroll, this);
		L.DomEvent.on(this._map._container, 'MozMousePixelScroll', L.DomEvent.preventDefault);
		this._delta = 0;
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, 'mousewheel', this._onWheelScroll);
		L.DomEvent.off(this._map._container, 'MozMousePixelScroll', L.DomEvent.preventDefault);
	},

	_onWheelScroll: function (e) {
		var delta = L.DomEvent.getWheelDelta(e);

		this._delta += delta;
		this._lastMousePos = this._map.mouseEventToContainerPoint(e);

		if (!this._startTime) {
			this._startTime = +new Date();
		}

		var left = Math.max(40 - (+new Date() - this._startTime), 0);

		clearTimeout(this._timer);
		this._timer = setTimeout(L.bind(this._performZoom, this), left);

		L.DomEvent.preventDefault(e);
		L.DomEvent.stopPropagation(e);
	},

	_performZoom: function () {
		var map = this._map,
		    delta = this._delta,
		    zoom = map.getZoom();

		delta = delta > 0 ? Math.ceil(delta) : Math.floor(delta);
		delta = Math.max(Math.min(delta, 4), -4);
		delta = map._limitZoom(zoom + delta) - zoom;

		this._delta = 0;
		this._startTime = null;

		if (!delta) { return; }

		if (map.options.scrollWheelZoom === 'center') {
			map.setZoom(zoom + delta);
		} else {
			map.setZoomAround(this._lastMousePos, zoom + delta);
		}
	}
});

L.Map.addInitHook('addHandler', 'scrollWheelZoom', L.Map.ScrollWheelZoom);


/*
 * L.Control is a base class for implementing map controls. Handles positioning.
 * All other controls extend from this class.
 */

L.Control = L.Class.extend({
	options: {
		position: 'topright'
	},

	initialize: function (options) {
		L.setOptions(this, options);
	},

	getPosition: function () {
		return this.options.position;
	},

	setPosition: function (position) {
		var map = this._map;

		if (map) {
			map.removeControl(this);
		}

		this.options.position = position;

		if (map) {
			map.addControl(this);
		}

		return this;
	},

	getContainer: function () {
		return this._container;
	},

	addTo: function (map) {
		this._map = map;

		var container = this._container = this.onAdd(map),
		    pos = this.getPosition(),
		    corner = map._controlCorners[pos];

		L.DomUtil.addClass(container, 'leaflet-control');

		if (pos.indexOf('bottom') !== -1) {
			corner.insertBefore(container, corner.firstChild);
		} else {
			corner.appendChild(container);
		}

		return this;
	},

	removeFrom: function (map) {
		var pos = this.getPosition(),
		    corner = map._controlCorners[pos];

		corner.removeChild(this._container);
		this._map = null;

		if (this.onRemove) {
			this.onRemove(map);
		}

		return this;
	}
});

L.control = function (options) {
	return new L.Control(options);
};


// adds control-related methods to L.Map

L.Map.include({
	addControl: function (control) {
		control.addTo(this);
		return this;
	},

	removeControl: function (control) {
		control.removeFrom(this);
		return this;
	},

	_initControlPos: function () {
		var corners = this._controlCorners = {},
		    l = 'leaflet-',
		    container = this._controlContainer =
		            L.DomUtil.create('div', l + 'control-container', this._container);

		function createCorner(vSide, hSide) {
			var className = l + vSide + ' ' + l + hSide;

			corners[vSide + hSide] = L.DomUtil.create('div', className, container);
		}

		createCorner('top', 'left');
		createCorner('top', 'right');
		createCorner('bottom', 'left');
		createCorner('bottom', 'right');
	},

	_clearControlPos: function () {
		this._container.removeChild(this._controlContainer);
	}
});


/*
 * L.Control.Zoom is used for the default zoom buttons on the map.
 */

L.Control.Zoom = L.Control.extend({
	options: {
		position: 'topleft',
		zoomInText: '+',
		zoomInTitle: 'Zoom in',
		zoomOutText: '-',
		zoomOutTitle: 'Zoom out'
	},

	onAdd: function (map) {
		var zoomName = 'leaflet-control-zoom',
		    container = L.DomUtil.create('div', zoomName + ' leaflet-bar');

		this._map = map;

		this._zoomInButton  = this._createButton(
		        this.options.zoomInText, this.options.zoomInTitle,
		        zoomName + '-in',  container, this._zoomIn,  this);
		this._zoomOutButton = this._createButton(
		        this.options.zoomOutText, this.options.zoomOutTitle,
		        zoomName + '-out', container, this._zoomOut, this);

		this._updateDisabled();
		map.on('zoomend zoomlevelschange', this._updateDisabled, this);

		return container;
	},

	onRemove: function (map) {
		map.off('zoomend zoomlevelschange', this._updateDisabled, this);
	},

	_zoomIn: function (e) {
		this._map.zoomIn(e.shiftKey ? 3 : 1);
	},

	_zoomOut: function (e) {
		this._map.zoomOut(e.shiftKey ? 3 : 1);
	},

	_createButton: function (html, title, className, container, fn, context) {
		var link = L.DomUtil.create('a', className, container);
		link.innerHTML = html;
		link.href = '#';
		link.title = title;

		var stop = L.DomEvent.stopPropagation;

		L.DomEvent
		    .on(link, 'click', stop)
		    .on(link, 'mousedown', stop)
		    .on(link, 'dblclick', stop)
		    .on(link, 'click', L.DomEvent.preventDefault)
		    .on(link, 'click', fn, context);

		return link;
	},

	_updateDisabled: function () {
		var map = this._map,
			className = 'leaflet-disabled';

		L.DomUtil.removeClass(this._zoomInButton, className);
		L.DomUtil.removeClass(this._zoomOutButton, className);

		if (map._zoom === map.getMinZoom()) {
			L.DomUtil.addClass(this._zoomOutButton, className);
		}
		if (map._zoom === map.getMaxZoom()) {
			L.DomUtil.addClass(this._zoomInButton, className);
		}
	}
});

L.Map.mergeOptions({
	zoomControl: true
});

L.Map.addInitHook(function () {
	if (this.options.zoomControl) {
		this.zoomControl = new L.Control.Zoom();
		this.addControl(this.zoomControl);
	}
});

L.control.zoom = function (options) {
	return new L.Control.Zoom(options);
};



/*
 * L.Control.Attribution is used for displaying attribution on the map (added by default).
 */

L.Control.Attribution = L.Control.extend({
	options: {
		position: 'bottomright',
		prefix: '<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>'
	},

	initialize: function (options) {
		L.setOptions(this, options);

		this._attributions = {};
	},

	onAdd: function (map) {
		this._container = L.DomUtil.create('div', 'leaflet-control-attribution');
		L.DomEvent.disableClickPropagation(this._container);

		map
		    .on('layeradd', this._onLayerAdd, this)
		    .on('layerremove', this._onLayerRemove, this);

		this._update();

		return this._container;
	},

	onRemove: function (map) {
		map
		    .off('layeradd', this._onLayerAdd)
		    .off('layerremove', this._onLayerRemove);

	},

	setPrefix: function (prefix) {
		this.options.prefix = prefix;
		this._update();
		return this;
	},

	addAttribution: function (text) {
		if (!text) { return; }

		if (!this._attributions[text]) {
			this._attributions[text] = 0;
		}
		this._attributions[text]++;

		this._update();

		return this;
	},

	removeAttribution: function (text) {
		if (!text) { return; }

		if (this._attributions[text]) {
			this._attributions[text]--;
			this._update();
		}

		return this;
	},

	_update: function () {
		if (!this._map) { return; }

		var attribs = [];

		for (var i in this._attributions) {
			if (this._attributions[i]) {
				attribs.push(i);
			}
		}

		var prefixAndAttribs = [];

		if (this.options.prefix) {
			prefixAndAttribs.push(this.options.prefix);
		}
		if (attribs.length) {
			prefixAndAttribs.push(attribs.join(', '));
		}

		this._container.innerHTML = prefixAndAttribs.join(' | ');
	},

	_onLayerAdd: function (e) {
		if (e.layer.getAttribution) {
			this.addAttribution(e.layer.getAttribution());
		}
	},

	_onLayerRemove: function (e) {
		if (e.layer.getAttribution) {
			this.removeAttribution(e.layer.getAttribution());
		}
	}
});

L.Map.mergeOptions({
	attributionControl: true
});

L.Map.addInitHook(function () {
	if (this.options.attributionControl) {
		this.attributionControl = (new L.Control.Attribution()).addTo(this);
	}
});

L.control.attribution = function (options) {
	return new L.Control.Attribution(options);
};


/*
 * Provides L.Map with convenient shortcuts for using browser geolocation features.
 */

L.Map.include({
	_defaultLocateOptions: {
		watch: false,
		setView: false,
		maxZoom: Infinity,
		timeout: 10000,
		maximumAge: 0,
		enableHighAccuracy: false
	},

	locate: function (/*Object*/ options) {

		options = this._locateOptions = L.extend(this._defaultLocateOptions, options);

		if (!navigator.geolocation) {
			this._handleGeolocationError({
				code: 0,
				message: 'Geolocation not supported.'
			});
			return this;
		}

		var onResponse = L.bind(this._handleGeolocationResponse, this),
			onError = L.bind(this._handleGeolocationError, this);

		if (options.watch) {
			this._locationWatchId =
			        navigator.geolocation.watchPosition(onResponse, onError, options);
		} else {
			navigator.geolocation.getCurrentPosition(onResponse, onError, options);
		}
		return this;
	},

	stopLocate: function () {
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(this._locationWatchId);
		}
		if (this._locateOptions) {
			this._locateOptions.setView = false;
		}
		return this;
	},

	_handleGeolocationError: function (error) {
		var c = error.code,
		    message = error.message ||
		            (c === 1 ? 'permission denied' :
		            (c === 2 ? 'position unavailable' : 'timeout'));

		if (this._locateOptions.setView && !this._loaded) {
			this.fitWorld();
		}

		this.fire('locationerror', {
			code: c,
			message: 'Geolocation error: ' + message + '.'
		});
	},

	_handleGeolocationResponse: function (pos) {
		var lat = pos.coords.latitude,
		    lng = pos.coords.longitude,
		    latlng = new L.LatLng(lat, lng),

		    latAccuracy = 180 * pos.coords.accuracy / 40075017,
		    lngAccuracy = latAccuracy / Math.cos(L.LatLng.DEG_TO_RAD * lat),

		    bounds = L.latLngBounds(
		            [lat - latAccuracy, lng - lngAccuracy],
		            [lat + latAccuracy, lng + lngAccuracy]),

		    options = this._locateOptions;

		if (options.setView) {
			var zoom = Math.min(this.getBoundsZoom(bounds), options.maxZoom);
			this.setView(latlng, zoom);
		}

		var data = {
			latlng: latlng,
			bounds: bounds,
			timestamp: pos.timestamp
		};

		for (var i in pos.coords) {
			if (typeof pos.coords[i] === 'number') {
				data[i] = pos.coords[i];
			}
		}

		this.fire('locationfound', data);
	}
});


}(window, document));
(function(v,n){function da(){q.removeEventListener("DOMContentLoaded",da,!1);v.removeEventListener("load",da,!1);d.R()}function zb(a,b){return b.toUpperCase()}function d(a,b){return new d.b.X(a,b,La)}function ea(a){var b=a.length,c=d.type(a);return d.P(a)?!1:1===a.nodeType&&b?!0:"array"===c||"function"!==c&&(0===b||"number"===typeof b&&0<b&&b-1 in a)}function Ab(a){var b=Ma[a]={};d.a(a.match(L)||[],function(a,d){b[d]=!0});return b}function F(){Object.defineProperty(this.o={},0,{get:function(){return{}}});
this.expando=d.expando+Math.random()}function Na(a,b,c){if(c===n&&1===a.nodeType)if(c="data-"+b.replace(Bb,"-$1").toLowerCase(),c=a.getAttribute(c),"string"===typeof c){try{c="true"===c?!0:"false"===c?!1:"null"===c?null:+c+""===c?+c:Cb.test(c)?JSON.parse(c):c}catch(d){}E.set(a,b,c)}else c=n;return c}function qa(){return!0}function H(){return!1}function Oa(){try{return q.activeElement}catch(a){}}function Pa(a,b){for(;(a=a[b])&&1!==a.nodeType;);return a}function ra(a,b,c){if(d.d(b))return d.ma(a,function(a,
d){return!!b.call(a,d,a)!==c});if(b.nodeType)return d.ma(a,function(a){return a===b!==c});if("string"===typeof b){if(Db.test(b))return d.filter(b,a,c);b=d.filter(b,a)}return d.ma(a,function(a){return 0<=W.call(b,a)!==c})}function Qa(a,b){return d.nodeName(a,"table")&&d.nodeName(1===b.nodeType?b:b.firstChild,"tr")?a.getElementsByTagName("tbody")[0]||a.appendChild(a.ownerDocument.createElement("tbody")):a}function Eb(a){a.type=(null!==a.getAttribute("type"))+"/"+a.type;return a}function Fb(a){var b=
Gb.exec(a.type);b?a.type=b[1]:a.removeAttribute("type");return a}function sa(a,b){for(var c=a.length,d=0;d<c;d++)t.set(a[d],"globalEval",!b||t.get(b[d],"globalEval"))}function Ra(a,b){var c,e,f,g;if(1===b.nodeType){if(t.W(a)&&(g=t.i(a),c=t.set(b,g),g=g.ka))for(f in delete c.handle,c.ka={},g)for(c=0,e=g[f].length;c<e;c++)d.event.add(b,f,g[f][c]);E.W(a)&&(f=E.i(a),f=d.extend({},f),E.set(b,f))}}function C(a,b){var c=a.getElementsByTagName?a.getElementsByTagName(b||"*"):a.querySelectorAll?a.querySelectorAll(b||
"*"):[];return b===n||b&&d.nodeName(a,b)?d.u([a],c):c}function Sa(a,b){if(b in a)return b;for(var c=b.charAt(0).toUpperCase()+b.slice(1),d=b,f=Ta.length;f--;)if(b=Ta[f]+c,b in a)return b;return d}function fa(a,b){a=b||a;return"none"===d.c(a,"display")||!d.contains(a.ownerDocument,a)}function Ua(a,b){for(var c,e,f,g=[],h=0,k=a.length;h<k;h++)e=a[h],e.style&&(g[h]=t.get(e,"olddisplay"),c=e.style.display,b?(g[h]||"none"!==c||(e.style.display=""),""===e.style.display&&fa(e)&&(g[h]=t.i(e,"olddisplay",
Hb(e.nodeName)))):g[h]||(f=fa(e),(c&&"none"!==c||!f)&&t.set(e,"olddisplay",f?c:d.c(e,"display"))));for(h=0;h<k;h++)e=a[h],!e.style||b&&"none"!==e.style.display&&""!==e.style.display||(e.style.display=b?g[h]||"":"none");return a}function Va(a,b,c){return(a=Ib.exec(b))?Math.max(0,a[1]-(c||0))+(a[2]||"px"):b}function Wa(a,b,c,e,f){b=c===(e?"border":"content")?4:"width"===b?1:0;for(var g=0;4>b;b+=2)"margin"===c&&(g+=d.c(a,c+O[b],!0,f)),e?("content"===c&&(g-=d.c(a,"padding"+O[b],!0,f)),"margin"!==c&&(g-=
d.c(a,"border"+O[b]+"Width",!0,f))):(g+=d.c(a,"padding"+O[b],!0,f),"padding"!==c&&(g+=d.c(a,"border"+O[b]+"Width",!0,f)));return g}function Xa(a,b,c){var e=!0,f="width"===b?a.offsetWidth:a.offsetHeight,g=v.getComputedStyle(a,null),h=d.l.boxSizing&&"border-box"===d.c(a,"boxSizing",!1,g);if(0>=f||null==f){f=N(a,b,g);if(0>f||null==f)f=a.style[b];if(ta.test(f))return f;e=h&&(d.l.rb||f===a.style[b]);f=parseFloat(f)||0}return f+Wa(a,b,c||(h?"border":"content"),e,g)+"px"}function Hb(a){var b=q,c=Ya[a];c||
(c=Za(a,b),"none"!==c&&c||(ga=(ga||d("<iframe frameborder='0' width='0' height='0'/>").c("cssText","display:block !important")).ob(b.documentElement),b=(ga[0].contentWindow||ga[0].contentDocument).document,b.write("<!doctype html><html><body>"),b.close(),c=Za(a,b),ga.detach()),Ya[a]=c);return c}function Za(a,b){var c=d(b.createElement(a)).ob(b.body),e=d.c(c[0],"display");c.remove();return e}function va(a,b,c,e){var f;if(d.isArray(b))d.a(b,function(b,d){c||Jb.test(a)?e(a,d):va(a+"["+("object"===typeof d?
b:"")+"]",d,c,e)});else if(c||"object"!==d.type(b))e(a,b);else for(f in b)va(a+"["+f+"]",b[f],c,e)}function $a(a){return function(b,c){"string"!==typeof b&&(c=b,b="*");var e,f=0,g=b.toLowerCase().match(L)||[];if(d.d(c))for(;e=g[f++];)"+"===e[0]?(e=e.slice(1)||"*",(a[e]=a[e]||[]).unshift(c)):(a[e]=a[e]||[]).push(c)}}function ab(a,b,c,e){function f(k){var l;g[k]=!0;d.a(a[k]||[],function(a,d){var k=d(b,c,e);if("string"===typeof k&&!h&&!g[k])return b.t.unshift(k),f(k),!1;if(h)return!(l=k)});return l}
var g={},h=a===Ba;return f(b.t[0])||!g["*"]&&f("*")}function Ca(a,b){var c,e,f=d.M.nc||{};for(c in b)b[c]!==n&&((f[c]?a:e||(e={}))[c]=b[c]);e&&d.extend(!0,a,e);return a}function bb(){setTimeout(function(){T=n});return T=d.now()}function cb(a,b,c){for(var d,f=(ha[b]||[]).concat(ha["*"]),g=0,h=f.length;g<h;g++)if(d=f[g].call(c,b,a))return d}function db(a,b,c){function e(){if(f)return!1;for(var b=T||bb(),b=Math.max(0,l.startTime+l.duration-b),c=1-(b/l.duration||0),d=0,e=l.ra.length;d<e;d++)l.ra[d].Mb(c);
k.Dc(a,[l,c,b]);if(1>c&&e)return b;k.aa(a,[l]);return!1}var f,g=0,h=U.length,k=d.S().F(function(){delete e.e}),l=k.n({e:a,K:d.extend({},b),q:d.extend(!0,{Qb:{}},c),fe:b,ee:c,startTime:T||bb(),duration:c.duration,ra:[],hc:function(b,c){var e=d.Yb(a,l.q,b,c,l.q.Qb[b]||l.q.ja);l.ra.push(e);return e},stop:function(b){var c=0,d=b?l.ra.length:0;if(f)return this;for(f=!0;c<d;c++)l.ra[c].Mb(1);b?k.aa(a,[l,b]):k.Rc(a,[l,b]);return this}});c=l.K;for(Kb(c,l.q.Qb);g<h;g++)if(b=U[g].call(l,a,c,l.q))return b;d.map(c,
cb,l);d.d(l.q.start)&&l.q.start.call(a,l);d.h.ed(d.extend(e,{e:a,nb:l,f:l.q.f}));return l.cb(l.q.cb).A(l.q.A,l.q.complete).la(l.q.la).F(l.q.F)}function Kb(a,b){var c,e,f,g,h;for(c in a)if(e=d.H(c),f=b[e],g=a[c],d.isArray(g)&&(f=g[1],g=a[c]=g[0]),c!==e&&(a[e]=g,delete a[c]),(h=d.r[e])&&"expand"in h)for(c in g=h.expand(g),delete a[e],g)c in a||(a[c]=g[c],b[c]=f);else b[e]=f}function B(a,b,c,d,f){return new B.prototype.X(a,b,c,d,f)}function la(a,b){var c,d={height:a},f=0;for(b=b?1:0;4>f;f+=2-b)c=O[f],
d["margin"+c]=d["padding"+c]=a;b&&(d.opacity=d.width=a);return d}var La,ma,X=typeof n,Lb=v.location,q=v.document,eb=q.documentElement,Mb=v.Ya,Nb=v.Ha,na={},oa=[],fb=oa.concat,Da=oa.push,P=oa.slice,W=oa.indexOf,Ob=na.toString,Ea=na.hasOwnProperty,Pb="2.0.3".trim,pa=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,L=/\S+/g,Qb=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,gb=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,Rb=/^-ms-/,Sb=/-([\da-z])/gi;d.b=d.prototype={Ba:"2.0.3",constructor:d,X:function(a,b,c){var e;if(!a)return this;
if("string"===typeof a){e="<"===a.charAt(0)&&">"===a.charAt(a.length-1)&&3<=a.length?[null,a,null]:Qb.exec(a);if(!e||!e[1]&&b)return!b||b.Ba?(b||c).find(a):this.constructor(b).find(a);if(e[1]){if(b=b instanceof d?b[0]:b,d.u(this,d.Gb(e[1],b&&b.nodeType?b.ownerDocument||b:q,!0)),gb.test(e[1])&&d.Aa(b))for(e in b)if(d.d(this[e]))this[e](b[e]);else this.N(e,b[e])}else(b=q.getElementById(e[2]))&&b.parentNode&&(this.length=1,this[0]=b),this.w=q,this.p=a;return this}if(a.nodeType)return this.w=this[0]=
a,this.length=1,this;if(d.d(a))return c.R(a);a.p!==n&&(this.p=a.p,this.w=a.w);return d.Z(a,this)},p:"",length:0,fd:function(){return P.call(this)},get:function(a){return null==a?this.fd():0>a?this[this.length+a]:this[a]},s:function(a){a=d.u(this.constructor(),a);a.bb=this;a.w=this.w;return a},a:function(a,b){return d.a(this,a,b)},R:function(a){d.R.n().A(a);return this},slice:function(){return this.s(P.apply(this,arguments))},wa:function(){return this.Qa(0)},Qa:function(a){var b=this.length;a=+a+(0>
a?b:0);return this.s(0<=a&&a<b?[this[a]]:[])},map:function(a){return this.s(d.map(this,function(b,c){return a.call(b,c,b)}))},end:function(){return this.bb||this.constructor(null)},push:Da,sort:[].sort,splice:[].splice};d.b.X.prototype=d.b;d.extend=d.b.extend=function(){var a,b,c,e,f,g=arguments[0]||{},h=1,k=arguments.length,l=!1;"boolean"===typeof g&&(l=g,g=arguments[1]||{},h=2);"object"===typeof g||d.d(g)||(g={});k===h&&(g=this,--h);for(;h<k;h++)if(null!=(a=arguments[h]))for(b in a)c=g[b],e=a[b],
g!==e&&(l&&e&&(d.Aa(e)||(f=d.isArray(e)))?(f?(f=!1,c=c&&d.isArray(c)?c:[]):c=c&&d.Aa(c)?c:{},g[b]=d.extend(l,c,e)):e!==n&&(g[b]=e));return g};d.extend({expando:"jQuery"+("2.0.3"+Math.random()).replace(/\D/g,""),Xd:function(a){v.Ha===d&&(v.Ha=Nb);a&&v.Ya===d&&(v.Ya=Mb);return d},Ab:!1,eb:1,Md:function(a){a?d.eb++:d.R(!0)},R:function(a){(!0===a?--d.eb:d.Ab)||(d.Ab=!0,!0!==a&&0<--d.eb||(ma.aa(q,[d]),d.b.m&&d(q).m("ready").I("ready")))},d:function(a){return"function"===d.type(a)},isArray:Array.isArray,
P:function(a){return null!=a&&a===a.window},uc:function(a){return!isNaN(parseFloat(a))&&isFinite(a)},type:function(a){return null==a?String(a):"object"===typeof a||"function"===typeof a?na[Ob.call(a)]||"object":typeof a},Aa:function(a){if("object"!==d.type(a)||a.nodeType||d.P(a))return!1;try{if(a.constructor&&!Ea.call(a.constructor.prototype,"isPrototypeOf"))return!1}catch(b){return!1}return!0},oa:function(a){for(var b in a)return!1;return!0},error:function(a){throw Error(a);},Gb:function(a,b,c){if(!a||
"string"!==typeof a)return null;"boolean"===typeof b&&(c=b,b=!1);b=b||q;var e=gb.exec(a);c=!c&&[];if(e)return[b.createElement(e[1])];e=d.sb([a],b,c);c&&d(c).remove();return d.u([],e.childNodes)},Gc:JSON.parse,Hc:function(a){var b,c;if(!a||"string"!==typeof a)return null;try{c=new DOMParser,b=c.parseFromString(a,"text/xml")}catch(e){b=n}b&&!b.getElementsByTagName("parsererror").length||d.error("Invalid XML: "+a);return b},Yd:function(){},xb:function(a){var b;b=eval;if(a=d.trim(a))1===a.indexOf("use strict")?
(b=q.createElement("script"),b.text=a,q.head.appendChild(b).parentNode.removeChild(b)):b(a)},H:function(a){return a.replace(Rb,"ms-").replace(Sb,zb)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toLowerCase()===b.toLowerCase()},a:function(a,b,c){var d,f=0,g=a.length;d=ea(a);if(c)if(d)for(;f<g&&(d=b.apply(a[f],c),!1!==d);f++);else for(f in a){if(d=b.apply(a[f],c),!1===d)break}else if(d)for(;f<g&&(d=b.call(a[f],f,a[f]),!1!==d);f++);else for(f in a)if(d=b.call(a[f],f,a[f]),!1===d)break;return a},
trim:function(a){return null==a?"":Pb.call(a)},Z:function(a,b){var c=b||[];null!=a&&(ea(Object(a))?d.u(c,"string"===typeof a?[a]:a):Da.call(c,a));return c},na:function(a,b,c){return null==b?-1:W.call(b,a,c)},u:function(a,b){var c=b.length,d=a.length,f=0;if("number"===typeof c)for(;f<c;f++)a[d++]=b[f];else for(;b[f]!==n;)a[d++]=b[f++];a.length=d;return a},ma:function(a,b,c){var d,f=[],g=0,h=a.length;for(c=!!c;g<h;g++)d=!!b(a[g],g),c!==d&&f.push(a[g]);return f},map:function(a,b,c){var d,f=0,g=a.length,
h=[];if(ea(a))for(;f<g;f++)d=b(a[f],f,c),null!=d&&(h[h.length]=d);else for(f in a)d=b(a[f],f,c),null!=d&&(h[h.length]=d);return fb.apply([],h)},k:1,ne:function(a,b){var c,e;"string"===typeof b&&(c=a[b],b=a,a=c);if(!d.d(a))return n;e=P.call(arguments,2);c=function(){return a.apply(b||this,e.concat(P.call(arguments)))};c.k=a.k=a.k||d.k++;return c},i:function(a,b,c,e,f,g,h){var k=0,l=a.length,p=null==c;if("object"===d.type(c))for(k in f=!0,c)d.i(a,b,k,c[k],!0,g,h);else if(e!==n&&(f=!0,d.d(e)||(h=!0),
p&&(h?(b.call(a,e),b=null):(p=b,b=function(a,b,c){return p.call(d(a),c)})),b))for(;k<l;k++)b(a[k],c,h?e:e.call(a[k],k,b(a[k],c)));return f?a:p?b.call(a):l?b(a[0],c):g},now:Date.now,gb:function(a,b,c,d){var f,g={};for(f in b)g[f]=a.style[f],a.style[f]=b[f];c=c.apply(a,d||[]);for(f in b)a.style[f]=g[f];return c}});d.R.n=function(a){ma||(ma=d.S(),"complete"===q.readyState?setTimeout(d.R):(q.addEventListener("DOMContentLoaded",da,!1),v.addEventListener("load",da,!1)));return ma.n(a)};d.a("Boolean Number String Function Array Date RegExp Object Error".split(" "),
function(a,b){na["[object "+b+"]"]=b.toLowerCase()});La=d(q);(function(a,b){function c(a,b,c){a="0x"+b-65536;return a!==a||c?b:0>a?String.fromCharCode(a+65536):String.fromCharCode(a>>10|55296,a&1023|56320)}function e(a,b){a===b&&(H=!0);return 0}function f(a,b,d,e){var f,g,h,k,l;(b?b.ownerDocument||b:K)!==D&&ia(b);b=b||D;d=d||[];if(!a||"string"!==typeof a)return d;if(1!==(k=b.nodeType)&&9!==k)return[];if(I&&!e){if(f=qa.exec(a))if(h=f[1])if(9===k)if((g=b.getElementById(h))&&g.parentNode){if(g.id===
h)return d.push(g),d}else return d;else{if(b.ownerDocument&&(g=b.ownerDocument.getElementById(h))&&ua(b,g)&&g.id===h)return d.push(g),d}else{if(f[2])return Z.apply(d,b.getElementsByTagName(a)),d;if((h=f[3])&&w.getElementsByClassName&&b.getElementsByClassName)return Z.apply(d,b.getElementsByClassName(h)),d}if(w.Oc&&(!A||!A.test(a))){g=f=y;h=b;l=9===k&&a;if(1===k&&"object"!==b.nodeName.toLowerCase()){k=q(a);(f=b.getAttribute("id"))?g=f.replace(ta,"\\$&"):b.setAttribute("id",g);g="[id='"+g+"'] ";for(h=
k.length;h--;)k[h]=g+v(k[h]);h=X.test(a)&&b.parentNode||b;l=k.join(",")}if(l)try{return Z.apply(d,h.querySelectorAll(l)),d}catch(m){}finally{f||b.removeAttribute("id")}}}var p;a:{a=a.replace(U,"$1");g=q(a);if(!e&&1===g.length){f=g[0]=g[0].slice(0);if(2<f.length&&"ID"===(p=f[0]).type&&w.wb&&9===b.nodeType&&I&&u.$[f[1].type]){b=(u.find.ID(p.matches[0].replace($,c),b)||[])[0];if(!b){p=d;break a}a=a.slice(f.shift().value.length)}for(k=V.needsContext.test(a)?0:f.length;k--;){p=f[k];if(u.$[h=p.type])break;
if(h=u.find[h])if(e=h(p.matches[0].replace($,c),X.test(f[0].type)&&b.parentNode||b)){f.splice(k,1);a=e.length&&v(f);if(!a){Z.apply(d,e);p=d;break a}break}}}F(a,g)(e,b,!I,d,X.test(a));p=d}return p}function g(){function a(c,d){b.push(c+=" ")>u.cc&&delete a[b.shift()];return a[c]=d}var b=[];return a}function h(a){a[y]=!0;return a}function k(a){var b=D.createElement("div");try{return!!a(b)}catch(c){return!1}finally{b.parentNode&&b.parentNode.removeChild(b)}}function l(a,b){for(var c=a.split("|"),d=a.length;d--;)u.G[c[d]]=
b}function p(a,b){var c=b&&a,d=c&&1===a.nodeType&&1===b.nodeType&&(~b.sourceIndex||T)-(~a.sourceIndex||T);if(d)return d;if(c)for(;c=c.nextSibling;)if(c===b)return-1;return a?1:-1}function n(a){return function(b){return"input"===b.nodeName.toLowerCase()&&b.type===a}}function m(a){return function(b){var c=b.nodeName.toLowerCase();return("input"===c||"button"===c)&&b.type===a}}function r(a){return h(function(b){b=+b;return h(function(c,d){for(var e,f=a([],c.length,b),g=f.length;g--;)c[e=f[g]]&&(c[e]=
!(d[e]=c[e]))})})}function t(){}function q(a,b){var c,d,e,g,h,k,l;if(h=P[a+" "])return b?0:h.slice(0);h=a;k=[];for(l=u.Kc;h;){if(!c||(d=la.exec(h)))d&&(h=h.slice(d[0].length)||h),k.push(e=[]);c=!1;if(d=ma.exec(h))c=d.shift(),e.push({value:c,type:d[0].replace(U," ")}),h=h.slice(c.length);for(g in u.filter)!(d=V[g].exec(h))||l[g]&&!(d=l[g](d))||(c=d.shift(),e.push({value:c,type:g,matches:d}),h=h.slice(c.length));if(!c)break}return b?h.length:h?f.error(a):P(a,k).slice(0)}function v(a){for(var b=0,c=
a.length,d="";b<c;b++)d+=a[b].value;return d}function Ga(a,b,c){var d=b.dir,e=c&&"parentNode"===d,f=S++;return b.wa?function(b,c,f){for(;b=b[d];)if(1===b.nodeType||e)return a(b,c,f)}:function(b,c,g){var h,k,Y,l=Q+" "+f;if(g)for(;b=b[d];){if((1===b.nodeType||e)&&a(b,c,g))return!0}else for(;b=b[d];)if(1===b.nodeType||e)if(Y=b[y]||(b[y]={}),(k=Y[d])&&k[0]===l){if(!0===(h=k[1])||h===xa)return!0===h}else if(k=Y[d]=[l],k[1]=a(b,c,g)||xa,!0===k[1])return!0}}function E(a){return 1<a.length?function(b,c,d){for(var e=
a.length;e--;)if(!a[e](b,c,d))return!1;return!0}:a[0]}function B(a,b,c,d,e){for(var f,g=[],h=0,k=a.length,l=null!=b;h<k;h++)if(f=a[h])if(!c||c(f,d,e))g.push(f),l&&b.push(h);return g}function M(a,b,c,d,e,g){d&&!d[y]&&(d=M(d));e&&!e[y]&&(e=M(e,g));return h(function(g,h,k,l){var m,p,n=[],s=[],r=h.length,w;if(!(w=g)){w=b||"*";for(var u=k.nodeType?[k]:k,t=[],Fa=0,q=u.length;Fa<q;Fa++)f(w,u[Fa],t);w=t}w=!a||!g&&b?w:B(w,n,a,k,l);u=c?e||(g?a:r||d)?[]:h:w;c&&c(w,u,k,l);if(d)for(m=B(u,s),d(m,[],k,l),k=m.length;k--;)if(p=
m[k])u[s[k]]=!(w[s[k]]=p);if(g){if(e||a){if(e){m=[];for(k=u.length;k--;)(p=u[k])&&m.push(w[k]=p);e(null,u=[],m,l)}for(k=u.length;k--;)(p=u[k])&&-1<(m=e?ja.call(g,p):n[k])&&(g[m]=!(h[m]=p))}}else u=B(u===h?u.splice(r,u.length):u),e?e(null,h,u,l):Z.apply(h,u)})}function C(a){var b,c,d,e=a.length,f=u.$[a[0].type];c=f||u.$[" "];for(var g=f?1:0,h=Ga(function(a){return a===b},c,!0),k=Ga(function(a){return-1<ja.call(b,a)},c,!0),l=[function(a,c,d){return!f&&(d||c!==ya)||((b=c).nodeType?h(a,c,d):k(a,c,d))}];g<
e;g++)if(c=u.$[a[g].type])l=[Ga(E(l),c)];else{c=u.filter[a[g].type].apply(null,a[g].matches);if(c[y]){for(d=++g;d<e&&!u.$[a[d].type];d++);return M(1<g&&E(l),1<g&&v(a.slice(0,g-1).concat({value:" "===a[g-2].type?"*":""})).replace(U,"$1"),c,g<d&&C(a.slice(g,d)),d<e&&C(a=a.slice(d)),d<e&&v(a))}l.push(c)}return E(l)}function x(a,b){function c(h,k,l,Y,m){var p,n,s=[],r=0,w="0",t=h&&[],q=null!=m,v=ya,x=h||g&&u.find.TAG("*",m&&k.parentNode||k),wa=Q+=null==v?1:Math.random()||0.1;q&&(ya=k!==D&&k,xa=d);for(;null!=
(m=x[w]);w++){if(g&&m){for(p=0;n=a[p++];)if(n(m,k,l)){Y.push(m);break}q&&(Q=wa,xa=++d)}e&&((m=!n&&m)&&r--,h&&t.push(m))}r+=w;if(e&&w!==r){for(p=0;n=b[p++];)n(t,s,k,l);if(h){if(0<r)for(;w--;)t[w]||s[w]||(s[w]=ga.call(Y));s=B(s)}Z.apply(Y,s);q&&!h&&0<s.length&&1<r+b.length&&f.Ub(Y)}q&&(Q=wa,ya=v);return t}var d=0,e=0<b.length,g=0<a.length;return e?h(c):c}var z,w,xa,u,za,L,F,ya,G,ia,D,J,I,A,ka,Aa,ua,y="sizzle"+-new Date,K=a.document,Q=0,S=0,O=g(),P=g(),R=g(),H=!1,N=typeof b,T=-2147483648,fa={}.hasOwnProperty,
aa=[],ga=aa.pop,ha=aa.push,Z=aa.push,ba=aa.slice,ja=aa.indexOf||function(a){for(var b=0,c=this.length;b<c;b++)if(this[b]===a)return b;return-1},ca="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+".replace("w","w#"),da="\\[[\\x20\\t\\r\\n\\f]*((?:\\\\.|[\\w-]|[^\\x00-\\xa0])+)[\\x20\\t\\r\\n\\f]*(?:([*^$|!~]?=)[\\x20\\t\\r\\n\\f]*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+ca+")|)|)[\\x20\\t\\r\\n\\f]*\\]",W=":((?:\\\\.|[\\w-]|[^\\x00-\\xa0])+)(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|"+da.replace(3,
8)+")*)|.*)\\)|)",U=RegExp("^[\\x20\\t\\r\\n\\f]+|((?:^|[^\\\\])(?:\\\\.)*)[\\x20\\t\\r\\n\\f]+$","g"),la=/^[\x20\t\r\n\f]*,[\x20\t\r\n\f]*/,ma=/^[\x20\t\r\n\f]*([>+~]|[\x20\t\r\n\f])[\x20\t\r\n\f]*/,X=/[\x20\t\r\n\f]*[+~]/,na=RegExp("=[\\x20\\t\\r\\n\\f]*([^\\]'\"]*)[\\x20\\t\\r\\n\\f]*\\]","g"),oa=RegExp(W),pa=RegExp("^"+ca+"$"),V={ID:/^#((?:\\.|[\w-]|[^\x00-\xa0])+)/,CLASS:/^\.((?:\\.|[\w-]|[^\x00-\xa0])+)/,TAG:RegExp("^("+"(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+".replace("w","w*")+")"),ATTR:RegExp("^"+
da),PSEUDO:RegExp("^"+W),CHILD:RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\([\\x20\\t\\r\\n\\f]*(even|odd|(([+-]|)(\\d*)n|)[\\x20\\t\\r\\n\\f]*(?:([+-]|)[\\x20\\t\\r\\n\\f]*(\\d+)|))[\\x20\\t\\r\\n\\f]*\\)|)","i"),bool:RegExp("^(?:checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped)$","i"),needsContext:RegExp("^[\\x20\\t\\r\\n\\f]*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\([\\x20\\t\\r\\n\\f]*((?:-\\d)?\\d*)[\\x20\\t\\r\\n\\f]*\\)|)(?=[^-]|$)",
"i")},ea=/^[^{]+\{\s*\[native \w/,qa=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,ra=/^(?:input|select|textarea|button)$/i,sa=/^h\d$/i,ta=/'|\\/g,$=RegExp("\\\\([\\da-f]{1,6}[\\x20\\t\\r\\n\\f]?|([\\x20\\t\\r\\n\\f])|.)","ig");try{Z.apply(aa=ba.call(K.childNodes),K.childNodes),aa[K.childNodes.length].nodeType}catch(va){Z={apply:aa.length?function(a,b){ha.apply(a,ba.call(b))}:function(a,b){for(var c=a.length,d=0;a[c++]=b[d++];);a.length=c-1}}}L=f.vc=function(a){return(a=a&&(a.ownerDocument||a).documentElement)?
"HTML"!==a.nodeName:!1};w=f.l={};ia=f.ue=function(a){var b=a?a.ownerDocument||a:K;a=b.defaultView;if(b===D||9!==b.nodeType||!b.documentElement)return D;D=b;J=b.documentElement;I=!L(b);a&&a.attachEvent&&a!==a.top&&a.attachEvent("onbeforeunload",function(){ia()});w.attributes=k(function(a){a.className="i";return!a.getAttribute("className")});w.getElementsByTagName=k(function(a){a.appendChild(b.createComment(""));return!a.getElementsByTagName("*").length});w.getElementsByClassName=k(function(a){a.innerHTML=
"<div class='a'></div><div class='a i'></div>";a.firstChild.className="i";return 2===a.getElementsByClassName("i").length});w.wb=k(function(a){J.appendChild(a).id=y;return!b.getElementsByName||!b.getElementsByName(y).length});w.wb?(u.find.ID=function(a,b){if(typeof b.getElementById!==N&&I){var c=b.getElementById(a);return c&&c.parentNode?[c]:[]}},u.filter.ID=function(a){var b=a.replace($,c);return function(a){return a.getAttribute("id")===b}}):(delete u.find.ID,u.filter.ID=function(a){var b=a.replace($,
c);return function(a){return(a=typeof a.getAttributeNode!==N&&a.getAttributeNode("id"))&&a.value===b}});u.find.TAG=w.getElementsByTagName?function(a,b){if(typeof b.getElementsByTagName!==N)return b.getElementsByTagName(a)}:function(a,b){var c,d=[],e=0,f=b.getElementsByTagName(a);if("*"===a){for(;c=f[e++];)1===c.nodeType&&d.push(c);return d}return f};u.find.CLASS=w.getElementsByClassName&&function(a,b){if(typeof b.getElementsByClassName!==N&&I)return b.getElementsByClassName(a)};ka=[];A=[];if(w.Oc=
ea.test(b.querySelectorAll))k(function(a){a.innerHTML="<select><option selected=''></option></select>";a.querySelectorAll("[selected]").length||A.push("\\[[\\x20\\t\\r\\n\\f]*(?:value|checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped)");a.querySelectorAll(":checked").length||A.push(":checked")}),k(function(a){var c=b.createElement("input");c.setAttribute("type","hidden");a.appendChild(c).setAttribute("t","");a.querySelectorAll("[t^='']").length&&
A.push("[*^$]=[\\x20\\t\\r\\n\\f]*(?:''|\"\")");a.querySelectorAll(":enabled").length||A.push(":enabled",":disabled");a.querySelectorAll("*,:x");A.push(",.*:")});(w.matchesSelector=ea.test(Aa=J.webkitMatchesSelector||J.mozMatchesSelector||J.ae||J.msMatchesSelector))&&k(function(a){w.lc=Aa.call(a,"div");Aa.call(a,"[s!='']:x");ka.push("!=",W)});A=A.length&&RegExp(A.join("|"));ka=ka.length&&RegExp(ka.join("|"));ua=ea.test(J.contains)||J.compareDocumentPosition?function(a,b){var c=9===a.nodeType?a.documentElement:
a,d=b&&b.parentNode;return a===d||!!(d&&1===d.nodeType&&(c.contains?c.contains(d):a.compareDocumentPosition&&a.compareDocumentPosition(d)&16))}:function(a,b){if(b)for(;b=b.parentNode;)if(b===a)return!0;return!1};e=J.compareDocumentPosition?function(a,c){if(a===c)return H=!0,0;var d=c.compareDocumentPosition&&a.compareDocumentPosition&&a.compareDocumentPosition(c);return d?d&1||!w.Zc&&c.compareDocumentPosition(a)===d?a===b||ua(K,a)?-1:c===b||ua(K,c)?1:G?ja.call(G,a)-ja.call(G,c):0:d&4?-1:1:a.compareDocumentPosition?
-1:1}:function(a,c){var d,e=0;d=a.parentNode;var f=c.parentNode,g=[a],h=[c];if(a===c)return H=!0,0;if(!d||!f)return a===b?-1:c===b?1:d?-1:f?1:G?ja.call(G,a)-ja.call(G,c):0;if(d===f)return p(a,c);for(d=a;d=d.parentNode;)g.unshift(d);for(d=c;d=d.parentNode;)h.unshift(d);for(;g[e]===h[e];)e++;return e?p(g[e],h[e]):g[e]===K?-1:h[e]===K?1:0};return b};f.matches=function(a,b){return f(a,null,null,b)};f.matchesSelector=function(a,b){(a.ownerDocument||a)!==D&&ia(a);b=b.replace(na,"='$1']");if(w.matchesSelector&&
I&&!(ka&&ka.test(b)||A&&A.test(b)))try{var c=Aa.call(a,b);if(c||w.lc||a.document&&11!==a.document.nodeType)return c}catch(d){}return 0<f(b,D,null,[a]).length};f.contains=function(a,b){(a.ownerDocument||a)!==D&&ia(a);return ua(a,b)};f.N=function(a,c){(a.ownerDocument||a)!==D&&ia(a);var d=u.G[c.toLowerCase()],d=d&&fa.call(u.G,c.toLowerCase())?d(a,c,!I):b;return d===b?w.attributes||!I?a.getAttribute(c):(d=a.getAttributeNode(c))&&d.specified?d.value:null:d};f.error=function(a){throw Error("Syntax error, unrecognized expression: "+
a);};f.Ub=function(a){var b,c=[],d=0,f=0;H=!w.kc;G=!w.$c&&a.slice(0);a.sort(e);if(H){for(;b=a[f++];)b===a[f]&&(d=c.push(f));for(;d--;)a.splice(c[d],1)}return a};za=f.qc=function(a){var b,c="",d=0;b=a.nodeType;if(!b)for(;b=a[d];d++)c+=za(b);else if(1===b||9===b||11===b){if("string"===typeof a.textContent)return a.textContent;for(a=a.firstChild;a;a=a.nextSibling)c+=za(a)}else if(3===b||4===b)return a.nodeValue;return c};u=f.Vc={cc:50,Bd:h,match:V,G:{},find:{},$:{">":{dir:"parentNode",wa:!0}," ":{dir:"parentNode"},
"+":{dir:"previousSibling",wa:!0},"~":{dir:"previousSibling"}},Kc:{ATTR:function(a){a[1]=a[1].replace($,c);a[3]=(a[4]||a[5]||"").replace($,c);"~="===a[2]&&(a[3]=" "+a[3]+" ");return a.slice(0,4)},CHILD:function(a){a[1]=a[1].toLowerCase();"nth"===a[1].slice(0,3)?(a[3]||f.error(a[0]),a[4]=+(a[4]?a[5]+(a[6]||1):2*("even"===a[3]||"odd"===a[3])),a[5]=+(a[7]+a[8]||"odd"===a[3])):a[3]&&f.error(a[0]);return a},PSEUDO:function(a){var c,d=!a[5]&&a[2];if(V.CHILD.test(a[0]))return null;a[3]&&a[4]!==b?a[2]=a[4]:
d&&oa.test(d)&&(c=q(d,!0))&&(c=d.indexOf(")",d.length-c)-d.length)&&(a[0]=a[0].slice(0,c),a[2]=d.slice(0,c));return a.slice(0,3)}},filter:{TAG:function(a){var b=a.replace($,c).toLowerCase();return"*"===a?function(){return!0}:function(a){return a.nodeName&&a.nodeName.toLowerCase()===b}},CLASS:function(a){var b=O[a+" "];return b||(b=RegExp("(^|[\\x20\\t\\r\\n\\f])"+a+"([\\x20\\t\\r\\n\\f]|$)"))&&O(a,function(a){return b.test("string"===typeof a.className&&a.className||typeof a.getAttribute!==N&&a.getAttribute("class")||
"")})},ATTR:function(a,b,c){return function(d){d=f.N(d,a);if(null==d)return"!="===b;if(!b)return!0;d+="";return"="===b?d===c:"!="===b?d!==c:"^="===b?c&&0===d.indexOf(c):"*="===b?c&&-1<d.indexOf(c):"$="===b?c&&d.slice(-c.length)===c:"~="===b?-1<(" "+d+" ").indexOf(c):"|="===b?d===c||d.slice(0,c.length+1)===c+"-":!1}},CHILD:function(a,b,c,d,e){var f="nth"!==a.slice(0,3),g="last"!==a.slice(-4),h="of-type"===b;return 1===d&&0===e?function(a){return!!a.parentNode}:function(b,c,k){var l,m,p,n,s;c=f!==g?
"nextSibling":"previousSibling";var r=b.parentNode,w=h&&b.nodeName.toLowerCase();k=!k&&!h;if(r){if(f){for(;c;){for(m=b;m=m[c];)if(h?m.nodeName.toLowerCase()===w:1===m.nodeType)return!1;s=c="only"===a&&!s&&"nextSibling"}return!0}s=[g?r.firstChild:r.lastChild];if(g&&k)for(k=r[y]||(r[y]={}),l=k[a]||[],n=l[0]===Q&&l[1],p=l[0]===Q&&l[2],m=n&&r.childNodes[n];m=++n&&m&&m[c]||(p=n=0)||s.pop();){if(1===m.nodeType&&++p&&m===b){k[a]=[Q,n,p];break}}else if(k&&(l=(b[y]||(b[y]={}))[a])&&l[0]===Q)p=l[1];else for(;(m=
++n&&m&&m[c]||(p=n=0)||s.pop())&&((h?m.nodeName.toLowerCase()!==w:1!==m.nodeType)||!++p||(k&&((m[y]||(m[y]={}))[a]=[Q,p]),m!==b)););p-=e;return p===d||0===p%d&&0<=p/d}}},PSEUDO:function(a,b){var c,d=u.L[a]||u.Nb[a.toLowerCase()]||f.error("unsupported pseudo: "+a);return d[y]?d(b):1<d.length?(c=[a,a,"",b],u.Nb.hasOwnProperty(a.toLowerCase())?h(function(a,c){for(var e,f=d(a,b),g=f.length;g--;)e=ja.call(a,f[g]),a[e]=!(c[e]=f[g])}):function(a){return d(a,0,c)}):d}},L:{not:h(function(a){var b=[],c=[],
d=F(a.replace(U,"$1"));return d[y]?h(function(a,b,c,e){e=d(a,null,e,[]);for(var f=a.length;f--;)if(c=e[f])a[f]=!(b[f]=c)}):function(a,e,f){b[0]=a;d(b,null,f,c);return!c.pop()}}),has:h(function(a){return function(b){return 0<f(a,b).length}}),contains:h(function(a){return function(b){return-1<(b.textContent||b.innerText||za(b)).indexOf(a)}}),lang:h(function(a){pa.test(a||"")||f.error("unsupported lang: "+a);a=a.replace($,c).toLowerCase();return function(b){var c;do if(c=I?b.lang:b.getAttribute("xml:lang")||
b.getAttribute("lang"))return c=c.toLowerCase(),c===a||0===c.indexOf(a+"-");while((b=b.parentNode)&&1===b.nodeType);return!1}}),target:function(b){var c=a.location&&a.location.hash;return c&&c.slice(1)===b.id},root:function(a){return a===J},focus:function(a){return a===D.activeElement&&(!D.hasFocus||D.hasFocus())&&!!(a.type||a.href||~a.tabIndex)},enabled:function(a){return!1===a.disabled},disabled:function(a){return!0===a.disabled},checked:function(a){var b=a.nodeName.toLowerCase();return"input"===
b&&!!a.checked||"option"===b&&!!a.selected},selected:function(a){a.parentNode&&a.parentNode.selectedIndex;return!0===a.selected},empty:function(a){for(a=a.firstChild;a;a=a.nextSibling)if("@"<a.nodeName||3===a.nodeType||4===a.nodeType)return!1;return!0},parent:function(a){return!u.L.empty(a)},header:function(a){return sa.test(a.nodeName)},input:function(a){return ra.test(a.nodeName)},button:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&"button"===a.type||"button"===b},text:function(a){var b;
return"input"===a.nodeName.toLowerCase()&&"text"===a.type&&(null==(b=a.getAttribute("type"))||b.toLowerCase()===a.type)},first:r(function(){return[0]}),last:r(function(a,b){return[b-1]}),eq:r(function(a,b,c){return[0>c?c+b:c]}),even:r(function(a,b){for(var c=0;c<b;c+=2)a.push(c);return a}),odd:r(function(a,b){for(var c=1;c<b;c+=2)a.push(c);return a}),lt:r(function(a,b,c){for(b=0>c?c+b:c;0<=--b;)a.push(b);return a}),gt:r(function(a,b,c){for(c=0>c?c+b:c;++c<b;)a.push(c);return a})}};u.L.nth=u.L.eq;
for(z in{oe:!0,wd:!0,file:!0,Ic:!0,Od:!0})u.L[z]=n(z);for(z in{submit:!0,reset:!0})u.L[z]=m(z);t.prototype=u.filters=u.L;u.Nb=new t;F=f.compile=function(a,b){var c,d=[],e=[],f=R[a+" "];if(!f){b||(b=q(a));for(c=b.length;c--;)f=C(b[c]),f[y]?d.push(f):e.push(f);f=R(a,x(e,d))}return f};w.$c=y.split("").sort(e).join("")===y;w.kc=H;ia();w.Zc=k(function(a){return a.compareDocumentPosition(D.createElement("div"))&1});k(function(a){a.innerHTML="<a href='#'></a>";return"#"===a.firstChild.getAttribute("href")})||
l("type|href|height|width",function(a,b,c){if(!c)return a.getAttribute(b,"type"===b.toLowerCase()?1:2)});w.attributes&&k(function(a){a.innerHTML="<input/>";a.firstChild.setAttribute("value","");return""===a.firstChild.getAttribute("value")})||l("value",function(a,b,c){if(!c&&"input"===a.nodeName.toLowerCase())return a.defaultValue});k(function(a){return null==a.getAttribute("disabled")})||l("checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
function(a,b,c){var d;if(!c)return(d=a.getAttributeNode(b))&&d.specified?d.value:!0===a[b]?b.toLowerCase():null});d.find=f;d.g=f.Vc;d.g[":"]=d.g.L;d.unique=f.Ub;d.text=f.qc;d.Xa=f.vc;d.contains=f.contains})(v);var Ma={};d.ca=function(a){function b(d){c=a.memory&&d;e=!0;k=g||0;g=0;h=l.length;for(f=!0;l&&k<h;k++)if(!1===l[k].apply(d[0],d[1])&&a.Ae){c=!1;break}f=!1;l&&(p?p.length&&b(p.shift()):c?l=[]:s.disable())}a="string"===typeof a?Ma[a]||Ab(a):d.extend({},a);var c,e,f,g,h,k,l=[],p=!a.be&&[],s={add:function(){if(l){var e=
l.length;(function wa(b){d.a(b,function(b,c){var e=d.type(c);"function"===e?a.unique&&s.yb(c)||l.push(c):c&&c.length&&"string"!==e&&wa(c)})})(arguments);f?h=l.length:c&&(g=e,b(c))}return this},remove:function(){l&&d.a(arguments,function(a,b){for(var c;-1<(c=d.na(b,l,c));)l.splice(c,1),f&&(c<=h&&h--,c<=k&&k--)});return this},yb:function(a){return a?-1<d.na(a,l):!(!l||!l.length)},empty:function(){l=[];h=0;return this},disable:function(){l=p=c=n;return this},disabled:function(){return!l},xc:function(){p=
n;c||s.disable();return this},Ud:function(){return!p},Sa:function(a,c){!l||e&&!p||(c=c||[],c=[a,c.slice?c.slice():c],f?p.push(c):b(c));return this},va:function(){s.Sa(this,arguments);return this},Jd:function(){return!!e}};return s};d.extend({S:function(a){var b=[["resolve","done",d.ca("once memory"),"resolved"],["reject","fail",d.ca("once memory"),"rejected"],["notify","progress",d.ca("memory")]],c="pending",e={state:function(){return c},F:function(){f.A(arguments).la(arguments);return this},cd:function(){var a=
arguments;return d.S(function(c){d.a(b,function(b,l){var p=l[0],n=d.d(a[b])&&a[b];f[l[1]](function(){var a=n&&n.apply(this,arguments);if(a&&d.d(a.n))a.n().A(c.re).la(c.Qc).cb(c.$d);else c[p+"With"](this===e?c.n():this,n?[a]:arguments)})});a=null}).n()},n:function(a){return null!=a?d.extend(a,e):e}},f={};e.ie=e.cd;d.a(b,function(a,d){var k=d[2],l=d[3];e[d[1]]=k.add;l&&k.add(function(){c=l},b[a^1][2].disable,b[2][2].xc);f[d[0]]=function(){f[d[0]+"With"](this===f?e:this,arguments);return this};f[d[0]+
"With"]=k.Sa});e.n(f);a&&a.call(f,f);return f},Ne:function(a){function b(a,b,c){return function(d){b[a]=this;c[a]=1<arguments.length?P.call(arguments):d;c===k?h.Dc(b,c):--g||h.aa(b,c)}}var c=0,e=P.call(arguments),f=e.length,g=1!==f||a&&d.d(a.n)?f:0,h=1===g?a:d.S(),k,l,p;if(1<f)for(k=Array(f),l=Array(f),p=Array(f);c<f;c++)e[c]&&d.d(e[c].n)?e[c].n().A(b(c,p,e)).la(h.Qc).cb(b(c,l,k)):--g;g||h.aa(p,e);return h.n()}});d.l=function(a){var b=q.createElement("input"),c=q.createDocumentFragment(),e=q.createElement("div"),
f=q.createElement("select"),g=f.appendChild(q.createElement("option"));if(!b.type)return a;b.type="checkbox";a.ec=""!==b.value;a.Fc=g.selected;a.Jb=!0;a.rb=!0;a.Hb=!1;b.checked=!0;a.Cc=b.cloneNode(!0).checked;f.disabled=!0;a.Ec=!g.disabled;b=q.createElement("input");b.value="t";b.type="radio";a.Pc="t"===b.value;b.setAttribute("checked","t");b.setAttribute("name","t");c.appendChild(b);a.dc=c.cloneNode(!0).cloneNode(!0).lastChild.checked;a.oc="onfocusin"in v;e.style.pb="content-box";e.cloneNode(!0).style.pb=
"";a.fc="content-box"===e.style.pb;d(function(){var b,c,f=q.getElementsByTagName("body")[0];f&&(b=q.createElement("div"),b.style.cssText="border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px",f.appendChild(b).appendChild(e),e.innerHTML="",e.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%",d.gb(f,null!=f.style.zoom?{zoom:1}:{},function(){a.boxSizing=
4===e.offsetWidth}),v.getComputedStyle&&(a.Hb="1%"!==(v.getComputedStyle(e,null)||{}).top,a.rb="4px"===(v.getComputedStyle(e,null)||{width:"4px"}).width,c=e.appendChild(q.createElement("div")),c.style.cssText=e.style.cssText="padding:0;margin:0;border:0;display:block;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box",c.style.marginRight=c.style.width="0",e.style.width="1px",a.Jb=!parseFloat((v.getComputedStyle(c,null)||{}).marginRight)),f.removeChild(b))});return a}({});
var E,t,Cb=/(?:\{[\s\S]*\}|\[[\s\S]*\])$/,Bb=/([A-Z])/g;F.uid=1;F.D=function(a){return a.nodeType?1===a.nodeType||9===a.nodeType:!0};F.prototype={key:function(a){if(!F.D(a))return 0;var b={},c=a[this.expando];if(!c){c=F.uid++;try{b[this.expando]={value:c},Object.defineProperties(a,b)}catch(e){b[this.expando]=c,d.extend(a,b)}}this.o[c]||(this.o[c]={});return c},set:function(a,b,c){var e;a=this.key(a);var f=this.o[a];if("string"===typeof b)f[b]=c;else if(d.oa(f))d.extend(this.o[a],b);else for(e in b)f[e]=
b[e];return f},get:function(a,b){var c=this.o[this.key(a)];return b===n?c:c[b]},i:function(a,b,c){if(b===n||b&&"string"===typeof b&&c===n)return c=this.get(a,b),c!==n?c:this.get(a,d.H(b));this.set(a,b,c);return c!==n?c:b},remove:function(a,b){var c,e;c=this.key(a);var f=this.o[c];if(b===n)this.o[c]={};else for(d.isArray(b)?e=b.concat(b.map(d.H)):(c=d.H(b),b in f?e=[b,c]:(e=c,e=e in f?[e]:e.match(L)||[])),c=e.length;c--;)delete f[e[c]]},W:function(a){return!d.oa(this.o[a[this.expando]]||{})}};E=new F;
t=new F;d.extend({jb:F.D,W:function(a){return E.W(a)||t.W(a)},data:function(a,b,c){return E.i(a,b,c)},Sc:function(a,b){E.remove(a,b)},od:function(a,b,c){return t.i(a,b,c)},pd:function(a,b){t.remove(a,b)}});d.b.extend({data:function(a,b){var c,e,f=this[0],g=0,h=null;if(a===n){if(this.length&&(h=E.get(f),1===f.nodeType&&!t.get(f,"hasDataAttrs"))){for(c=f.attributes;g<c.length;g++)e=c[g].name,0===e.indexOf("data-")&&(e=d.H(e.slice(5)),Na(f,e,h[e]));t.set(f,"hasDataAttrs",!0)}return h}return"object"===
typeof a?this.a(function(){E.set(this,a)}):d.i(this,function(b){var c,e=d.H(a);if(f&&b===n){c=E.get(f,a);if(c!==n)return c;c=E.get(f,e);if(c!==n)return c;c=Na(f,e,n);if(c!==n)return c}else this.a(function(){var c=E.get(this,e);E.set(this,e,b);-1!==a.indexOf("-")&&c!==n&&E.set(this,a,b)})},null,b,1<arguments.length,null,!0)},Sc:function(a){return this.a(function(){E.remove(this,a)})}});d.extend({f:function(a,b,c){var e;if(a)return b=(b||"fx")+"queue",e=t.get(a,b),c&&(!e||d.isArray(c)?e=t.i(a,b,d.Z(c)):
e.push(c)),e||[]},U:function(a,b){function c(){d.U(a,b)}b=b||"fx";var e=d.f(a,b),f=e.length,g=e.shift(),h=d.Ia(a,b);"inprogress"===g&&(g=e.shift(),f--);g&&("fx"===b&&e.unshift("inprogress"),delete h.stop,g.call(a,c,h));!f&&h&&h.empty.va()},Ia:function(a,b){var c=b+"queueHooks";return t.get(a,c)||t.i(a,c,{empty:d.ca("once memory").add(function(){t.remove(a,[b+"queue",c])})})}});d.b.extend({f:function(a,b){var c=2;"string"!==typeof a&&(b=a,a="fx",c--);return arguments.length<c?d.f(this[0],a):b===n?
this:this.a(function(){var c=d.f(this,a,b);d.Ia(this,a);"fx"===a&&"inprogress"!==c[0]&&d.U(this,a)})},U:function(a){return this.a(function(){d.U(this,a)})},Cd:function(a,b){a=d.h?d.h.Fa[a]||a:a;return this.f(b||"fx",function(b,d){var f=setTimeout(b,a);d.stop=function(){clearTimeout(f)}})},xd:function(a){return this.f(a||"fx",[])},n:function(a,b){function c(){--f||g.aa(h,[h])}var e,f=1,g=d.S(),h=this,k=this.length;"string"!==typeof a&&(b=a,a=n);for(a=a||"fx";k--;)(e=t.get(h[k],a+"queueHooks"))&&e.empty&&
(f++,e.empty.add(c));c();return g.n(b)}});var hb,Ha=/[\t\r\n\f]/g,Tb=/\r/g,Ub=/^(?:input|select|textarea|button)$/i;d.b.extend({N:function(a,b){return d.i(this,d.N,a,b,1<arguments.length)},Ea:function(a){return this.a(function(){d.Ea(this,a)})},j:function(a,b){return d.i(this,d.j,a,b,1<arguments.length)},pe:function(a){return this.a(function(){delete this[d.Da[a]||a]})},Ja:function(a){var b,c,e,f,g,h=0,k=this.length;b="string"===typeof a&&a;if(d.d(a))return this.a(function(b){d(this).Ja(a.call(this,
b,this.className))});if(b)for(b=(a||"").match(L)||[];h<k;h++)if(c=this[h],e=1===c.nodeType&&(c.className?(" "+c.className+" ").replace(Ha," "):" ")){for(g=0;f=b[g++];)0>e.indexOf(" "+f+" ")&&(e+=f+" ");c.className=d.trim(e)}return this},fb:function(a){var b,c,e,f,g,h=0,k=this.length;b=0===arguments.length||"string"===typeof a&&a;if(d.d(a))return this.a(function(b){d(this).fb(a.call(this,b,this.className))});if(b)for(b=(a||"").match(L)||[];h<k;h++)if(c=this[h],e=1===c.nodeType&&(c.className?(" "+c.className+
" ").replace(Ha," "):"")){for(g=0;f=b[g++];)for(;0<=e.indexOf(" "+f+" ");)e=e.replace(" "+f+" "," ");c.className=a?d.trim(e):""}return this},gd:function(a,b){var c=typeof a;return"boolean"===typeof b&&"string"===c?b?this.Ja(a):this.fb(a):d.d(a)?this.a(function(c){d(this).gd(a.call(this,c,this.className,b),b)}):this.a(function(){if("string"===c)for(var b,f=0,g=d(this),h=a.match(L)||[];b=h[f++];)g.rc(b)?g.fb(b):g.Ja(b);else if(c===X||"boolean"===c)this.className&&t.set(this,"__className__",this.className),
this.className=this.className||!1===a?"":t.get(this,"__className__")||""})},rc:function(a){a=" "+a+" ";for(var b=0,c=this.length;b<c;b++)if(1===this[b].nodeType&&0<=(" "+this[b].className+" ").replace(Ha," ").indexOf(a))return!0;return!1},sa:function(a){var b,c,e,f=this[0];if(arguments.length)return e=d.d(a),this.a(function(c){1===this.nodeType&&(c=e?a.call(this,c,d(this).sa()):a,null==c?c="":"number"===typeof c?c+="":d.isArray(c)&&(c=d.map(c,function(a){return null==a?"":a+""})),b=d.ba[this.type]||
d.ba[this.nodeName.toLowerCase()],b&&"set"in b&&b.set(this,c,"value")!==n||(this.value=c))});if(f){if((b=d.ba[f.type]||d.ba[f.nodeName.toLowerCase()])&&"get"in b&&(c=b.get(f,"value"))!==n)return c;c=f.value;return"string"===typeof c?c.replace(Tb,""):null==c?"":c}}});d.extend({ba:{Eb:{get:function(a){var b=a.attributes.value;return!b||b.specified?a.value:a.text}},select:{get:function(a){for(var b,c=a.options,e=a.selectedIndex,f=(a="select-one"===a.type||0>e)?null:[],g=a?e+1:c.length,h=0>e?g:a?e:0;h<
g;h++)if(b=c[h],!(!b.selected&&h!==e||(d.l.Ec?b.disabled:null!==b.getAttribute("disabled"))||b.parentNode.disabled&&d.nodeName(b.parentNode,"optgroup"))){b=d(b).sa();if(a)return b;f.push(b)}return f},set:function(a,b){for(var c,e,f=a.options,g=d.Z(b),h=f.length;h--;)if(e=f[h],e.selected=0<=d.na(d(e).sa(),g))c=!0;c||(a.selectedIndex=-1);return g}}},N:function(a,b,c){var e,f,g=a.nodeType;if(a&&3!==g&&8!==g&&2!==g){if(typeof a.getAttribute===X)return d.j(a,b,c);1===g&&d.Xa(a)||(b=b.toLowerCase(),e=d.ac[b]||
(d.g.match.qb.test(b)?hb:void 0));if(c!==n)if(null===c)d.Ea(a,b);else{if(e&&"set"in e&&(f=e.set(a,c,b))!==n)return f;a.setAttribute(b,c+"");return c}else{if(e&&"get"in e&&null!==(f=e.get(a,b)))return f;f=d.find.N(a,b);return null==f?n:f}}},Ea:function(a,b){var c,e,f=0,g=b&&b.match(L);if(g&&1===a.nodeType)for(;c=g[f++];)e=d.Da[c]||c,d.g.match.qb.test(c)&&(a[e]=!1),a.removeAttribute(c)},ac:{type:{set:function(a,b){if(!d.l.Pc&&"radio"===b&&d.nodeName(a,"input")){var c=a.value;a.setAttribute("type",b);
c&&(a.value=c);return b}}}},Da:{"for":"htmlFor","class":"className"},j:function(a,b,c){var e,f,g;g=a.nodeType;if(a&&3!==g&&8!==g&&2!==g){if(g=1!==g||!d.Xa(a))b=d.Da[b]||b,f=d.B[b];return c!==n?f&&"set"in f&&(e=f.set(a,c,b))!==n?e:a[b]=c:f&&"get"in f&&null!==(e=f.get(a,b))?e:a[b]}},B:{tabIndex:{get:function(a){return a.hasAttribute("tabindex")||Ub.test(a.nodeName)||a.href?a.tabIndex:-1}}}});hb={set:function(a,b,c){!1===b?d.Ea(a,c):a.setAttribute(c,c);return c}};d.a(d.g.match.qb.source.match(/\w+/g),
function(a,b){var c=d.g.G[b]||d.find.N;d.g.G[b]=function(a,b,g){var h=d.g.G[b];a=g?n:(d.g.G[b]=n)!=c(a,b,g)?b.toLowerCase():null;d.g.G[b]=h;return a}});d.l.Fc||(d.B.selected={get:function(a){(a=a.parentNode)&&a.parentNode&&a.parentNode.selectedIndex;return null}});d.a("tabIndex readOnly maxLength cellSpacing cellPadding rowSpan colSpan useMap frameBorder contentEditable".split(" "),function(){d.Da[this.toLowerCase()]=this});d.a(["radio","checkbox"],function(){d.ba[this]={set:function(a,b){if(d.isArray(b))return a.checked=
0<=d.na(d(a).sa(),b)}};d.l.ec||(d.ba[this].get=function(a){return null===a.getAttribute("value")?"on":a.value})});var Vb=/^key/,Wb=/^(?:mouse|contextmenu)|click/,ib=/^(?:focusinfocus|focusoutblur)$/,jb=/^([^.]*)(?:\.(.+)|)$/;d.event={global:{},add:function(a,b,c,e,f){var g,h,k,l,p,s,m,r,q;if(p=t.get(a)){c.O&&(g=c,c=g.O,f=g.p);c.k||(c.k=d.k++);(l=p.ka)||(l=p.ka={});(h=p.handle)||(h=p.handle=function(a){return typeof d===X||a&&d.event.hb===a.type?n:d.event.tb.apply(h.e,arguments)},h.e=a);b=(b||"").match(L)||
[""];for(p=b.length;p--;)k=jb.exec(b[p])||[],r=s=k[1],q=(k[2]||"").split(".").sort(),r&&(k=d.event.C[r]||{},r=(f?k.ia:k.Ma)||r,k=d.event.C[r]||{},s=d.extend({type:r,pa:s,data:e,O:c,k:c.k,p:f,ab:f&&d.g.match.ab.test(f),Q:q.join(".")},g),(m=l[r])||(m=l[r]=[],m.Pa=0,k.Ob&&!1!==k.Ob.call(a,e,q,h)||a.addEventListener&&a.addEventListener(r,h,!1)),k.add&&(k.add.call(a,s),s.O.k||(s.O.k=c.k)),f?m.splice(m.Pa++,0,s):m.push(s),d.event.global[r]=!0);a=null}},remove:function(a,b,c,e,f){var g,h,k,l,p,n,m,r,q,v,
E,B=t.W(a)&&t.get(a);if(B&&(l=B.ka)){b=(b||"").match(L)||[""];for(p=b.length;p--;)if(k=jb.exec(b[p])||[],q=E=k[1],v=(k[2]||"").split(".").sort(),q){m=d.event.C[q]||{};q=(e?m.ia:m.Ma)||q;r=l[q]||[];k=k[2]&&RegExp("(^|\\.)"+v.join("\\.(?:.*\\.|)")+"(\\.|$)");for(h=g=r.length;g--;)n=r[g],!f&&E!==n.pa||c&&c.k!==n.k||k&&!k.test(n.Q)||e&&!(e===n.p||"**"===e&&n.p)||(r.splice(g,1),n.p&&r.Pa--,m.remove&&m.remove.call(a,n));h&&!r.length&&(m.Tb&&!1!==m.Tb.call(a,v,B.handle)||d.Kb(a,q,B.handle),delete l[q])}else for(q in l)d.event.remove(a,
q+b[p],c,e,!0);d.oa(l)&&(delete B.handle,t.remove(a,"events"))}},m:function(a,b,c,e){var f,g,h,k,l,p,s=[c||q],m=Ea.call(a,"type")?a.type:a;p=Ea.call(a,"namespace")?a.Q.split("."):[];g=f=c=c||q;if(3!==c.nodeType&&8!==c.nodeType&&!ib.test(m+d.event.hb)&&(0<=m.indexOf(".")&&(p=m.split("."),m=p.shift(),p.sort()),k=0>m.indexOf(":")&&"on"+m,a=a[d.expando]?a:new d.T(m,"object"===typeof a&&a),a.Sd=e?2:3,a.Q=p.join("."),a.Cb=a.Q?RegExp("(^|\\.)"+p.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,a.result=n,a.target||
(a.target=c),b=null==b?[a]:d.Z(b,[a]),p=d.event.C[m]||{},e||!p.m||!1!==p.m.apply(c,b))){if(!e&&!p.Bc&&!d.P(c)){h=p.ia||m;ib.test(h+m)||(g=g.parentNode);for(;g;g=g.parentNode)s.push(g),f=g;f===(c.ownerDocument||q)&&s.push(f.defaultView||f.parentWindow||v)}for(f=0;(g=s[f++])&&!a.Wa();)a.type=1<f?h:p.Ma||m,(l=(t.get(g,"events")||{})[a.type]&&t.get(g,"handle"))&&l.apply(g,b),(l=k&&g[k])&&d.jb(g)&&l.apply&&!1===l.apply(g,b)&&a.preventDefault();a.type=m;e||a.za()||p.v&&!1!==p.v.apply(s.pop(),b)||!d.jb(c)||
!k||!d.d(c[m])||d.P(c)||((f=c[k])&&(c[k]=null),d.event.hb=m,c[m](),d.event.hb=n,f&&(c[k]=f));return a.result}},tb:function(a){a=d.event.ub(a);var b,c,e,f,g=[],h=P.call(arguments);b=(t.get(this,"events")||{})[a.type]||[];var k=d.event.C[a.type]||{};h[0]=a;a.jc=this;if(!k.Jc||!1!==k.Jc.call(this,a)){g=d.event.xa.call(this,a,b);for(b=0;(f=g[b++])&&!a.Wa();)for(a.currentTarget=f.e,c=0;(e=f.xa[c++])&&!a.tc();)if(!a.Cb||a.Cb.test(e.Q))a.Ta=e,a.data=e.data,e=((d.event.C[e.pa]||{}).handle||e.O).apply(f.e,
h),e!==n&&!1===(a.result=e)&&(a.preventDefault(),a.stopPropagation());k.Ib&&k.Ib.call(this,a);return a.result}},xa:function(a,b){var c,e,f,g,h=[],k=b.Pa,l=a.target;if(k&&l.nodeType&&(!a.button||"click"!==a.type))for(;l!==this;l=l.parentNode||this)if(!0!==l.disabled||"click"!==a.type){e=[];for(c=0;c<k;c++)g=b[c],f=g.p+" ",e[f]===n&&(e[f]=g.ab?0<=d(f,this).index(l):d.find(f,this,null,[l]).length),e[f]&&e.push(g);e.length&&h.push({e:l,xa:e})}k<b.length&&h.push({e:this,xa:b.slice(k)});return h},K:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
vb:{},wc:{K:["char","charCode","key","keyCode"],filter:function(a,b){null==a.which&&(a.which=null!=b.charCode?b.charCode:b.keyCode);return a}},yc:{K:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(a,b){var c,d,f=b.button;null==a.pageX&&null!=b.clientX&&(c=a.target.ownerDocument||q,d=c.documentElement,c=c.body,a.pageX=b.clientX+(d&&d.scrollLeft||c&&c.scrollLeft||0)-(d&&d.clientLeft||c&&c.clientLeft||0),a.pageY=b.clientY+(d&&d.scrollTop||
c&&c.scrollTop||0)-(d&&d.clientTop||c&&c.clientTop||0));a.which||f===n||(a.which=f&1?1:f&2?3:f&4?2:0);return a}},ub:function(a){if(a[d.expando])return a;var b,c,e;b=a.type;var f=a,g=this.vb[b];g||(this.vb[b]=g=Wb.test(b)?this.yc:Vb.test(b)?this.wc:{});e=g.K?this.K.concat(g.K):this.K;a=new d.T(f);for(b=e.length;b--;)c=e[b],a[c]=f[c];a.target||(a.target=q);3===a.target.nodeType&&(a.target=a.target.parentNode);return g.filter?g.filter(a,f):a},C:{load:{Bc:!0},focus:{m:function(){if(this!==Oa()&&this.focus)return this.focus(),
!1},ia:"focusin"},blur:{m:function(){if(this===Oa()&&this.blur)return this.blur(),!1},ia:"focusout"},click:{m:function(){if("checkbox"===this.type&&this.click&&d.nodeName(this,"input"))return this.click(),!1},v:function(a){return d.nodeName(a.target,"a")}},vd:{Ib:function(a){a.result!==n&&(a.Ca.returnValue=a.result)}}},Yc:function(a,b,c,e){a=d.extend(new d.T,c,{type:a,Rd:!0,Ca:{}});e?d.event.m(a,null,b):d.event.tb.call(b,a);a.za()&&c.preventDefault()}};d.Kb=function(a,b,c){a.removeEventListener&&
a.removeEventListener(b,c,!1)};d.T=function(a,b){if(!(this instanceof d.T))return new d.T(a,b);a&&a.type?(this.Ca=a,this.type=a.type,this.za=a.defaultPrevented||a.pc&&a.pc()?qa:H):this.type=a;b&&d.extend(this,b);this.timeStamp=a&&a.timeStamp||d.now();this[d.expando]=!0};d.T.prototype={za:H,Wa:H,tc:H,preventDefault:function(){var a=this.Ca;this.za=qa;a&&a.preventDefault&&a.preventDefault()},stopPropagation:function(){var a=this.Ca;this.Wa=qa;a&&a.stopPropagation&&a.stopPropagation()}};d.a({zc:"mouseover",
Ac:"mouseout"},function(a,b){d.event.C[a]={ia:b,Ma:b,handle:function(a){var e,f=a.relatedTarget,g=a.Ta;if(!f||f!==this&&!d.contains(this,f))a.type=g.pa,e=g.O.apply(this,arguments),a.type=b;return e}}});d.l.oc||d.a({focus:"focusin",blur:"focusout"},function(a,b){function c(a){d.event.Yc(b,a.target,d.event.ub(a),!0)}var e=0;d.event.C[b]={Ob:function(){0===e++&&q.addEventListener(a,c,!0)},Tb:function(){0===--e&&q.removeEventListener(a,c,!0)}}});d.b.extend({J:function(a,b,c,e,f){var g,h;if("object"===
typeof a){"string"!==typeof b&&(c=c||b,b=n);for(h in a)this.J(h,b,c,a[h],f);return this}null==c&&null==e?(e=b,c=b=n):null==e&&("string"===typeof b?(e=c,c=n):(e=c,c=b,b=n));if(!1===e)e=H;else if(!e)return this;1===f&&(g=e,e=function(a){d().I(a);return g.apply(this,arguments)},e.k=g.k||(g.k=d.k++));return this.a(function(){d.event.add(this,a,e,c,b)})},ce:function(a,b,c,d){return this.J(a,b,c,d,1)},I:function(a,b,c){var e;if(a&&a.preventDefault&&a.Ta)return e=a.Ta,d(a.jc).I(e.Q?e.pa+"."+e.Q:e.pa,e.p,
e.O),this;if("object"===typeof a){for(e in a)this.I(e,b,a[e]);return this}if(!1===b||"function"===typeof b)c=b,b=n;!1===c&&(c=H);return this.a(function(){d.event.remove(this,a,c,b)})},m:function(a,b){return this.a(function(){d.event.m(a,b,this)})},Ge:function(a,b){var c=this[0];if(c)return d.event.m(a,b,c,!0)}});var Db=/^.[^:#\[\.,]*$/,Xb=/^(?:parents|prev(?:Until|All))/,kb=d.g.match.ab,Yb={children:!0,ea:!0,next:!0,Lc:!0};d.b.extend({find:function(a){var b,c=[],e=this,f=e.length;if("string"!==typeof a)return this.s(d(a).filter(function(){for(b=
0;b<f;b++)if(d.contains(e[b],this))return!0}));for(b=0;b<f;b++)d.find(a,e[b],c);c=this.s(1<f?d.unique(c):c);c.p=this.p?this.p+" "+a:a;return c},yb:function(a){var b=d(a,this),c=b.length;return this.filter(function(){for(var a=0;a<c;a++)if(d.contains(this,b[a]))return!0})},Zd:function(a){return this.s(ra(this,a||[],!0))},filter:function(a){return this.s(ra(this,a||[],!1))},zb:function(a){return!!ra(this,"string"===typeof a&&kb.test(a)?d(a):a||[],!1).length},yd:function(a,b){for(var c,e=0,f=this.length,
g=[],h=kb.test(a)||"string"!==typeof a?d(a,b||this.w):0;e<f;e++)for(c=this[e];c&&c!==b;c=c.parentNode)if(11>c.nodeType&&(h?-1<h.index(c):1===c.nodeType&&d.find.matchesSelector(c,a))){g.push(c);break}return this.s(1<g.length?d.unique(g):g)},index:function(a){return a?"string"===typeof a?W.call(d(a),this[0]):W.call(this,a.Ba?a[0]:a):this[0]&&this[0].parentNode?this.wa().Mc().length:-1},add:function(a,b){var c="string"===typeof a?d(a,b):d.Z(a&&a.nodeType?[a]:a),c=d.u(this.get(),c);return this.s(d.unique(c))},
$b:function(a){return this.add(null==a?this.bb:this.bb.filter(a))}});d.a({parent:function(a){return(a=a.parentNode)&&11!==a.nodeType?a:null},ge:function(a){return d.dir(a,"parentNode")},he:function(a,b,c){return d.dir(a,"parentNode",c)},next:function(a){return Pa(a,"nextSibling")},Lc:function(a){return Pa(a,"previousSibling")},Vd:function(a){return d.dir(a,"nextSibling")},Mc:function(a){return d.dir(a,"previousSibling")},Wd:function(a,b,c){return d.dir(a,"nextSibling",c)},me:function(a,b,c){return d.dir(a,
"previousSibling",c)},ve:function(a){return d.Pb((a.parentNode||{}).firstChild,a)},children:function(a){return d.Pb(a.firstChild)},ea:function(a){return a.contentDocument||d.u([],a.childNodes)}},function(a,b){d.b[a]=function(c,e){var f=d.map(this,b,c);"Until"!==a.slice(-5)&&(e=c);e&&"string"===typeof e&&(f=d.filter(e,f));1<this.length&&(Yb[a]||d.unique(f),Xb.test(a)&&f.reverse());return this.s(f)}});d.extend({filter:function(a,b,c){var e=b[0];c&&(a=":not("+a+")");return 1===b.length&&1===e.nodeType?
d.find.matchesSelector(e,a)?[e]:[]:d.find.matches(a,d.ma(b,function(a){return 1===a.nodeType}))},dir:function(a,b,c){for(var e=[],f=c!==n;(a=a[b])&&9!==a.nodeType;)if(1===a.nodeType){if(f&&d(a).zb(c))break;e.push(a)}return e},Pb:function(a,b){for(var c=[];a;a=a.nextSibling)1===a.nodeType&&a!==b&&c.push(a);return c}});var lb=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,mb=/<([\w:]+)/,Zb=/<|&#?\w+;/,$b=/<(?:script|style|link)/i,nb=/^(?:checkbox|radio)$/i,ac=/checked\s*(?:[^=]|=\s*.checked.)/i,
ob=/^$|\/(?:java|ecma)script/i,Gb=/^true\/(.*)/,bc=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,z={Eb:[1,"<select multiple='multiple'>","</select>"],bd:[1,"<table>","</table>"],zd:[2,"<table><colgroup>","</colgroup></table>"],Fe:[2,"<table><tbody>","</tbody></table>"],ad:[3,"<table><tbody><tr>","</tr></tbody></table>"],v:[0,"",""]};z.de=z.Eb;z.Ce=z.De=z.Ad=z.caption=z.bd;z.Ee=z.ad;d.b.extend({text:function(a){return d.i(this,function(a){return a===n?d.text(this):this.empty().append((this[0]&&this[0].ownerDocument||
q).createTextNode(a))},null,a,arguments.length)},append:function(){return this.V(arguments,function(a){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||Qa(this,a).appendChild(a)})},ke:function(){return this.V(arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=Qa(this,a);b.insertBefore(a,b.firstChild)}})},ud:function(){return this.V(arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this)})},qd:function(){return this.V(arguments,function(a){this.parentNode&&
this.parentNode.insertBefore(a,this.nextSibling)})},remove:function(a,b){for(var c,e=a?d.filter(a,this):this,f=0;null!=(c=e[f]);f++)b||1!==c.nodeType||d.Na(C(c)),c.parentNode&&(b&&d.contains(c.ownerDocument,c)&&sa(C(c,"script")),c.parentNode.removeChild(c));return this},empty:function(){for(var a,b=0;null!=(a=this[b]);b++)1===a.nodeType&&(d.Na(C(a,!1)),a.textContent="");return this},da:function(a,b){a=null==a?!1:a;b=null==b?a:b;return this.map(function(){return d.da(this,a,b)})},ya:function(a){return d.i(this,
function(a){var c=this[0]||{},e=0,f=this.length;if(a===n&&1===c.nodeType)return c.innerHTML;if("string"===typeof a&&!$b.test(a)&&!z[(mb.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(lb,"<$1></$2>");try{for(;e<f;e++)c=this[e]||{},1===c.nodeType&&(d.Na(C(c,!1)),c.innerHTML=a);c=0}catch(g){}}c&&this.empty().append(a)},null,a,arguments.length)},Tc:function(){var a=d.map(this,function(a){return[a.nextSibling,a.parentNode]}),b=0;this.V(arguments,function(c){var e=a[b++],f=a[b++];f&&(e&&e.parentNode!==
f&&(e=this.nextSibling),d(this).remove(),f.insertBefore(c,e))},!0);return b?this:this.remove()},detach:function(a){return this.remove(a,!0)},V:function(a,b,c){a=fb.apply([],a);var e,f,g,h,k=0,l=this.length,p=this,n=l-1,m=a[0],r=d.d(m);if(r||!(1>=l||"string"!==typeof m||d.l.dc)&&ac.test(m))return this.a(function(d){var e=p.Qa(d);r&&(a[0]=m.call(this,d,e.ya()));e.V(a,b,c)});if(l&&(e=d.sb(a,this[0].ownerDocument,!1,!c&&this),f=e.firstChild,1===e.childNodes.length&&(e=f),f)){f=d.map(C(e,"script"),Eb);
for(g=f.length;k<l;k++)h=e,k!==n&&(h=d.da(h,!0,!0),g&&d.u(f,C(h,"script"))),b.call(this[k],h,k);if(g)for(e=f[f.length-1].ownerDocument,d.map(f,Fb),k=0;k<g;k++)h=f[k],ob.test(h.type||"")&&!t.i(h,"globalEval")&&d.contains(e,h)&&(h.src?d.Zb(h.src):d.xb(h.textContent.replace(bc,"")))}return this}});d.a({ob:"append",le:"prepend",insertBefore:"before",Pd:"after",qe:"replaceWith"},function(a,b){d.b[a]=function(a){for(var e=[],f=d(a),g=f.length-1,h=0;h<=g;h++)a=h===g?this:this.da(!0),d(f[h])[b](a),Da.apply(e,
a.get());return this.s(e)}});d.extend({da:function(a,b,c){var e,f,g,h,k=a.cloneNode(!0),l=d.contains(a.ownerDocument,a);if(!(d.l.Cc||1!==a.nodeType&&11!==a.nodeType||d.Xa(a)))for(h=C(k),g=C(a),e=0,f=g.length;e<f;e++){var p=g[e],n=h[e],m=n.nodeName.toLowerCase();if("input"===m&&nb.test(p.type))n.checked=p.checked;else if("input"===m||"textarea"===m)n.defaultValue=p.defaultValue}if(b)if(c)for(g=g||C(a),h=h||C(k),e=0,f=g.length;e<f;e++)Ra(g[e],h[e]);else Ra(a,k);h=C(k,"script");0<h.length&&sa(h,!l&&
C(a,"script"));return k},sb:function(a,b,c,e){for(var f,g,h,k=0,l=a.length,p=b.createDocumentFragment(),n=[];k<l;k++)if((f=a[k])||0===f)if("object"===d.type(f))d.u(n,f.nodeType?[f]:f);else if(Zb.test(f)){g=g||p.appendChild(b.createElement("div"));h=(mb.exec(f)||["",""])[1].toLowerCase();h=z[h]||z.v;g.innerHTML=h[1]+f.replace(lb,"<$1></$2>")+h[2];for(h=h[0];h--;)g=g.lastChild;d.u(n,g.childNodes);g=p.firstChild;g.textContent=""}else n.push(b.createTextNode(f));p.textContent="";for(k=0;f=n[k++];)if(!e||
-1===d.na(f,e))if(a=d.contains(f.ownerDocument,f),g=C(p.appendChild(f),"script"),a&&sa(g),c)for(h=0;f=g[h++];)ob.test(f.type||"")&&c.push(f);return p},Na:function(a){for(var b,c,e,f,g,h,k=d.event.C,l=0;(c=a[l])!==n;l++){if(F.D(c)&&(g=c[t.expando])&&(b=t.o[g])){e=Object.keys(b.ka||{});if(e.length)for(h=0;(f=e[h])!==n;h++)k[f]?d.event.remove(c,f):d.Kb(c,f,b.handle);t.o[g]&&delete t.o[g]}delete E.o[c[E.expando]]}},Zb:function(a){return d.ta({url:a,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0})}});
d.b.extend({ib:function(a){var b;if(d.d(a))return this.a(function(b){d(this).ib(a.call(this,b))});this[0]&&(b=d(a,this[0].ownerDocument).Qa(0).da(!0),this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){for(var a=this;a.firstElementChild;)a=a.firstElementChild;return a}).append(this));return this},jd:function(a){return d.d(a)?this.a(function(b){d(this).jd(a.call(this,b))}):this.a(function(){var b=d(this),c=b.ea();c.length?c.ib(a):b.append(a)})},Oe:function(a){var b=d.d(a);return this.a(function(c){d(this).ib(b?
a.call(this,c):a)})},Ke:function(){return this.parent().a(function(){d.nodeName(this,"body")||d(this).Tc(this.childNodes)}).end()}});var N,ga,cc=/^(none|table(?!-c[ea]).+)/,pb=/^margin/,Ib=RegExp("^("+pa+")(.*)$","i"),ta=RegExp("^("+pa+")(?!px)[a-z%]+$","i"),dc=RegExp("^([+-])=("+pa+")","i"),Ya={ld:"block"},ec={position:"absolute",visibility:"hidden",display:"block"},qb={letterSpacing:0,fontWeight:400},O=["Top","Right","Bottom","Left"],Ta=["Webkit","O","Moz","ms"];d.b.extend({c:function(a,b){return d.i(this,
function(a,b,f){var g,h={},k=0;if(d.isArray(b)){f=v.getComputedStyle(a,null);for(g=b.length;k<g;k++)h[b[k]]=d.c(a,b[k],!1,f);return h}return f!==n?d.style(a,b,f):d.c(a,b)},a,b,1<arguments.length)},show:function(){return Ua(this,!0)},Va:function(){return Ua(this)},toggle:function(a){return"boolean"===typeof a?a?this.show():this.Va():this.a(function(){fa(this)?d(this).show():d(this).Va()})}});d.extend({r:{opacity:{get:function(a,b){if(b){var c=N(a,"opacity");return""===c?"1":c}}}},ua:{columnCount:!0,
fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},ha:{"float":"cssFloat"},style:function(a,b,c,e){if(a&&3!==a.nodeType&&8!==a.nodeType&&a.style){var f,g,h,k=d.H(b),l=a.style;b=d.ha[k]||(d.ha[k]=Sa(l,k));h=d.r[b]||d.r[k];if(c!==n)g=typeof c,"string"===g&&(f=dc.exec(c))&&(c=(f[1]+1)*f[2]+parseFloat(d.c(a,b)),g="number"),null==c||"number"===g&&isNaN(c)||("number"!==g||d.ua[k]||(c+="px"),d.l.fc||""!==c||0!==b.indexOf("background")||(l[b]="inherit"),
h&&"set"in h&&(c=h.set(a,c,e))===n||(l[b]=c));else return h&&"get"in h&&(f=h.get(a,!1,e))!==n?f:l[b]}},c:function(a,b,c,e){var f,g;g=d.H(b);b=d.ha[g]||(d.ha[g]=Sa(a.style,g));(g=d.r[b]||d.r[g])&&"get"in g&&(f=g.get(a,!0,c));f===n&&(f=N(a,b,e));"normal"===f&&b in qb&&(f=qb[b]);return""===c||c?(a=parseFloat(f),!0===c||d.uc(a)?a||0:f):f}});N=function(a,b,c){var e,f=(c=c||v.getComputedStyle(a,null))?c.getPropertyValue(b)||c[b]:n,g=a.style;c&&(""!==f||d.contains(a.ownerDocument,a)||(f=d.style(a,b)),ta.test(f)&&
pb.test(b)&&(a=g.width,b=g.minWidth,e=g.maxWidth,g.minWidth=g.maxWidth=g.width=f,f=c.width,g.width=a,g.minWidth=b,g.maxWidth=e));return f};d.a(["height","width"],function(a,b){d.r[b]={get:function(a,e,f){if(e)return 0===a.offsetWidth&&cc.test(d.c(a,"display"))?d.gb(a,ec,function(){return Xa(a,b,f)}):Xa(a,b,f)},set:function(a,e,f){var g=f&&v.getComputedStyle(a,null);return Va(0,e,f?Wa(a,b,f,d.l.boxSizing&&"border-box"===d.c(a,"boxSizing",!1,g),g):0)}}});d(function(){d.l.Jb||(d.r.marginRight={get:function(a,
b){if(b)return d.gb(a,{display:"inline-block"},N,[a,"marginRight"])}});!d.l.Hb&&d.b.position&&d.a(["top","left"],function(a,b){d.r[b]={get:function(a,e){if(e)return e=N(a,b),ta.test(e)?d(a).position()[b]+"px":e}}})});d.g&&d.g.filters&&(d.g.filters.hidden=function(a){return 0>=a.offsetWidth&&0>=a.offsetHeight},d.g.filters.visible=function(a){return!d.g.filters.hidden(a)});d.a({margin:"",padding:"",border:"Width"},function(a,b){d.r[a+b]={expand:function(c){var d=0,f={};for(c="string"===typeof c?c.split(" "):
[c];4>d;d++)f[a+O[d]+b]=c[d]||c[d-2]||c[0];return f}};pb.test(a)||(d.r[a+b].set=Va)});var fc=/%20/g,Jb=/\[\]$/,rb=/\r?\n/g,gc=/^(?:submit|button|image|reset|file)$/i,hc=/^(?:input|select|textarea|keygen)/i;d.b.extend({te:function(){return d.Fb(this.Wc())},Wc:function(){return this.map(function(){var a=d.j(this,"elements");return a?d.Z(a):this}).filter(function(){var a=this.type;return this.name&&!d(this).zb(":disabled")&&hc.test(this.nodeName)&&!gc.test(a)&&(this.checked||!nb.test(a))}).map(function(a,
b){var c=d(this).sa();return null==c?null:d.isArray(c)?d.map(c,function(a){return{name:b.name,value:a.replace(rb,"\r\n")}}):{name:b.name,value:c.replace(rb,"\r\n")}}).get()}});d.Fb=function(a,b){function c(a,b){b=d.d(b)?b():null==b?"":b;f[f.length]=encodeURIComponent(a)+"="+encodeURIComponent(b)}var e,f=[];b===n&&(b=d.M&&d.M.hd);if(d.isArray(a)||a.Ba&&!d.Aa(a))d.a(a,function(){c(this.name,this.value)});else for(e in a)va(e,a[e],b,c);return f.join("&").replace(fc,"+")};d.a("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),
function(a,b){d.b[b]=function(a,d){return 0<arguments.length?this.J(b,null,a,d):this.m(b)}});d.b.extend({Nd:function(a,b){return this.zc(a).Ac(b||a)},bind:function(a,b,c){return this.J(a,null,b,c)},Ie:function(a,b){return this.I(a,null,b)},Dd:function(a,b,c,d){return this.J(b,a,c,d)},Je:function(a,b,c){return 1===arguments.length?this.I(a,"**"):this.I(b,a||"**",c)}});var R,S,Ia=d.now(),Ja=/\?/,ic=/#.*$/,sb=/([?&])_=[^&]*/,jc=/^(.*?):[ \t]*([^\r\n]*)$/mg,kc=/^(?:GET|HEAD)$/,lc=/^\/\//,tb=/^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,
ub=d.b.load,vb={},Ba={},wb="*/".concat("*");try{S=Lb.href}catch(qc){S=q.createElement("a"),S.href="",S=S.href}R=tb.exec(S.toLowerCase())||[];d.b.load=function(a,b,c){if("string"!==typeof a&&ub)return ub.apply(this,arguments);var e,f,g,h=this,k=a.indexOf(" ");0<=k&&(e=a.slice(k),a=a.slice(0,k));d.d(b)?(c=b,b=n):b&&"object"===typeof b&&(f="POST");0<h.length&&d.ta({url:a,type:f,dataType:"html",data:b}).A(function(a){g=arguments;h.ya(e?d("<div>").append(d.Gb(a)).find(e):a)}).complete(c&&function(a,b){h.a(c,
g||[a.responseText,b,a])});return this};d.a("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),function(a,b){d.b[b]=function(a){return this.J(b,a)}});d.extend({kb:0,lastModified:{},Ra:{},M:{url:S,type:"GET",Qd:/^(?:about|app|app-storage|.+-extension|file|res|widget):$/.test(R[1]),global:!0,Nc:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",D:{"*":wb,text:"text/plain",ya:"text/html",xml:"application/xml, text/xml",Bb:"application/json, text/javascript"},
ea:{xml:/xml/,ya:/html/,Bb:/json/},Lb:{xml:"responseXML",text:"responseText",Bb:"responseJSON"},fa:{"* text":String,"text html":!0,"text json":d.Gc,"text xml":d.Hc},nc:{url:!0,w:!0}},Ka:function(a,b){return b?Ca(Ca(a,d.M),b):Ca(d.M,a)},lb:$a(vb),mb:$a(Ba),ta:function(a,b){function c(a,b,c,h){var l,q,s,G;G=b;if(2!==M){M=2;k&&clearTimeout(k);e=n;g=h||"";x.readyState=0<a?4:0;h=200<=a&&300>a||304===a;if(c){s=m;for(var z=x,D,J,I,A,C=s.ea,F=s.t;"*"===F[0];)F.shift(),D===n&&(D=s.$a||z.getResponseHeader("Content-Type"));
if(D)for(J in C)if(C[J]&&C[J].test(D)){F.unshift(J);break}if(F[0]in c)I=F[0];else{for(J in c){if(!F[0]||s.fa[J+" "+F[0]]){I=J;break}A||(A=J)}I=I||A}I?(I!==F[0]&&F.unshift(I),s=c[I]):s=void 0}a:{c=m;D=s;J=x;I=h;var H,y,K,z={},C=c.t.slice();if(C[1])for(y in c.fa)z[y.toLowerCase()]=c.fa[y];for(A=C.shift();A;)if(c.Lb[A]&&(J[c.Lb[A]]=D),!K&&I&&c.ic&&(D=c.ic(D,c.dataType)),K=A,A=C.shift())if("*"===A)A=K;else if("*"!==K&&K!==A){y=z[K+" "+A]||z["* "+A];if(!y)for(H in z)if(s=H.split(" "),s[1]===A&&(y=z[K+
" "+s[0]]||z["* "+s[0]])){!0===y?y=z[H]:!0!==z[H]&&(A=s[0],C.unshift(s[1]));break}if(!0!==y)if(y&&c["throws"])D=y(D);else try{D=y(D)}catch(L){s={state:"parsererror",error:y?L:"No conversion from "+K+" to "+A};break a}}s={state:"success",data:D}}if(h)m.sc&&((G=x.getResponseHeader("Last-Modified"))&&(d.lastModified[f]=G),(G=x.getResponseHeader("etag"))&&(d.Ra[f]=G)),204===a||"HEAD"===m.type?G="nocontent":304===a?G="notmodified":(G=s.state,l=s.data,q=s.error,h=!q);else if(q=G,a||!G)G="error",0>a&&(a=
0);x.status=a;x.statusText=(b||G)+"";h?v.aa(r,[l,G,x]):v.Rc(r,[x,G,q]);x.Rb(B);B=n;p&&t.m(h?"ajaxSuccess":"ajaxError",[x,m,h?l:q]);E.Sa(r,[x,G]);p&&(t.m("ajaxComplete",[x,m]),--d.kb||d.event.m("ajaxStop"))}}"object"===typeof a&&(b=a,a=n);b=b||{};var e,f,g,h,k,l,p,q,m=d.Ka({},b),r=m.w||m,t=m.w&&(r.nodeType||r.Ba)?d(r):d.event,v=d.S(),E=d.ca("once memory"),B=m.Rb||{},z={},C={},M=0,F="canceled",x={readyState:0,getResponseHeader:function(a){var b;if(2===M){if(!h)for(h={};b=jc.exec(g);)h[b[1].toLowerCase()]=
b[2];b=h[a.toLowerCase()]}return null==b?null:b},getAllResponseHeaders:function(){return 2===M?g:null},setRequestHeader:function(a,b){var c=a.toLowerCase();M||(a=C[c]=C[c]||a,z[a]=b);return this},overrideMimeType:function(a){M||(m.$a=a);return this},Rb:function(a){var b;if(a)if(2>M)for(b in a)B[b]=[B[b],a[b]];else x.F(a[x.status]);return this},abort:function(a){a=a||F;e&&e.abort(a);c(0,a);return this}};v.n(x).complete=E.add;x.Sb=x.A;x.error=x.la;m.url=((a||m.url||S)+"").replace(ic,"").replace(lc,
R[1]+"//");m.type=b.method||b.type||m.method||m.type;m.t=d.trim(m.dataType||"*").toLowerCase().match(L)||[""];null==m.ga&&(l=tb.exec(m.url.toLowerCase()),m.ga=!(!l||l[1]===R[1]&&l[2]===R[2]&&(l[3]||("http:"===l[1]?"80":"443"))===(R[3]||("http:"===R[1]?"80":"443"))));m.data&&m.Nc&&"string"!==typeof m.data&&(m.data=d.Fb(m.data,m.hd));ab(vb,m,b,x);if(2===M)return x;(p=m.global)&&0===d.kb++&&d.event.m("ajaxStart");m.type=m.type.toUpperCase();m.Ua=!kc.test(m.type);f=m.url;m.Ua||(m.data&&(f=m.url+=(Ja.test(f)?
"&":"?")+m.data,delete m.data),!1===m.o&&(m.url=sb.test(f)?f.replace(sb,"$1_="+Ia++):f+(Ja.test(f)?"&":"?")+"_="+Ia++));m.sc&&(d.lastModified[f]&&x.setRequestHeader("If-Modified-Since",d.lastModified[f]),d.Ra[f]&&x.setRequestHeader("If-None-Match",d.Ra[f]));(m.data&&m.Ua&&!1!==m.contentType||b.contentType)&&x.setRequestHeader("Content-Type",m.contentType);x.setRequestHeader("Accept",m.t[0]&&m.D[m.t[0]]?m.D[m.t[0]]+("*"!==m.t[0]?", "+wb+"; q=0.01":""):m.D["*"]);for(q in m.headers)x.setRequestHeader(q,
m.headers[q]);if(m.bc&&(!1===m.bc.call(r,x,m)||2===M))return x.abort();F="abort";for(q in{Sb:1,error:1,complete:1})x[q](m[q]);if(e=ab(Ba,m,b,x)){x.readyState=1;p&&t.m("ajaxSend",[x,m]);m.async&&0<m.timeout&&(k=setTimeout(function(){x.abort("timeout")},m.timeout));try{M=1,e.send(z,c)}catch(H){if(2>M)c(-1,H);else throw H;}}else c(-1,"No Transport");return x},Kd:function(a,b,c){return d.get(a,b,c,"json")},Ld:function(a,b){return d.get(a,n,b,"script")}});d.a(["get","post"],function(a,b){d[b]=function(a,
e,f,g){d.d(e)&&(g=g||f,f=e,e=n);return d.ta({url:a,type:b,dataType:g,data:e,Sb:f})}});d.Ka({D:{Uc:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},ea:{Uc:/(?:java|ecma)script/},fa:{"text script":function(a){d.xb(a);return a}}});d.lb("script",function(a){a.o===n&&(a.o=!1);a.ga&&(a.type="GET")});d.mb("script",function(a){if(a.ga){var b,c;return{send:function(e,f){b=d("<script>").j({async:!0,charset:a.se,src:a.url}).J("load error",c=function(a){b.remove();
c=null;a&&f("error"===a.type?404:200,a.type)});q.head.appendChild(b[0])},abort:function(){c&&c()}}}});var xb=[],Ka=/(=)\?(?=&|$)|\?\?/;d.Ka({Za:"callback",Y:function(){var a=xb.pop()||d.expando+"_"+Ia++;this[a]=!0;return a}});d.lb("json jsonp",function(a,b,c){var e,f,g,h=!1!==a.Za&&(Ka.test(a.url)?"url":"string"===typeof a.data&&!(a.contentType||"").indexOf("application/x-www-form-urlencoded")&&Ka.test(a.data)&&"data");if(h||"jsonp"===a.t[0])return e=a.Y=d.d(a.Y)?a.Y():a.Y,h?a[h]=a[h].replace(Ka,
"$1"+e):!1!==a.Za&&(a.url+=(Ja.test(a.url)?"&":"?")+a.Za+"="+e),a.fa["script json"]=function(){g||d.error(e+" was not called");return g[0]},a.t[0]="json",f=v[e],v[e]=function(){g=arguments},c.F(function(){v[e]=f;a[e]&&(a.Y=b.Y,xb.push(e));g&&d.d(f)&&f(g[0]);g=f=n}),"script"});d.M.Wb=function(){try{return new XMLHttpRequest}catch(a){}};var ba=d.M.Wb(),mc={0:200,1223:204},nc=0,ca={};v.ActiveXObject&&d(v).J("unload",function(){for(var a in ca)ca[a]();ca=n});d.l.gc=!!ba&&"withCredentials"in ba;d.l.ta=
ba=!!ba;d.mb(function(a){var b;if(d.l.gc||ba&&!a.ga)return{send:function(c,d){var f,g,h=a.Wb();h.open(a.type,a.url,a.async,a.Le,a.Ic);if(a.Xb)for(f in a.Xb)h[f]=a.Xb[f];a.$a&&h.overrideMimeType&&h.overrideMimeType(a.$a);a.ga||c["X-Requested-With"]||(c["X-Requested-With"]="XMLHttpRequest");for(f in c)h.setRequestHeader(f,c[f]);b=function(a){return function(){b&&(delete ca[g],b=h.onload=h.onerror=null,"abort"===a?h.abort():"error"===a?d(h.status||404,h.statusText):d(mc[h.status]||h.status,h.statusText,
"string"===typeof h.responseText?{text:h.responseText}:n,h.getAllResponseHeaders()))}};h.onload=b();h.onerror=b("error");b=ca[g=nc++]=b("abort");h.send(a.Ua&&a.data||null)},abort:function(){b&&b()}}});var T,V,oc=/^(?:toggle|show|hide)$/,yb=RegExp("^(?:([+-])=|)("+pa+")([a-z%]*)$","i"),pc=/queueHooks$/,U=[function(a,b,c){var e,f,g,h,k,l=this,p={},q=a.style,m=a.nodeType&&fa(a),r=t.get(a,"fxshow");c.f||(h=d.Ia(a,"fx"),null==h.Ga&&(h.Ga=0,k=h.empty.va,h.empty.va=function(){h.Ga||k()}),h.Ga++,l.F(function(){l.F(function(){h.Ga--;
d.f(a,"fx").length||h.empty.va()})}));1===a.nodeType&&("height"in b||"width"in b)&&(c.overflow=[q.overflow,q.overflowX,q.overflowY],"inline"===d.c(a,"display")&&"none"===d.c(a,"float")&&(q.display="inline-block"));c.overflow&&(q.overflow="hidden",l.F(function(){q.overflow=c.overflow[0];q.overflowX=c.overflow[1];q.overflowY=c.overflow[2]}));for(e in b)if(f=b[e],oc.exec(f)){delete b[e];g=g||"toggle"===f;if(f===(m?"hide":"show"))if("show"===f&&r&&r[e]!==n)m=!0;else continue;p[e]=r&&r[e]||d.style(a,e)}if(!d.oa(p))for(e in r?
"hidden"in r&&(m=r.hidden):r=t.i(a,"fxshow",{}),g&&(r.hidden=!m),m?d(a).show():l.A(function(){d(a).Va()}),l.A(function(){var b;t.remove(a,"fxshow");for(b in p)d.style(a,b,p[b])}),p)b=cb(m?r[e]:0,e,l),e in r||(r[e]=b.start,m&&(b.end=b.start,b.start="width"===e||"height"===e?1:0))}],ha={"*":[function(a,b){var c=this.hc(a,b),e=c.Oa(),f=yb.exec(b),g=f&&f[3]||(d.ua[a]?"":"px"),h=(d.ua[a]||"px"!==g&&+e)&&yb.exec(d.c(c.e,a)),k=1,l=20;if(h&&h[3]!==g){g=g||h[3];f=f||[];h=+e||1;do k=k||".5",h/=k,d.style(c.e,
a,h+g);while(k!==(k=c.Oa()/e)&&1!==k&&--l)}f&&(h=c.start=+h||+e||0,c.Vb=g,c.end=f[1]?h+(f[1]+1)*f[2]:+f[2]);return c}]};d.kd=d.extend(db,{He:function(a,b){d.d(a)?(b=a,a=["*"]):a=a.split(" ");for(var c,e=0,f=a.length;e<f;e++)c=a[e],ha[c]=ha[c]||[],ha[c].unshift(b)},je:function(a,b){b?U.unshift(a):U.push(a)}});d.Yb=B;B.prototype={constructor:B,X:function(a,b,c,e,f,g){this.e=a;this.j=c;this.ja=f||"swing";this.options=b;this.start=this.now=this.Oa();this.end=e;this.Vb=g||(d.ua[c]?"":"px")},Oa:function(){var a=
B.B[this.j];return a&&a.get?a.get(this):B.B.v.get(this)},Mb:function(a){var b=B.B[this.j];a=this.options.duration?d.ja[this.ja](a,this.options.duration*a,0,1,this.options.duration):a;this.now=(this.end-this.start)*a+this.start;this.options.step&&this.options.step.call(this.e,this.now,this);b&&b.set?b.set(this):B.B.v.set(this);return this}};B.prototype.X.prototype=B.prototype;B.B={v:{get:function(a){return null==a.e[a.j]||a.e.style&&null!=a.e.style[a.j]?(a=d.c(a.e,a.j,""))&&"auto"!==a?a:0:a.e[a.j]},
set:function(a){if(d.h.step[a.j])d.h.step[a.j](a);else a.e.style&&(null!=a.e.style[d.ha[a.j]]||d.r[a.j])?d.style(a.e,a.j,a.now+a.Vb):a.e[a.j]=a.now}}};B.B.scrollTop=B.B.scrollLeft={set:function(a){a.e.nodeType&&a.e.parentNode&&(a.e[a.j]=a.now)}};d.a(["toggle","show","hide"],function(a,b){var c=d.b[b];d.b[b]=function(a,d,g){return null==a||"boolean"===typeof a?c.apply(this,arguments):this.La(la(b,!0),a,d,g)}});d.b.extend({Gd:function(a,b,c,d){return this.filter(fa).c("opacity",0).show().end().La({opacity:b},
a,c,d)},La:function(a,b,c,e){function f(){var b=db(this,d.extend({},a),h);(g||t.get(this,"finish"))&&b.stop(!0)}var g=d.oa(a),h=d.speed(b,c,e);f.finish=f;return g||!1===h.f?this.a(f):this.f(h.f,f)},stop:function(a,b,c){function e(a){var b=a.stop;delete a.stop;b(c)}"string"!==typeof a&&(c=b,b=a,a=n);b&&!1!==a&&this.f(a||"fx",[]);return this.a(function(){var b=!0,g=null!=a&&a+"queueHooks",h=d.qa,k=t.get(this);if(g)k[g]&&k[g].stop&&e(k[g]);else for(g in k)k[g]&&k[g].stop&&pc.test(g)&&e(k[g]);for(g=h.length;g--;)h[g].e!==
this||null!=a&&h[g].f!==a||(h[g].nb.stop(c),b=!1,h.splice(g,1));!b&&c||d.U(this,a)})},finish:function(a){!1!==a&&(a=a||"fx");return this.a(function(){var b,c=t.get(this),e=c[a+"queue"];b=c[a+"queueHooks"];var f=d.qa,g=e?e.length:0;c.finish=!0;d.f(this,a,[]);b&&b.stop&&b.stop.call(this,!0);for(b=f.length;b--;)f[b].e===this&&f[b].f===a&&(f[b].nb.stop(!0),f.splice(b,1));for(b=0;b<g;b++)e[b]&&e[b].finish&&e[b].finish.call(this);delete c.finish})}});d.a({we:la("show"),ye:la("hide"),xe:la("toggle"),Ed:{opacity:"show"},
Fd:{opacity:"hide"},Hd:{opacity:"toggle"}},function(a,b){d.b[a]=function(a,d,f){return this.La(b,a,d,f)}});d.speed=function(a,b,c){var e=a&&"object"===typeof a?d.extend({},a):{complete:c||!c&&b||d.d(a)&&a,duration:a,ja:c&&b||b&&!d.d(b)&&b};e.duration=d.h.I?0:"number"===typeof e.duration?e.duration:e.duration in d.h.Fa?d.h.Fa[e.duration]:d.h.Fa.v;if(null==e.f||!0===e.f)e.f="fx";e.Db=e.complete;e.complete=function(){d.d(e.Db)&&e.Db.call(this);e.f&&d.U(this,e.f)};return e};d.ja={Td:function(a){return a},
Be:function(a){return 0.5-Math.cos(a*Math.PI)/2}};d.qa=[];d.h=B.prototype.X;d.h.dd=function(){var a,b=d.qa,c=0;for(T=d.now();c<b.length;c++)a=b[c],a()||b[c]!==a||b.splice(c--,1);b.length||d.h.stop();T=n};d.h.ed=function(a){a()&&d.qa.push(a)&&d.h.start()};d.h.interval=13;d.h.start=function(){V||(V=setInterval(d.h.dd,d.h.interval))};d.h.stop=function(){clearInterval(V);V=null};d.h.Fa={ze:600,Id:200,v:400};d.h.step={};d.g&&d.g.filters&&(d.g.filters.td=function(a){return d.ma(d.qa,function(b){return a===
b.e}).length});d.b.offset=function(a){if(arguments.length)return a===n?this:this.a(function(b){d.offset.Xc(this,a,b)});var b,c;c=this[0];var e={top:0,left:0},f=c&&c.ownerDocument;if(f){b=f.documentElement;if(!d.contains(b,c))return e;typeof c.getBoundingClientRect!==X&&(e=c.getBoundingClientRect());c=d.P(f)?f:9===f.nodeType&&f.defaultView;return{top:e.top+c.pageYOffset-b.clientTop,left:e.left+c.pageXOffset-b.clientLeft}}};d.offset={Xc:function(a,b,c){var e,f,g,h=d.c(a,"position"),k=d(a),l={};"static"===
h&&(a.style.position="relative");g=k.offset();f=d.c(a,"top");e=d.c(a,"left");("absolute"===h||"fixed"===h)&&-1<(f+e).indexOf("auto")?(e=k.position(),f=e.top,e=e.left):(f=parseFloat(f)||0,e=parseFloat(e)||0);d.d(b)&&(b=b.call(a,c,g));null!=b.top&&(l.top=b.top-g.top+f);null!=b.left&&(l.left=b.left-g.left+e);"using"in b?b.Me.call(a,l):k.c(l)}};d.b.extend({position:function(){if(this[0]){var a,b,c=this[0],e={top:0,left:0};"fixed"===d.c(c,"position")?b=c.getBoundingClientRect():(a=this.offsetParent(),
b=this.offset(),d.nodeName(a[0],"html")||(e=a.offset()),e.top+=d.c(a[0],"borderTopWidth",!0),e.left+=d.c(a[0],"borderLeftWidth",!0));return{top:b.top-e.top-d.c(c,"marginTop",!0),left:b.left-e.left-d.c(c,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){for(var a=this.offsetParent||eb;a&&!d.nodeName(a,"html")&&"static"===d.c(a,"position");)a=a.offsetParent;return a||eb})}});d.a({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(a,b){var c="pageYOffset"===b;d.b[a]=function(e){return d.i(this,
function(a,e,h){var k=d.P(a)?a:9===a.nodeType&&a.defaultView;if(h===n)return k?k[b]:a[e];k?k.scrollTo(c?v.pageXOffset:h,c?h:v.pageYOffset):a[e]=h},a,e,arguments.length,null)}});d.a({md:"height",nd:"width"},function(a,b){d.a({padding:"inner"+a,content:b,"":"outer"+a},function(c,e){d.b[e]=function(e,g){var h=arguments.length&&(c||"boolean"!==typeof e),k=c||(!0===e||!0===g?"margin":"border");return d.i(this,function(b,c,e){return d.P(b)?b.document.documentElement["client"+a]:9===b.nodeType?(c=b.documentElement,
Math.max(b.body["scroll"+a],c["scroll"+a],b.body["offset"+a],c["offset"+a],c["client"+a])):e===n?d.c(b,c,k):d.style(b,c,e,k)},b,h?e:n,h,null)}})});d.b.size=function(){return this.length};d.b.sd=d.b.$b;"object"===typeof module&&module&&"object"===typeof module.mc?module.mc=d:"function"===typeof define&&define.rd&&define("jquery",[],function(){return d});"object"===typeof v&&"object"===typeof v.document&&(v.Ya=v.Ha=d)})(window);
(function() {
  var FETCH_RADIUS, LOCATION_CHECK_INTERVAL, LOCATION_WAITING_TIMEOUT, MAX_ZOOM, NOTES_URL, OVERPASS_URL, addBuildings, checkLocation, currentLocation, displayError, fetchBuildingsAroundLocation, format, getAnswers, map, onLocationFound, postNote, tagBuilding;

  LOCATION_CHECK_INTERVAL = 1000 * 60;

  LOCATION_WAITING_TIMEOUT = 1000 * 45;

  MAX_ZOOM = 16;

  FETCH_RADIUS = 1000;

  OVERPASS_URL = "http://overpass-api.de/api/interpreter";

  NOTES_URL = "http://api.openstreetmap.org/api/0.6/notes";

  currentLocation = new L.LatLng(0, 0);

  checkLocation = function() {
    setTimeout(checkLocation, LOCATION_CHECK_INTERVAL);
    return map.locate({
      enableHighAccuracy: true,
      setView: true,
      maxZoom: MAX_ZOOM,
      timeout: LOCATION_WAITING_TIMEOUT
    });
  };

  onLocationFound = function(location) {
    if (location.latlng.distanceTo(currentLocation) > FETCH_RADIUS) {
      fetchBuildingsAroundLocation(location);
    }
    return currentLocation = location.latlng;
  };

  fetchBuildingsAroundLocation = function(location) {
    var q;
    q = "[out:json];way(around:" + FETCH_RADIUS + ".0," + location.latitude + "," + location.longitude + ")[building];(._; - way._['addr:housenumber'];);(._;>;);out;";
    return $.post(OVERPASS_URL, {
      data: q
    }, addBuildings);
  };

  addBuildings = function(overpassResponse) {
    var building, building_polygon, corners, elements, node, node_id, _i, _j, _k, _len, _len1, _len2, _ref;
    elements = overpassResponse.elements;
    for (_i = 0, _len = elements.length; _i < _len; _i++) {
      building = elements[_i];
      if (!(building.type === "way")) {
        continue;
      }
      corners = [];
      _ref = building.nodes;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        node_id = _ref[_j];
        for (_k = 0, _len2 = elements.length; _k < _len2; _k++) {
          node = elements[_k];
          if (node.id === node_id) {
            corners.push([node.lat, node.lon]);
            break;
          }
        }
      }
      building_polygon = new L.Polygon(corners, {
        color: "red"
      });
      building_polygon.on("click", tagBuilding);
      map.addLayer(building_polygon);
    }
  };

  displayError = function(message) {
    return alert(message);
  };

  tagBuilding = function() {
    var answers, center, text,
      _this = this;
    this.setStyle({
      color: "orange"
    });
    answers = getAnswers(["addr:housenumber", "addr:street", "building:levels", "comment"]);
    if (answers) {
      center = this.getBounds().getCenter();
      text = format(answers);
      return postNote(center.lat, center.lng, text, function() {
        return _this.setStyle({
          color: "green"
        });
      });
    }
  };

  format = function(object) {
    var key, value;
    return ((function() {
      var _results;
      _results = [];
      for (key in object) {
        value = object[key];
        _results.push("" + key + " = " + value);
      }
      return _results;
    })()).join("\n");
  };

  getAnswers = function(questions) {
    var answers, input, question, value, _i, _len;
    for (_i = 0, _len = questions.length; _i < _len; _i++) {
      question = questions[_i];
      input = prompt("" + question + " = ?");
      if (input != null) {
        value = input.trim();
        if (value.length) {
          if (typeof answers === "undefined" || answers === null) {
            answers = {};
          }
          answers[question] = value;
        }
      }
    }
    return answers;
  };

  postNote = function(lat, lon, text, onNotePosted) {
    return $.post(NOTES_URL, {
      lat: lat,
      lon: lon,
      text: text
    }, onNotePosted);
  };

  map = new L.Map("map");

  map.addLayer(new L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    detectRetina: true
  }));

  map.on("locationfound", onLocationFound);

  document.ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
    return alert(thrownError);
  });

  checkLocation();

}).call(this);
