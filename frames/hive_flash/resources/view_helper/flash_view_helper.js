var _ = require('underscore');
var util = require('util');
var path = require('path');
var ejs = require('ejs');
var fs = require('fs');

var _DEBUG = false;

module.exports = function (apiary, cb) {


	fs.readFile(path.resolve(__dirname, 'templates/messages.html'), 'utf8', function(err, messages_template){
		var compiled_template = ejs.compile(messages_template);

		var helper = {
			name: 'flash_view_helper',

			test: function (ctx, output) {
				return true;
			},

			weight: 100000,

			respond: function (ctx, output, cb) {
				output.$flash_messages = function(params){
					var flash = ctx.$session('flash');

					if (flash){
						ctx.$session_clear('flash');
						return compiled_template({_: _, messages: flash});
					} else {
						return '';
					}
				};

				cb();
			}
		};

		cb(null, helper);

	});
};