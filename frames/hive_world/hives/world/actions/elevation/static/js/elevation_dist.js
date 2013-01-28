var init_elevation_dist_canvas = (function (window) {

	var canvas;
	var stage;

	var stage_height, stage_width;
	var G = createjs.Graphics;
	var dist = [];
	var bars = [];
	var total = 0;

	function set_dist(greys) {
		var value;
		total = 0;
		for (var i = 0; i < 256; ++i) {
			if (greys) {
				value = greys[i] || 0;
			} else {
				value = Math.floor(Math.random() * 256)
			}
			total += value;
			dist[i] = value;
		}
	}

	function update_dist_data(greys) {
		set_dist(greys);
		stage.update();
	}

	function Dist_Bar(grey) {

		this.grey = grey;
		this.shape = new createjs.Shape(new G());
		stage.addChild(this.shape);

		this.redraw();
		var self = this;
		this.shape.onTick = function () {
			self.redraw();
		}
	}

	Dist_Bar.prototype = {
		red:    128,
		green:  128,
		blue:   128,
		redraw: function () {
			this.shape.graphics.clear();
			var height_scale = dist[this.grey] * 128 / total;
			var height = stage_height * height_scale;
			var y = stage_height - height;

			this.shape.graphics.beginFill(G.getRGB(this.red, this.green, this.blue)).rect(2 * this.grey, y, 2, height);
		},
		color:  function (r, g, b) {
			this.red = parseInt(r);
			this.green = parseInt(g);
			this.blue = parseInt(b);
			this.redraw();
		}
	};

	/**
	 * relying on ordered data.
	 * @param grey
	 * @param data
	 */
	function nearest_colors(grey, data) {
		var first = null;
		var last = null;
		_.each(data, function(data_item){
			if (first && last) return;
			if (data_item.grey <= grey){
				first = data_item;
			} else if (first && (first.grey != grey) && (!last)){
				last = data_item;
			}
		})
		return _.compact([first, last]);
	}

	function interpolate_color(g, c1, c2) {
		var w1 = Math.abs(c1.grey - g);
		var w2 = Math.abs(c2.grey - g);
		var w = w1 + w2;

		var d1 = 1 / w1;
		var d2 = 1 / w2;
		var d = d1 + d2;

		var red = c1.red * d1 + c2.red * d2;
		var green = c1.green * d1 + c2.green * d2;
		var blue = c1.blue * d1 + c2.blue * d2;

		var out = {red: parseInt(red/d), green: parseInt(green/d), blue: parseInt(blue/d)};
		// 
		return out;
	}

	function update_elevation_colors(data) {
		if (!stage) return 
		var new_color;
		_.each(data, function (data_item, i) {
			data_item.grey = parseInt(data_item.grey);
			data_item.red = parseInt(data_item.red);
			data_item.green = parseInt(data_item.green);
			data_item.blue = parseInt(data_item.blue);
		})
		_.each(bars, function (bar) {
			var colors = nearest_colors(bar.grey, data);
			if (colors.length < 2){
				new_color = colors[0]
			} else {
				 new_color = interpolate_color(bar.grey, colors[0], colors[1]);
			}
			
			bar.color(new_color.red, new_color.green, new_color.blue);
		});
		stage.update();
		colorize_elevation(bars);
	}

	window.update_elevation_colors = update_elevation_colors;

	return function _init() {
		canvas = document.getElementById("elevation_dist_canvas");
		stage = new createjs.Stage(canvas);

		stage_height = canvas.height;
		stage_width = canvas.width;

		set_dist();

		_.each(_.range(0, 255), function (grey) {
			bars[grey] = new Dist_Bar(grey);
		});

		stage.update();
		stage.tickOnUpdate = true;

		window.update_dist_data = update_dist_data;
		
	};

})(window);