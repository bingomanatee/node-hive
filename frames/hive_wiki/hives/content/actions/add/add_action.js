var util = require('util');

module.exports = {

	on_put_input: function (ctx, cb) {

		console.log('context: %s', util.inspect(ctx, false, 0));

		cb(null, ctx);
	},

	on_put_process: function(ctx, cb){
		var article = {
			title: ctx.title,
			content: ctx.content,
			intro: ctx.intro,
			name: ctx.name,
			tags: ctx.tags
		};

		this.model('hive_wiki_article').put(article, cb);
	}

};