var _ = require('underscore');
var util = require('util');
var path = require('path');
var _DEBUG = false;

module.exports = function (apiary, cb) {

	var helper = {
		name: 'layout_name',

		test: function (ctx, output) {
			return ctx.$action.get_config('layout_name');
		},

		weight:-100,

		respond: function (ctx, output, cb) {
			if (!output.layout_name){
				output.layout_name = ctx.$action.get_config('layout_name');
			}
			if (_DEBUG) console.log('layout name: %s', output.layout_name);
		    cb(null, ctx, output);
		}
	};

	cb(null, helper);
};