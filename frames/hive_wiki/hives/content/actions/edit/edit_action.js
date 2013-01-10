var util = require('util');

module.exports = {

	on_get_input: function (ctx, cb) {
		this.model('hive_wiki_article').topics(function (err, topics) {
			ctx.out.set('topics', topics);
			cb();
		})
	},

	on_get_process: function (ctx, cb) {
		ctx.out.setAll({topic: ctx.topic, name: ctx.name});
		cb();
	}

}