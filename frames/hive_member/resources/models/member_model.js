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

	var member_schema = require(path.resolve(__dirname, 'schema/member.json'));

	Mongoose_Model(
		{
			name:   'member',
			member_has_password: function(member, password){
				return member.password.value == password;
			}
		},

		{
			mongoose:   mongoose,
			schema_def: member_schema
		},

		apiary.dataspace,

		callback
	)
}; // end export function