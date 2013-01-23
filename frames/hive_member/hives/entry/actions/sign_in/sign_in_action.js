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

		model.get(context.member_name, function (err, member) {

			if (!member || member.deleted){
				console.log('bad member');
				context.$send(new Error(UNHELPFUL_ERR_MSG));
				return callback('redirect');
			}

			console.log('retrieved member: %s', util.inspect(member.toJSON()));

			if (model.member_has_password(member, context.password)){
				context.member = member;
				callback();
			} else {
				console.log('bad password %s', util.inspect(context.password));
				context.$send(new Error(UNHELPFUL_ERR_MSG));
				return callback('redirect');
			}
		});
	},

	on_post_process: function(context, callback){
		context.$session_set('member', context.member.toJSON());
		context.$go('/', callback);
	}

}; // end exports