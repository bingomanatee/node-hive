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

	on_input: function (context, callback) {
		var model = this.model('member');
		model.all(function (err, members) {
			context.$out = _.map(members, model.sanitize);
			if (_DEBUG) console.log('members: %s', util.inspect(context.$out));
			callback();
		})
	}

}; // end exports