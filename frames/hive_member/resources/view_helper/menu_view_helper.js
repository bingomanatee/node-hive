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
		name: 'hive_member_nav_menu_helper',

		test: function (context, output) {
			return _.contains(['hive_queen', 'node_hive'], output.layout_name);
		},

		weight: 800,

		respond: function (context, output, cb) {
			if (_DEBUG) console.log('adding menus');
			var wiki_model = apiary.model('hive_wiki_article');
			var wiki_manage_menu = new hive_menu.Menu({
				title:  'Manage Membership',
				weight: -900,
				items:  [
					{
						title: 'Members',
						link: '/wiki/members/list',
						weight: 0
					}
				]
			});
			output.$menus.left_nav.add(wiki_manage_menu);

			cb();

		}
	};

	cb(null, helper);

}; // end exports