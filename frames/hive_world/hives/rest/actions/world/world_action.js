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
		var model = this.model('hiveworld_world');

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
				console.log('worlds: %s', util.inspect(worlds));
				context.$out = _.map(worlds, function (world) {
					return world.toJSON();
				});

				console.log('out: %s', util.inspect(context.$out));

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
		var model = this.model('hiveworld_world');

		var world = {
			name: context.name,
			radius: Math.max(100, parseInt(context.radius)),
			height_unit: context.height_unit || 'm',
			distance_unit: context.distance_unit || 'km',
			radius_unit: context.radius_unit || 'km'
		};

		model.put(world, function(err, world_obj){
			if (err){
				return callback(err);
			} else if (world_obj){
				context.$out.setAll(world_obj.toJSON());
				callback();
			} else {
				callback(new Error(util.inspect('cannot create world %s', JSON.stringify(world))));
			}
		});
	},

	/* *************** DELETE **************** */

	on_delete_validate: function(context, callback){
		if (!context._id){
			return callback(new Error('no ID passed'));
		} else {
			callback();
		}
	},

	on_delete_input: function(context, callback){

		var model = this.model('hiveworld_world');

		if (context._id) {
			model.get(context._id, function (err, world_obj) {
				if (!world_obj) {
					return callback(new Error('cannot find world ' + context._id));
				} else if (world_obj.deleted) {
					var json = world_obj.toJSON();
					context.$send({
						_id: json._id,
						deleted: true
					});
					callback('redirect');

				} else {
					context.world = world_obj;
					callback();
				}
			});
		}
	},

	on_delete_process: function(context, callback){

		var model = this.model('hiveworld_world');

		model.delete(context.world, function(){

			var json = context.world.toJSON();
			context.$out.set('_id', json._id);
			context.$out.set('deleted', true);
			callback();
		}, true);
	},

	/* *************** POST **************** */

	on_post_validate: function(context, callback){
		if (!context._id){
			return callback(new Error('no ID passed'));
		} else {
			callback();
		}
	},

	on_post_input: function(context, callback){

		var model = this.model('hiveworld_world');

		if (context._id) {
			model.get(context._id, function (err, world_obj) {
				if (!world_obj) {
					return callback(new Error('cannot find world ' + context._id));
				} else if (world_obj.deleted) {
					var json = world_obj.toJSON();
					context.$send({
						_id: json._id,
						deleted: true
					});
					callback('redirect');

				} else {
					context.world = world_obj;
					callback();
				}
			});
		}

	},


	on_post_process: function(context, callback){
		if (!context.world){
			return callback(new Error('no world'))
		}

		_.each(['author', 'name', 'radius', 'radius_unit', 'distance_unit', 'height_unit', 'sea_level'], function(unit){
			if (context[unit]){
				context.world[unit] = context[unit];
			}
		});

		context.world.save(function(err){
			if (err){
				callback(err);
			} else {
				context.$out.setAll(context.world.toJSON());
				callback();
			}
		});
	}

}; // end exports