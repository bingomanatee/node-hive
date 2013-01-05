var util = require('util');

module.exports = {
	on_process: function(ctx, cb){
		console.log('___________ article list __________');
		this.model('hive_wiki_article').active().select('name title').exec(function(err, articles){
			ctx.out.set('articles', articles);
			console.log('articles: %s', util.inspect(articles));
			cb();
		})
	}
};