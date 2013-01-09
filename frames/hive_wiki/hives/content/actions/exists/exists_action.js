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

	on_process: function(ctx, cb){

		var article_model = this.model('hive_wiki_article');

		article_model.exists(ctx.topic, ctx.name, function(err, ex){
			ctx.out.set('exists', ex);
			cb();
		})
	}

} // end exports