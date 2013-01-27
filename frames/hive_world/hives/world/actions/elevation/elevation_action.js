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

	on_input : function(context, callback){
	context.$out.set('_id', context._id);
	callback();

	context.$out.set('full_screen', true);
}

} // end exports