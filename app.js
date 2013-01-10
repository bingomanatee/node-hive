/**
 * Module dependencies.
 */

var express = require('express')
	, http = require('http')
	, path = require('path')
	, util = require('util')
	, mongoose = require('mongoose')
	, mvc = require('hive-mvc');

var app = express();

app.configure(function () {
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.engine('html', require('ejs').renderFile);
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('feet smell fine'));
	app.use(express.session());
	app.use(app.router);
	// app.use(require('less-middleware')({ src: __dirname + '/public' }));
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
	app.use(express.errorHandler());
});

server = http.createServer(app);
server.on('close', function () {
	console.log('======== closing server');
});

server.listen(app.get('port'), function () {
	var con = 'mongodb://localhost/node_hive';
	mongoose.connect(con);

	var apiary = mvc.Apiary({mongoose: mongoose}, path.join(__dirname, 'frames'));

	console.log('initializing apiary');
	apiary.init(function () {
		var prefixes = apiary.model('$static_prefixes').all().records();
		console.log('static prefixes: %s', util.inspect(prefixes));
		app.use(apiary.Static.resolve);
		apiary.serve(app, server);
	});
});