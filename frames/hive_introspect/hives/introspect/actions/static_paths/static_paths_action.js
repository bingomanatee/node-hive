var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var _DEBUG = true;
var Gate = require('gate');

/* ************************************
 * 
 * ************************************ */

/* ******* CLOSURE ********* */

/* ********* EXPORTS ******** */

module.exports = {

	on_input: function (ctx, cb) {

		ctx.$out.set('site_root', this.get_config('apiary').get_config('root'));
		var m = this.model('$static_prefixes');
		var sp = m.all().records();
		ctx.$out.set('static', sp);
		cb();
	},

	on_process: function (ctx, cb) {
		var gate = Gate.create();

		_.each(ctx.$out.get('static'), function (st) {
			var l = gate.latch();
			fs.readdir(st.prefix, function (err, files) {
				files = _.filter(files, function (f) {
					return !/^\./.test(f);
				});

				st.files = _.map(files, function (file) {
					return {file: file, name: file, url: path.join(st.alias, file)};
				})
				st.subfiles = [];

				_.each(st.files, function (file) {
					var full_path = path.join(st.prefix, file.file);
					var l2 = gate.latch();
					fs.stat(full_path, function (err, file_stat) {
						if (err) {
							return console.log('error: %s', util.inspect(err));
						}
						if (file_stat.isDirectory()) {
							console.log('loading subdiretory of %s', full_path);
							var l3 = gate.latch();

							fs.readdir(full_path, function (err, subfiles) {
								subfiles = _.filter(subfiles, function (f) {
									return !/^\./.test(f);
								});

								_.each(subfiles, function (subfile_file) {
									console.log('subfile: %s', subfile_file);
									var sub_file = {
										file: path.join(file.name, subfile_file),
										name: subfile_file,
										url:  path.join(st.alias, file.file, subfile_file)
									};

									console.log('file: %s, subfile: %s', util.inspect(file), util.inspect(sub_file));
									st.subfiles.push(sub_file);
								})

								l3();
							});
						}
						l2();
					});
				})

				l();
			});
		});

		gate.await(cb);
	}
}; // end exports