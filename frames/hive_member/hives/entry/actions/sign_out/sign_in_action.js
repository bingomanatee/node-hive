var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = false;

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */
var UNHELPFUL_ERR_MSG = 'Sorry, that is not a working set of access credentials to this site';
/* ********* EXPORTS ******** */

module.exports = {
	on_process: function (context, callback) {
		context.$session_clear('member');
		this.flash_message(context, 'info', 'signed out');
		context.$go('/', callback);
	}

}; // end exports