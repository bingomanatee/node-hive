var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = true;

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */

function _trim_article(article) {
	if (article.toJSON) {
		article = article.toJSON();
	}
	delete article.archive;
	return article;
}

/* ********* EXPORTS ******** */

module.exports = {

	on_get_process: function (ctx, cb) {
		if (_DEBUG) console.log('getting topic %s', ctx.topic);
		var article_model = this.model('hive_wiki_article');

		function _on_article(err, article) {
			if (err) {
				if (_DEBUG) console.log('error getting article: %s', err.message);
				return cb(err);
			}
			if (_DEBUG) console.log('article gotten: %s', util.inspect(article));
			ctx.$out.setAll(article ? _trim_article(article) : {error: 'cannot find article', name: ctx.name, topic: ctx.topic});
			cb();
		}

		article_model.get_topic(ctx.topic, _on_article)
	},

	on_put_process: function (ctx, cb) {
		console.log('new article: %s', util.inspect(ctx, false, 0));
		var article_model = this.model('hive_wiki_article');
		var article = {
			title:    ctx.title,
			content:  ctx.content,
			intro:    ctx.intro,
			name:     ctx.name,
			topic:    ctx.topic,
			is_topic: !!ctx.is_topic,
			tags:     ctx.tags
		};
		article._id = article_model.make_id(article);

		article_model.put(article, function (err, article) {
			if (article) {
				ctx.$out.setAll(_trim_article(article));
			} else {
				ctx.$out.setAll(err);
			}
			cb();
		});
	},

	on_post_process: function (ctx, cb) {

		var article_model = this.model('hive_wiki_article');

		article_model.get_article(ctx.topic, ctx.name, function (err, article) {
			if (err) {
				ctx.$out.setAll(err);
				cb();
			} else {
				var new_data = {
					content: ctx.content,
					tags:    ctx.tags,
					intro:   ctx.intro,
					title:   ctx.title,
					html:    ctx.html
				};

				article_model.archive(article._id, ['title', 'content', 'intro', 'tags', 'html'], new_data, function (err, new_article) {
					if (err) {
						ctx.$out.setAll(err);
					} else {
						ctx.$out.setAll(_trim_article(new_article))
					}
					cb();
				})
			}
		})
	}

}; // end exports