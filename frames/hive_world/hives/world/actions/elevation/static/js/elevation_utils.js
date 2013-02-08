var elevation_utils = function () {

	var elevation_gs_canvas;
	var elevation_gs_context;
	var G = createjs.Graphics;
	var gs_height = 0;
	var gs_width = 0;

	function make_canvas(w, h) {
		var c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	}

	function greys_in_canvas(stage) {
		var imgd = elevation_gs_context.getImageData(0, 0, gs_width, gs_height);
		var pix = imgd.data;
		return _.reduce(pix, function (out, g, i) {
			if (!(i % 4)) out.push(g);
			return out;
		}, [])
	}

	function redist_greys(elevation_gs_stage) {
		var grey_poll = greys_in_canvas(elevation_gs_stage);
		var sample = atoll(grey_poll);

		var range_min = sample.median() - 3 * sample.stdDev();
		var range_max = sample.median() + 3 * sample.stdDev();
		var range = range_max - range_min;

		var redist = _.map(_.range(0, 255), function (grey) {
			if (grey < range_min) return 0;
			if (grey > range_max) return 255;
			return 255 * (grey - range_min) / range;
		});
		//

		var ctx = elevation_gs_stage.canvas.getContext('2d');

		var imgd = ctx.getImageData(0, 0, gs_width, gs_height);
		var pix = imgd.data;
		for (var i = 0, n = pix.length; i < n; i += 4) {
			pix[i  ] = pix[i + 1] = pix[i + 2] = redist[pix[i]];
			// i+3 is alpha (the fourth element)
		}

		ctx.putImageData(imgd, 0, 0);
		var bfilter = new createjs.BoxBlurFilter(1, 1, 2);
		bfilter.applyFilter(ctx, 0, 0, gs_width, gs_height);
	}

	function grey_dist() {
		var imgd = elevation_gs_context.getImageData(0, 0, gs_width, gs_height);
		var pix = imgd.data;
		var greys = _.map(_.range(0, 255), function () {
			return 0;
		});
// Loop over each pixel and invert the color.
		for (var i = 0, n = pix.length; i < n; i += 4) {
			++greys[ pix[i / 4]];

			/*	pix[i  ] = 255 - pix[i  ]; // red
			 pix[i+1] = 255 - pix[i+1]; // green
			 pix[i+2] = 255 - pix[i+2]; // blue */
			// i+3 is alpha (the fourth element)
		}
		return greys;
	}

	function generate_noise(scale) {

		var noise_canvas = make_canvas(Math.ceil(gs_width / scale) + 20, Math.ceil(gs_height / scale) + 20);

		var noise_context = noise_canvas.getContext('2d');
		var imgd = noise_context.getImageData(0, 0, noise_canvas.width, noise_canvas.height);
		var pix = imgd.data;

		_.reduce(pix, function (grey, channel_value, i) {
			switch (i % 4) {
				case 0:
					grey = Math.floor(255 * Math.random());
					break;
				case 1:
					break;
				case 2:
					break;
				case 3:
					pix[i] = 255;
					return grey;
					break;

				default:
					return grey;
			}

			pix[i] = grey;
			return grey;
		}, 0);

		noise_context.putImageData(imgd, 0, 0);

		return noise_canvas;
	}

	function draw_elevation() {
		var elevation_gs_stage = new createjs.Stage(elevation_gs_canvas);
		elevation_gs_stage.autoClear = false;

		var g = new G().beginFill(G.getRGB(255, 0, 0)).rect(0, 0, gs_width, gs_height);
		elevation_gs_stage.addChild(new createjs.Shape(g));

		var alpha = 1;
		var data = _.map(_.range(31, 1, -1.25), function (n) {
			return n * n
		});
		var dl = data.length;
		var a = 0.8;
		var b = 0.1;

		var alphas = _.map(_.range(a, b, ( b - a) / dl), function (v) {
			return v * v * 2
		})

		alphas[0] = 1;
		_.each(data, function (m, i) {
			var noise_canvas = generate_noise(m);
			var noise_bitmap = new createjs.Bitmap(noise_canvas);
			var noise_bitmap_shape = new createjs.Shape(noise_bitmap);
			noise_bitmap_shape.scaleX = noise_bitmap_shape.scaleY = m;
			noise_bitmap_shape.x = noise_bitmap_shape.y = m > 1 ? -10 : 0;

			alpha = alphas[i];

			noise_bitmap_shape.alpha = alpha;

			elevation_gs_stage.addChild(noise_bitmap_shape);
			elevation_gs_stage.update();

			var bfilter = new createjs.BoxBlurFilter(dl - i + 1, dl - i + 1, 1);
			bfilter.applyFilter(elevation_gs_context, 0, 0, gs_width, gs_height);
			elevation_gs_stage.removeAllChildren();
		});

		redist_greys(elevation_gs_stage);

		update_dist_data(grey_dist(elevation_gs_stage));

		return elevation_gs_canvas;
	}

	elevation_gs_canvas = document.getElementById("elevation_gs_canvas");
	elevation_gs_context = elevation_gs_canvas.getContext('2d')
	gs_height = elevation_gs_canvas.height;
	gs_width = elevation_gs_canvas.width;

	window.draw_elevation = draw_elevation;
}