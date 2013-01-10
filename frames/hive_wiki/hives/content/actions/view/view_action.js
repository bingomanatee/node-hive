var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;
var marked = require('marked');

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */

/* ********* EXPORTS ******** */

module.exports = {

	on_validate: function(ctx, cb){
		if (!ctx.topic && ctx.name){
			 ctx.$flash('error', 'Cannot find topic and/or name');
			ctx.$go('/wiki/articles', cb);
		} else {
			cb();
		}
	},

	on_input: function (ctx, cb) {
		var article_model = this.model('hive_wiki_article');
		article_model.get_article(ctx.topic, ctx.name, function(err, article){
			if (err || (!article)){
				ctx.$flash('error', util.format('cannot find article %s/%s', ctx.topic, ctx.name));
				ctx.$go('/wiki/articles', cb);
			} else {
				ctx.out.set('article', article);
				ctx.out.set('html', marked(article.content));
				cb();
			}
		})
	}

}; // end exports