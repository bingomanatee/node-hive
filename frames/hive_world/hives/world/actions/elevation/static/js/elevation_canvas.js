var init_elevation_canvas = (function () {

	var canvas;
	var stage;
	var bg_con;
	var grid_con;
	var ele_con;

	var bg_graphics;
	var noise_bitmap;

	var lat_lines = [];
	var lon_lines = [];
	var ll_color = [200, 200, 200];
	var lol_color = ll_color;

	var ll_color_eq = [255, 51, 51];
	var lol_color_mer = [102, 153, 255];
	var lat_px_per_degree;
	var lon_px_per_degree;
	var ll_grid_size = 0;

	var mouse_lat = 0;
	var mouse_lon = 0;
	var stage_width = 0;
	var stage_height = 0;

	var G = createjs.Graphics;

	var label_color = [225, 255, 225];

	var lat_lon_text;

	var lon_grid_span;
	var lat_grid_span;

	var elevation_gs_canvas;

	function lat_to_pix(lat) {
		var height = canvas.height;

		return height / 2 - (lat * lat_px_per_degree);
	}

	function lon_to_px(lon) {
		var width = canvas.width;
		return width / 2 + (lon * lon_px_per_degree)
	}

	function px_to_lon(x) {
		var x_offset = x - (stage_width / 2);
		return (x_offset / lon_px_per_degree);
	}

	function px_to_lat(y) {
		var y_offset = (stage_height / 2) - y;
		return (y_offset / lat_px_per_degree);
	}

	function Lat_Line(lat, con) {
		this.lat = lat;
		var color;
		if (lat == 0) {
			color = ll_color_eq;
		} else {
			color = ll_color;
		}
		this.graphic = new G().beginStroke(G.getRGB.apply(G, color)).moveTo(0, 0).lineTo(canvas.width, 0);
		this.shape = new createjs.Shape(this.graphic);
		this.shape.y = lat_to_pix(lat);
		var self = this;
		con.addChild(this.shape);

		this.shape.onTick = function () {
			if (lat == 0) return;
			self.shape.visible = Math.abs(lat - mouse_lat) < lat_grid_span;

			if (self.shape.visible) {
				self.shape.alpha = 1 - Math.abs(lat - mouse_lat) / lat_grid_span;
				self.shape.alpha *= self.shape.alpha * 0.5;
			}
		};

	}

	function Lon_Line(lon, con) {
		this.lon = lon;
		var color;
		if (lon == 0) {
			color = lol_color_mer;
		} else {
			color = lol_color;
		}
		this.graphic = new G().beginStroke(G.getRGB.apply(G, color)).moveTo(0, 0).lineTo(0, canvas.height);
		this.shape = new createjs.Shape(this.graphic);
		this.shape.x = lon_to_px(lon);
		con.addChild(this.shape);

		var self = this;
		this.shape.onTick = function () {
			if (lon == 0) return;
			self.shape.visible = Math.abs(lon - mouse_lon) < lon_grid_span;

			if (self.shape.visible) {
				self.shape.alpha = 1 - Math.abs(lon - mouse_lon) / lon_grid_span;
				self.shape.alpha *= self.shape.alpha * 0.333;
			}
		};
	}

	var _ll_text = _.template("<%= lat %> lat, <%= lon %>  lon");

	function Lat_Lon_Text(grid_con) {
		this.text = new createjs.Text('lat lon', '10px Arial', G.getRGB.apply(G, label_color));
		this.text.x = 10;
		this.text.y = stage_height - 20;
		grid_con.addChild(this.text);
		var self = this;
		this.text.onTick = function () {
			self.text.text = _ll_text({lat: Math.round(mouse_lat), lon: Math.round(mouse_lon)})
		}
	}

	function draw_grid() {
		grid_con = new createjs.Container();
		_.each(_.range(-90, 90, ll_grid_size), function (lat) {
			lat_lines.push(new Lat_Line(lat, grid_con));
		});
		_.each(_.range(-180, 180, ll_grid_size), function (lon) {
			lon_lines.push(new Lon_Line(lon, grid_con));
		});

		lat_lon_text = new Lat_Lon_Text(grid_con);

		stage.addChild(grid_con);

	}

	function draw_bg() {
		bg_con = new createjs.Container();
		var bg_graphics = new G();
		bg_graphics.beginFill(G.getRGB(0, 0, 0)).drawRect(0, 0, canvas.width, canvas.height);
		bg_con.addChild(new createjs.Shape(bg_graphics));

		console.log('canvas ', canvas.width, 'x', canvas.height);
		stage.addChild(bg_con);
	}

	function generate_noise() {
		var noise_con = new createjs.Container();
		var noise_canvas = document.getElementById("elevation_gs_canvas2");
		var noise_stage = new createjs.Stage(noise_canvas);
		var noise_bitmap = new createjs.Bitmap(noise_canvas);
		noise_con.addChild(noise_bitmap);

		var step = 2;
		var s = 50;
		var e = 1;
		var extent = s - e / step;

		_.each(_.range(s, e, -step), function (size, i) {

			var black_g = new G().beginFill(G.getRGB(0, 0, 0)).drawRect(0, 0, size, size);
			var grey_g = new G().beginFill(G.getRGB(124, 124, 124)).drawRect(0, 0, size, size);
			var white_g = new G().beginFill(G.getRGB(255, 255, 255)).drawRect(0, 0, size, size);
			var g;

			function add_shape(x, y) {
				var r = Math.random();
				if (r > 0.666) {
					g = black_g;
				} else if (r < 0.333) {
					g = white_g;
				} else {
					g = grey_g;
				}
				var s = new createjs.Shape(g);
				s.x = x;
				s.y = y;
				s.alpha = i / extent;
				noise_stage.addChild(s);
			}

			_.each(_.range(0, stage_width, size), function (x) {
				_.each(_.range(0, stage_height, size), function (y) {
					add_shape(x, y);
				})
			})
		});

		noise_stage.addChild(noise_con);
		noise_stage.update();
		return noise_canvas;
	}

	function draw_elevation() {
		elevation_gs_canvas = document.getElementById("elevation_gs_canvas");
		var egs_stage = new createjs.Stage(elevation_gs_canvas);

		var hidden = document.getElementById('hideme');

		var alpha = 1

		_.each([1,2,4,8,16,32], function (m, i) {
			var noise_canvas = generate_noise();
			var nc_context = noise_canvas.getContext('2d');

			var nc2 = document.createElement('canvas');

			nc2.width = stage_width;
			nc2.height = stage_height;
			//hidden.appendChild(nc2);
			var nc2_context = nc2.getContext('2d');

			var copy = nc_context.getImageData(0, 0, stage_width, stage_height);
			nc2_context.putImageData(copy, 0,0);

			if (m > 2) {
				var filter = new createjs.BoxBlurFilter(m/2, m/2, 1);
				filter.applyFilter(nc2_context, 0,0, stage_width, stage_height);
			}
			var noise_bitmap = new createjs.Bitmap(nc2);
			var s = new createjs.Shape(noise_bitmap);
			s.scaleX = s.scaleY = m;

			s.alpha = alpha;
			alpha -= 0.15;

			egs_stage.addChild(s);
		});

		egs_stage.update();
		var sc = 2;
		var os = 128 * (sc * -2);
		var cfilter = new createjs.ColorFilter(2, 2, 2, 1, -64, -64, -64, 0);
		cfilter.applyFilter(elevation_gs_canvas.getContext('2d'), 0, 0, stage_width, stage_height);

	}

	return function _init() {

		canvas = document.getElementById("elevation_canvas");
		stage = new createjs.Stage(canvas);

		stage_height = canvas.height;
		stage_width = canvas.width;

		lon_px_per_degree = stage_width / 360;
		lat_px_per_degree = stage_height / 180;

		if (lon_px_per_degree > 2) {
			ll_grid_size = 5;
		} else if (lon_px_per_degree > 1) {
			ll_grid_size = 10;
		} else {
			ll_grid_size = 15;
		}

		lat_grid_span = 4 * ll_grid_size;
		lon_grid_span = 8 * ll_grid_size;

		draw_bg();
		draw_elevation();
		draw_grid();

		stage.update();
		stage.tickOnUpdate = true;
		stage.onMouseMove = function () {
			mouse_lat = px_to_lat(stage.mouseY);
			mouse_lon = px_to_lon(stage.mouseX);
			stage.update();
		}
	}

})(window);