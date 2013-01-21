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
		name: 'hive_wiki_nav_menu_helper',

		test: function (context, output) {
			return _.contains(['hive_queen', 'node_hive'], output.layout_name);
		},

		weight: -800,

		respond: function (context, output, cb) {
			if (_DEBUG) console.log('adding menus');
			var wiki_model = apiary.model('hive_wiki_article');
			var wiki_manage_menu = new hive_menu.Menu({
				title:  'Manage Wiki',
				weight: -800,
				items:  [
					{
						title: 'Articles',
						link: '/wiki/articles',
						weight: 0
					},
					{
						title: 'New',
						link: '/wiki/article/new',
						weight: 1
					}
				]
			});
			output.$menus.left_nav.add(wiki_manage_menu);

			wiki_model.topics(function (err, topics) {
				var wiki_menu = new hive_menu.Menu({title: "Wiki", weight: -900});
				topics = _.sortBy(topics, 'title');
				if (_DEBUG) console.log('-------- topics: %s', util.inspect(topics));
				_.each(topics, function (topic) {
					wiki_menu.add({title: topic.title, name: 'wiki_topic_' + topic.topic, link: util.format('/wiki/t/%s', topic.topic)});
				});
				output.$menus.left_nav.add(wiki_menu);
				if (_DEBUG) console.log('output after wiki menu added: %s', util.inspect(output, true, 5));
				cb();
			})

		}
	};

	cb(null, helper);

}; // end exports