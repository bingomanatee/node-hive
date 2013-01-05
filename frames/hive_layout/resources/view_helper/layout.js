var _ = require('underscore');
var util = require('util');
var path = require('path');
var _DEBUG = false;

function _merge_resources() {
	var js = _.compact(_.toArray(arguments));
	var out = _.flatten(js);
	return _.reduce(out, function(out, js){
		if (!_.contains(out, js)){
			out.push(js);
		}
		return out;
	}, []);
}

module.exports = function (apiary, cb) {

	var helper = {
		name: 'layout',

		test: function (ctx, output) {
			return output.layout_name;
		},

		weight: 100,

		respond: function (ctx, output, cb) {
			var lm = apiary.model('$layouts');
			lm.get(output.layout_name, function (err, layout) {
				if (layout) {
					var template = layout.get_config('template');
					if (template) {
						output.layout = template;
					}

					output.javascript_head = _merge_resources(layout.get_config('javascript_head'), ctx.$action.get_config('javascript_head'), output.javascript_head);
					output.javascript = _merge_resources(layout.get_config('javascript'), ctx.$action.get_config('javascript'), output.javascript);
					output.css = _merge_resources(layout.get_config('css'), ctx.$action.get_config('css'), output.css);

				} else {
					console.log('cannot find layout %s', output.layout_name);
				}

				cb(null, ctx, output);
			})
		}
	};

	cb(null, helper);
};