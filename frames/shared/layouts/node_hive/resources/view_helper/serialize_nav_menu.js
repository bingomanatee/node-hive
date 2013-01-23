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
			return output.layout_name == 'node_hive';
		},

		weight: 1000,

		respond: function (ctx, output, cb) {
			output.$menus.left_nav = output.$menus.left_nav.toJSON();
			output.$menus.top_nav = output.$menus.top_nav.toJSON();
			cb();
		}
	};

	cb(null, helper);

}; // end exports