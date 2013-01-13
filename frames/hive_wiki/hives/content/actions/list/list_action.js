var util = require('util');
var _DEBUG = false;

module.exports = {
	on_process: function(ctx, cb){
		this.model('hive_wiki_article').active().select('name title topic is_topic intro').exec(function(err, articles){
			ctx.$out.set('articles', articles);
			if (_DEBUG) console.log('articles: %s', util.inspect(articles));
			cb();
		})
	}
};