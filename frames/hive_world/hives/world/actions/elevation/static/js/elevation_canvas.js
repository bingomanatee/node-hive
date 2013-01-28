var init_elevation_canvas = function () {

	var elevation_canvas;
	var elevation_context;
	var elevation_gs_context;
	var colorized_canvas;

	var stage;
	var bg_con;
	var grid_con;
	var ele_con;

	var gs_width, gs_height;

	var stage_width = 0;
	var stage_height = 0;

	var lon_px_per_degree , lat_px_per_degree;
	var elevation_gs_canvas;

	var G = createjs.Graphics;

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

	function draw_bg() {
		bg_con = new createjs.Container();
		var bg_graphics = new G();
		bg_graphics.beginFill(G.getRGB(0, 0, 0)).drawRect(0, 0, stage_width, stage_height);
		bg_con.addChild(new createjs.Shape(bg_graphics));

		stage.addChild(bg_con);
	}

	window.colorize_elevation = function (bars) {
		if (!bars){
			return;
		}
		var cm_filter = new createjs.ColorMapFilter(bars);
		var color_context = colorized_canvas.getContext('2d');
		cm_filter.applyFilter(elevation_gs_context, 0, 0, gs_width, gs_height, color_context);
		var heights = _.pluck(bars, 'height');

		//var s_filter = new createjs.ShadowFilter(heights, 1);
	//	s_filter.applyFilter(color_context, 0, 0, gs_width, gs_height);
		stage.update();
	};

	function init_color_canvas() {
		ele_con = new createjs.Container();
		colorized_canvas = document.getElementById('colorized_canvas');
		colorized_canvas.width = gs_width = elevation_gs_canvas.width;
		colorized_canvas.height = gs_height = elevation_gs_canvas.height;
		elevation_gs_context = elevation_gs_canvas.getContext('2d');
		var shape = new createjs.Shape(new createjs.Bitmap(colorized_canvas))
		shape.scaleX = shape.scaleY = 0.5;

		ele_con.addChild(shape);

		stage.addChild(ele_con);
	};

	elevation_canvas = document.getElementById("elevation_canvas");

	stage = new createjs.Stage(elevation_canvas);

	stage_height = elevation_canvas.height;
	stage_width = elevation_canvas.width;
	lon_px_per_degree = stage_width / 360;
	lat_px_per_degree = stage_height / 180;

	draw_bg();
	elevation_utils();
	elevation_gs_canvas = draw_elevation();
	init_color_canvas();

	grid_con = draw_lat_lon_grid(stage);

	stage.update();
	stage.tickOnUpdate = true;
	stage.onMouseMove = function () {
		stage.mouse_lat = px_to_lat(stage.mouseY);
		stage.mouse_lon = px_to_lon(stage.mouseX);
		stage.update();
	}

};