var util = require('util');

module.exports = {
	on_process: function(ctx, cb){
		this.model('hive_wiki_article').active().select('name title topic intro').exec(function(err, articles){
			ctx.out.set('articles', articles);
			console.log('articles: %s', util.inspect(articles));
			cb();
		})
	}
};