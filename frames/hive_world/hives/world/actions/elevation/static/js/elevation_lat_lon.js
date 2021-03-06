draw_lat_lon_grid = function (stage) {

	var G = createjs.Graphics;
	
	var stage_height = stage.canvas.height;
	var stage_width = stage.canvas.width;

	var label_color = [225, 255, 225];
	var lat_lon_text;

	var lon_px_per_degree = stage_width / 360;
	var lat_px_per_degree = stage_height / 180;

	var lat_lines = [];
	var lon_lines = [];
	var ll_color = [200, 200, 200];
	var lol_color = ll_color;

	var ll_color_eq = [255, 51, 51];
	var lol_color_mer = [102, 153, 255];
	var ll_grid_size = 0;

	if (lon_px_per_degree > 2) {
		ll_grid_size = 5;
	} else if (lon_px_per_degree > 1) {
		ll_grid_size = 10;
	} else {
		ll_grid_size = 15;
	}

	var lat_grid_span = 4 * ll_grid_size;
	var lon_grid_span = 8 * ll_grid_size;

	function lat_to_pix(lat) {
		return stage_height / 2 - (lat * lat_px_per_degree);
	}

	function lon_to_px(lon) {
		return stage_width / 2 + (lon * lon_px_per_degree)
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
		this.graphic = new G().beginStroke(G.getRGB.apply(G, color)).moveTo(0, 0).lineTo(stage_width, 0);
		this.shape = new createjs.Shape(this.graphic);
		this.shape.y = lat_to_pix(lat);
		var self = this;
		con.addChild(this.shape);

		this.shape.onTick = function () {
			if (lat == 0) return;
			self.shape.visible = Math.abs(lat - stage.mouse_lat) < lat_grid_span;

			if (self.shape.visible) {
				self.shape.alpha = 1 - Math.abs(lat - stage.mouse_lat) / lat_grid_span;
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
		this.graphic = new G().beginStroke(G.getRGB.apply(G, color)).moveTo(0, 0).lineTo(0, stage_height);
		this.shape = new createjs.Shape(this.graphic);
		this.shape.x = lon_to_px(lon);
		con.addChild(this.shape);

		var self = this;
		this.shape.onTick = function () {
			if (lon == 0) return;
			self.shape.visible = Math.abs(lon - stage.mouse_lon) < lon_grid_span;

			if (self.shape.visible) {
				self.shape.alpha = 1 - Math.abs(lon - stage.mouse_lon) / lon_grid_span;
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
			self.text.text = _ll_text({lat: Math.round(stage.mouse_lat), lon: Math.round(stage.mouse_lon)})
		}
	}

	var grid_con = new createjs.Container();
	_.each(_.range(-90, 90, ll_grid_size), function (lat) {
		lat_lines.push(new Lat_Line(lat, grid_con));
	});
	_.each(_.range(-180, 180, ll_grid_size), function (lon) {
		lon_lines.push(new Lon_Line(lon, grid_con));
	});

	lat_lon_text = new Lat_Lon_Text(grid_con);

	stage.addChild(grid_con);

	return grid_con;
}