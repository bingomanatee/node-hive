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

	on_get_input: function (context, callback) {
		var model = this.models('hiveworld_world');

		if (context._id) {
			model.get(context._id, function (err, world) {
				if (!world) {
					return callback(new Error('cannot find world ' + context._id));
				} else if (world.deleted) {
					var json = world.toJSON();
					context.$out.set('_id', json._id);
					context.$out.set('deleted', true);
					return callback();
				} else {
					context.$out.set(world.toJSON());
					callback();
				}
			});
		} else {

			model.active(function (err, worlds) {
				context.$out = _.map(worlds, function (world) {
					return world.toJSON();
				})
				callback();
			});
		}
	},

	/* ************** PUT ******************* */

	on_put_validate: function (context, callback) {
		if ((!context.name) || (!context.radius)) {
			return callback(new Error('name and radius are required'));
		} else {
			callback();
		}
	},

	on_put_process: function (context, callback){
		var model = this.models('hiveworld_world');

		var world = {
			name: context.name,
			radius: Math.max(100, parseInt(context.radius))
		};

		model.put(world, function(err, world_obj){
			if (err){
				return callback(err);
			} else if (world_obj){
				context.$out.setAll(world.toJSON());
				callback();
			} else {
				return callback(new Error(util.inspect('cannot create world %s', JSON.stringify(world))));
			}
		});
	},

	/* *************** POST **************** */

	on_put_validate: function(context, callback){
		if (!context._id){
			return callback(new Error('no ID passed'));
		} else {
			callback();
		}
	},

	on_post_input: function(context, callback){

		var model = this.models('hiveworld_world');

		if (context._id) {
			model.get(context._id, function (err, world) {
				if (!world) {
					return callback(new Error('cannot find world ' + context._id));
				} else if (world.deleted) {
					var json = world.toJSON();
					context.$send({
						_id: json._id,
						deleted: true
					});
					callback('redirect');

				} else {
					context.world = world;
					callback();
				}
			});
		}

	},


	on_post_process: function(context, callback){
		if (!context.world){
			return callback(new Error('no world'))
		}

		_.each(['author', 'radius', 'size_units', 'height_units', 'sea_level'], function(unit){
			if (context[unit]){
				context.world[unit] = context[unit];
			}
		});

		context.world.save(function(err){
			if (err){
				callback(err);
			} else {
				context.$out.setAll(context.world.toJSON());
			}
		});
	}

}; // end exports