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

	on_validate: function (context, callback) {
		if (!context._id) {
			return callback(new Error('not valid data'));
		} else {
			return callback();
		}
	},

	on_put_validate: function (context, callback) {
		if ((!context._id) || (!context.password)) {
			return callback(new Error('not valid data'));
		} else {
			return callback();
		}
	},

	/* ********* GET ******** */

	on_get_input: function (context, callback) {
		var model = this.model('member');

		function _on_get(err, member) {
			if (member) {
				context.member = member;
				callback();
			} else {
				callback(new Error('Cannot find member' + context._id))
			}
		}

		model.get(context._id, _on_get)
	},

	on_get_process: function (context, callback) {
		var model = this.model('member');

		var member = context.member;
		delete context.member;

		context.$out.setAll(model.sanitize(member));

		callback();
	},

	/* ********* POST ******** */

	on_post_input: function (context, callback) {
		var model = this.model('member');

		function _on_get(err, member) {
			if (member) {
				context.member = member;
				callback();
			} else {
				callback(new Error('Cannot find member' + context._id))
			}
		}

		model.get(context._id, _on_get)
	},

	on_post_process: function (context, callback) {
		var model = this.model('member');

		var member = context.member;
		delete context.member;

		if (context.password) {
			member.password.value = context.password.value;
		}
		if (context.email) {
			member.email = context.email;
		}

		member.save();
		context.$out.setAll(model.sanitize(member));
		callback();
	},

	/* ********* PUT ******** */

	on_put_input: function (context, callback) {
		var model = this.model('member');

		function _on_get(err, member) {
			if (err) {
				callback(err);
			} else if (member) {
				callback(new Error('there is already a member ' + context._id));
			} else {
				callback();
			}
		}

		model.get(context._id, _on_get);
	},

	on_put_process: function (context, callback) {
		var model = this.model('member');
		var password = context.password.value ? context.password.value : context.password;

		function _on_put(err, new_member_obj) {

			if (err) {
				return callback(err);
			} else {
				var nmo_json = model.sanitize(new_member_obj);
				context.$out.setAll(nmo_json);
			}

			model.set_member_pass(callback, new_member_obj, password);
		}

		var new_member = {
			_id:   context._id,
			email: context.email
		};

		model.put(new_member, _on_put);
	}

}; // end exports