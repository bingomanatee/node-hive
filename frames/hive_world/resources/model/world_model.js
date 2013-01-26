var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = true;
var Mongoose_Model = require('hive-model-mongoose');

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */

/* ********* EXPORTS ******** */

module.exports = function (apiary, callback) {
	var mongoose = apiary.get_config('mongoose');

	var world_schema = require(path.resolve(__dirname, 'schema/world.json'));
	var article_entry_schema = require(path.resolve(__dirname, 'schema/article_entry.json'));
	var article_link_schema = require(path.resolve(__dirname, 'schema/article_link.json'));
	article_schema.version = [mongoose.Schema(article_entry_schema)];
	article_schema.link_to = [mongoose.Schema(article_link_schema)];
	article_schema._archives = [article_entry_schema];

	Mongoose_Model(
		{
			name:   'hive_wiki_article',
			topics: function (callback) {
				this.find({is_topic: true}).select('topic title').exec(callback);
			},

			make_id: function (topic, name) {
				if (_.isObject(topic)) {
					name = topic.name;
					topic = topic.topic;
				}
				if (!name) name = '';

				return util.format('%s:%s', topic, name);
			},

			exists: function (topic, name, cb) {
				this.count({name: name, topic: topic}, cb);
			},

			get_topic: function(topic, cb, article_list){
				if (_DEBUG) console.log('get_topic: %s/%s', topic, article_list);
				var self = this;
				this.find_one({topic: topic, is_topic: true}).select('-_archives').exec( function(err, article){
					if (err) return cb(err);

					if (article_list){
						self.active().where('topic').equals(topic).select('title tags name intro').exec(function(err, articles){
							if (_DEBUG) console.log('articles: %s', util.inspect(articles));
							article = article.toJSON();
							article.articles = articles;
							cb(null, article);
						})

					} else {
						cb(null, article);
					}
				});
			},

			get_article: function (topic, name, cb) {
				if (!(topic && name)) {
					return  cb(new Error('cannot find article - topic and/or name missing: ' + topic + '/' + name));
				}
				var self = this;
				this.get(this.make_id(topic, name), function (err, article) {
					if (article) {
						 cb(null, article);
					} else {
						self.find_one({name: name, topic: topic}, cb);
					}
				})
			}
		},

		{
			mongoose:   mongoose,
			schema_def: article_schema
		},

		apiary.dataspace,

		callback
	)
} // end export function