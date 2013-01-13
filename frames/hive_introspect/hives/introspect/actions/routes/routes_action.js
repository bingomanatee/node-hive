var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = true;

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */

/* ********* EXPORTS ******** */

module.exports = {

	on_input: function(ctx, cb){

		ctx.$out.set('site_root', this.get_config('apiary').get_config('root'));
		var actions = this.model('$actions').all().records();
		if (_DEBUG) console.log('actions: ', util.inspect(actions, false, 0));
		ctx.$out.set('actions',  actions);
		cb();
	}
}; // end exports