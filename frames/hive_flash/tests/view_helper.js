var tap = require('tap');
var path = require('path');
var util = require('util');
var _ = require('underscore');
var mvc = require('hive-mvc');
var _DEBUG = false;
var mongoose = require('mongoose');

/* *********************** TEST SCAFFOLDING ********************* */

var FRAMES_ROOT = path.resolve(__dirname, './../../../frames');
console.log('FRAMES_ROOT: %s', FRAMES_ROOT);

var apiary = mvc.Apiary({mongoose: mongoose}, FRAMES_ROOT);

function _clean_template(out){
	return out.replace(/[\s]{2,}/g, ' ').replace(/[\n\r]/g, '').replace(/>[\s]+</g, '><');
}

/* ************************* TESTS ****************************** */

function run_tests(){
	apiary.Resource.list.find({TYPE: 'view_helper', name: 'flash_view_helper'}).one(
		function(err, flash_view_helper){

		if (true) {
			tap.test('test single message', function (t) {

				var req = {session: {flash: {info: ['foo']}}};
				var context = apiary.Context(req, {}, {});
				var output = {};
				flash_view_helper.respond(context, output, function(){
					t.ok(context.$session('flash'), 'flash present');
					var out = _clean_template(output.$flash_messages());
					t.equals(out, '<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert-info">&times;</button>' +
						'<h4>info</h4><p>foo</p></div>', 'flash message ');
					t.ok(!context.$session('flash'), 'flash has been erased');
					t.end();
				});



			}); // end test single message

			tap.test('test multi message', function (t) {

				var context = apiary.Context({session: {flash: {info: ['foo', 'bar']}}}, {}, {});
				var output = {};
				flash_view_helper.respond(context, output, function(){
					t.ok(context.$session('flash'), 'flash present');
					var out = _clean_template(output.$flash_messages());
					t.equals(out, '<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert-info">&times;</button>' +
						'<h4>info</h4><p>foo</p><p>bar</p></div>', 'flash multi message ');
					t.ok(!context.$session('flash'), 'flash has been erased');
					t.end();
				});

			}); // end test multi message

			tap.test('test multi message2', function (t) {

				var context = apiary.Context({session: {flash: {info: ['foo', 'bar'], error: ['alpha', 'beta']}}}, {}, {});
				var output = {};
				flash_view_helper.respond(context, output, function(){
					t.ok(context.$session('flash'), 'flash present');
					var out = _clean_template(output.$flash_messages());
					t.equals(out, '<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert-info">&times;</button>' +
						'<h4>info</h4><p>foo</p><p>bar</p></div>' +
						'<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert-error">&times;</button>' +
						'<h4>error</h4><p>alpha</p><p>beta</p></div>', 'flash multi message 2 ');
					t.ok(!context.$session('flash'), 'flash has been erased');
					t.end();
				});

			}); // end test multi message 2

			tap.test('test no message', function (t) {

				var context = apiary.Context({session: {}}, {}, {});
				var output = {};
				flash_view_helper.respond(context, output, function(){
					var out = _clean_template(output.$flash_messages());
					t.equals(out, '', 'flash message ');
					t.ok(!context.$session('flash'), 'flash has been erased');
					t.end();
				});

			}); // end test no message
		}

		if (true) {
			tap.test('test action extension', function (t) {

				var context = apiary.Context({session: {}}, {}, {});
				var any_action = apiary.model('$actions').all().first();
				
				any_action.flash_message(context, 'info', 'alpha');
				var output = {};

				flash_view_helper.respond(context, output, function(){
					var out = _clean_template(output.$flash_messages());
					t.equals(out, '<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert-info">&times;</button>' +
						'<h4>info</h4><p>alpha</p></div>', 'test action flash message ');
					t.ok(!context.$session('flash'), 'flash has been erased');
					t.end();
				});
			}) // end tap.test 2
		}

	})
}

apiary.init(run_tests);