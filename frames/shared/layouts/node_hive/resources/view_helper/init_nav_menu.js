var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;
var hive_menu = require('hive-menu');

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */

/* ********* EXPORTS ******** */

module.exports = function (apiary, cb) {
	var helper = {
		name: 'nav_menu_view_helper',

		test: function (ctx, output) {
			if (_DEBUG) console.log('inmvh: testing layout name %s', output.layout_name);
			return output.layout_name == 'node_hive';
		},

		weight: -900,

		respond: function (ctx, output, cb) {
			output.$menus = {
				left_nav: new hive_menu.Menu({name: 'left_nav_menu', items: [{link: '/', title: "Home", weight: -10000}]}),
				top_nav: new hive_menu.Menu({name: 'top_nav_menu'})
			};
			if (_DEBUG) console.log('nav menu: %s', util.inspect(output.$menus.left_nav.prototype));
			cb();
		}
	};

	cb(null, helper);

}; // end exports