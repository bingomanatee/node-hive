var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = true;
var Mongoose_Model = require('hive-model-mongoose');

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */

/* ********* EXPORTS ******** */

module.exports = function (apiary, callback) {
	var mongoose = apiary.get_config('mongoose');

	var world_schema = require(path.resolve(__dirname, 'schema/world.json'));

	Mongoose_Model(
		{
			name:   'hiveworld_world'
		},

		{
			mongoose:   mongoose,
			schema_def: world_schema
		},

		apiary.dataspace,

		callback
	)
} // end export function