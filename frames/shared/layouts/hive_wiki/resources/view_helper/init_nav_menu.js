var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = true;
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
			console.log('inmvh: testing layout name %s', output.layout_name);
			return output.layout_name == 'hive_wiki';
		},

		weight: -900,

		respond: function (ctx, output, cb) {
			output.$menus = {
				left_nav: new hive_menu.Menu({items: [{link: '/', title: "Home", weight: -10000}]}),
				top_nav: new hive_menu.Menu()
			};
			cb();
		}
	};

	cb(null, helper);

}; // end exports