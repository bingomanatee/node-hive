var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */

var _logged_in_template = _.template('You are signed in as <%= member._id %>. <a href="/member/sign_out">Sign Out</a>');
var _not_logged_in = 'You have not signed in. <a href="/member/sign_in">Sign In</a> or <a href="/member/join">Join Us</a> ';

/* ********* EXPORTS ******** */

module.exports = function (apiary, cb) {
	var helper = {
		name: 'hive_member_view_helper',

		test: function (context, output) {
			return true;
		},

		weight: 800,

		respond: function (context, output, cb) {
			if (!output.hasOwnProperty('$helpers')) {
				output.$helpers = {};
			}

			output.$helpers.member = context.$session('member', false);

			output.$helpers.member_state = function () {
				if (output.$helpers.member) {
					return _logged_in_template({member: output.$helpers.member })
				} else {
					return _not_logged_in;
				}

			}
			cb();
		}
	};

	cb(null, helper)
}; // end export function