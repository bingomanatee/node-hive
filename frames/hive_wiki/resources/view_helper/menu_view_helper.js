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
		name: 'hive_nav_menu_helper',

		test: function (context, output) {
			return output.layout_name == 'hive_wiki';
		},

		weight: -800,

		respond: function (context, output, cb) {
			if (_DEBUG) console.log('adding menus');
			var wiki_model = apiary.model('hive_wiki_article');
			var wiki_menu = new hive_menu.Menu({title: "Wiki", weight: -900});
			wiki_model.topics(function (err, topics) {
				topics = _.sortBy(topics, 'title');
				if (_DEBUG) console.log('-------- topics: %s', util.inspect(topics));
				_.each(topics, function (topic) {
					wiki_menu.add({title: topic.title, name: 'wiki_topic_' + topic.topic, link: util.format('/wiki/t/%s', topic.topic)});
				});
				output.$menus.left_nav.items.push(wiki_menu);
				if (_DEBUG) console.log('output after wiki menu added: %s', util.inspect(output, true, 5));
				cb();
			})

		}
	};

	cb(null, helper);

}; // end exports