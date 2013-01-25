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
			name:                'member',
			/**
			 * this method takes two inputs:
			 * member_obj: document, pass: string
			 *   or
			 * member_id: string, pass: string
			 *
			 * it returns to callback (err, is_good:boolean, member:document);
			 *
			 * @param member: string | document
			 * @param password string
			 * @param callback function
			 * @return {*}
			 */
			member_has_password: function (member, password, callback) {
				if (_.isString(member)) {

					var self = this;

					function _on_get(err, member) {
						if (!member) {
							callback(null, false);
						}

						self.member_has_password((member, password, callback));
					}

					return this.get(member, _on_get);
				}

				if ((!member.password) || (!member.password.value) || (!member.password.envelope) || (!member.password.method)) {
					callback(null, false);
				} else {
					callback(null,  member.password.value == this.encrypt_password(password, member.password.method, member.password.envelope), member);
				}
			},

			set_member_pass: function (cb, member, pass, method, envelope) {
				var self = this;
				if (!method) {
					throw new Error('no method!!!!!!')
				}
				member.save(function (err) {
					if (err) {
						if (_DEBUG)    console.log('cannot set member pass: %s: ---- %s', util.inspect(member), util.inspect(err));
						cb(err);
					} else {
						member.password = self.encrypt_password(pass, method, envelope);
						member.save(cb);
					}
				})
			},

			encrypt_password: function (pass, method, envelope) {
				var self = this;
				var e_pass;
				if (!method) {
					method = 'md5';
				}

				if (!envelope) {
					envelope = this.make_envelope();
				}

				if (_DEBUG) console.log('encrypt password(%s,%s,%s)', pass, method, envelope);

				e_pass = envelope.replace('*', pass);
				if (e_pass == envelope) {
					throw new Error('bad envelope ' + envelope);
				}

				switch (method) {
					case 'md5':
						break;
					case 'sha1':
						break;
					case 'sha256':
						break;
					case 'ripemd160':
						break;

					default:
						throw new Error('cannot find method ' + method);
				}

				return {
					method:   method,
					value:    paj_encrypt[method].any(e_pass, 'utf8'),
					envelope: envelope
				};
			},

			make_envelope: function () {
				return Math.random() + "*" + Math.random()
			},

			sanitize: function (member) {
				if (!member) {
					return {};
				}
				if (member.toJSON) {
					member = member.toJSON();
				}
				delete member.password;
				delete member.email;
				return member;
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