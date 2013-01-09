var util = require('util');

module.exports = {

	on_get_input: function(ctx, cb){
		this.model('hive_wiki_article').topics(function(err, topics){
			ctx.out.set('topics', topics);
			cb();
		})
	},

	on_put_input: function (ctx, cb) {
		cb(null, ctx);
	},

	on_put_process: function(ctx, cb){
		console.log('new article: %s', util.inspect(ctx, false, 0));
		var article_model = this.model('hive_wiki_article');
		var article = {
			title: ctx.title,
			content: ctx.content,
			intro: ctx.intro,
			name: ctx.name,
			topic: ctx.topic,
			is_topic: !!ctx.is_topic,
			tags: ctx.tags
		};
		article._id = article_model.make_id(article);

		article_model.put(article, cb);
	}

};