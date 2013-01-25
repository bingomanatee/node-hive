var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */
var UNHELPFUL_ERR_MSG ='Sorry, that is not a working set of access credentials to this site';
/* ********* EXPORTS ******** */

module.exports = {

	on_post_validate: function (context, callback) {
		console.log('validating %s/%s', context.member_name, context.password);
		if (!context.member_name || !context.password){
			console.log('invalid');
			context.$send(new Error('member_name and password required'));
			callback('redirect')
		} else {
			callback();
		}
	},

	on_post_input: function (context, callback) {
		var model = this.model('member');

		model.member_has_password(context.member_name, context.password, function (err, has_password, member) {

			if (has_password){

			}
		});
	},

	on_post_process: function(context, callback){
		context.$session_set('member', context.member.toJSON());
		context.$go('/', callback);
	}

}; // end exports