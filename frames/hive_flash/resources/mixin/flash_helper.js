var Gate = require('gate');
var _ = require('underscore');
var util = require('util');
var path = require('path');
var _DEBUG = false;

module.exports = function (apiary, cb) {
	cb(null, {
		name:    'flash_mixin',
		respond: function (callback) {

			apiary.on_action(function(action){
				action.flash_message = function(ctx, type, msg){
					type = type.toLowerCase();

					//@TODO: filter type
					var flash = ctx.$session('flash', {});
					if (!flash.hasOwnProperty(type)){
						flash[type] = [];
					}
					flash[type].push(msg);

					ctx.$session_set('flash', flash);
				}
			});

			callback();

		}
	})
};