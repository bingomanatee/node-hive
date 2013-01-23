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
	on_put_validate : function(context, callback){
		if (!context._id || !context.password){
			return callback(new Error('not valid data'));
		} else {
			return callback();
		}
	},
	
	on_put_process: function(context, callback){
		var model = this.model('member');

		function _on_put(err, new_member_obj){
			if (err){
				callback(err);
			} else {
				var nmo_json = new_member_obj.toJSON();
				delete nmo_json.password;
				delete nmo_json.email;
				context.$out.setAll(nmo_json);
				callback();
			}
		}

		function _on_get(err, member){
			if (member){
				callback(new Error('there is already a member ' + context._id));
			} else {
				var new_member = {
					_id: context._id,
					password: {value: context.password},
					email: context.email
				};

				model.put(new_member, _on_put);
			}
		}

		model.get(context._id, _on_get)
	}

}; // end exports