var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;
var Mongoose_Model = require('hive-model-mongoose');

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */

/* ********* EXPORTS ******** */

module.exports = function (apiary, callback) {
	var mongoose = apiary.get_config('mongoose');

	var article_schema = require(path.resolve(__dirname, 'schema/article.json'));
	var article_entry_schema = require(path.resolve(__dirname, 'schema/article_entry.json'));
	var article_link_schema = require(path.resolve(__dirname, 'schema/article_link.json'));
	article_schema.version = [mongoose.Schema(article_entry_schema)];
	article_schema.link_to = [mongoose.Schema(article_link_schema)];

	Mongoose_Model(
		{
			name:   'hive_wiki_article',
			topics: function (callback) {
				this.find({is_topic: true}).select('topic title').exec(callback);
			},

			make_id: function (topic, name) {
				if (_.isObject(topic)){
					name = topic.name;
					topic = topic.topic;
				}

				return util.format('%s:%s', topic, name);
			},

			exists: function(topic, name, cb){
				this.count({name: name, topic: topic}, cb);
			},

			get_article: function (topic, name, cb) {
				if (!(topic && name)) {
					return  cb(new Error('cannot find article - topic and/or name missing: ' + topic + '/' + name));
				}
				var self = this;
				this.get(this.make_id(topic, name), function(err, article){
					if (article){
						return cb(null, article);
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