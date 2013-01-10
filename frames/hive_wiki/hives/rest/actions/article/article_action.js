var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */

/* ********* EXPORTS ******** */

module.exports = {

	on_get_process: function (ctx, cb) {
		if (_DEBUG) console.log('getting article %s %s', ctx.topic, ctx.name);
		var article_model = this.model('hive_wiki_article');
		article_model.get_article(ctx.topic, ctx.name, function(err, article){
			if (_DEBUG) console.log('article gotten: %s', util.inspect(article));
			ctx.out.set('article',  article ? article : {error: 'cannot find article', name: ctx.name, topic: ctx.topic});
			cb();
		})
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
			if (!article) article = err;
			ctx.out.setAll(article);
			cb();
		});
	}

} // end exports