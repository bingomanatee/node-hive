/*
 * ShadowFilter
 * Visit http://createjs.com/ for documentation, updates and examples.
 *
 * Copyright (c) 2010 gskinner.com, inc.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

// namespace:
this.createjs = this.createjs || {};

(function () {

	/**
	 * Maps a color scale to the intensity of an image. .
	 *
	 * @class ShadowFilter
	 * @constructor
	 * @extends Filter
	 * @param { [{red, gree, blue} .. {}] } array of red, green, blue, hash;
	 **/
	var ShadowFilter = function (heights, units_per_pixel) {
		this.initialize(heights, units_per_pixel);
	};
	var p = ShadowFilter.prototype = new createjs.Filter();

// constructor:
	/**
	 * Initialization method.
	 * @method initialize
	 * @protected
	 **/
	p.initialize = function (heights, units_per_pixel) {
		this.heights = heights | [];
		this.units_per_pixel = units_per_pixel | 1;
	};

// public methods:
	/**
	 * Applies the filter to the specified context.
	 * @method applyFilter
	 * @param {CanvasRenderingContext2D} ctx The 2D context to use as the source.
	 * @param {Number} x The x position to use for the source rect.
	 * @param {Number} y The y position to use for the source rect.
	 * @param {Number} width The width to use for the source rect.
	 * @param {Number} height The height to use for the source rect.
	 * @param {CanvasRenderingContext2D} targetCtx Optional. The 2D context to draw the result to. Defaults to the context passed to ctx.
	 * @param {Number} targetX Optional. The x position to draw the result to. Defaults to the value passed to x.
	 * @param {Number} targetY Optional. The y position to draw the result to. Defaults to the value passed to y.
	 * @return {Boolean}
	 **/
	p.applyFilter = function (ctx, x, y, width, height, targetCtx, targetX, targetY) {
		targetCtx = targetCtx || ctx;
		if (targetX == null) {
			targetX = x;
		}
		if (targetY == null) {
			targetY = y;
		}
		try {
			var imageData = ctx.getImageData(x, y, width, height);
		} catch (e) {
			//if (!this.suppressCrossDomainErrors) throw new Error("unable to access local image data: " + e);
			return false;
		}
		var data = imageData.data;
		imageData.data = shade_data(data, width, height, this.heights, this.units_per_pixel);

		targetCtx.putImageData(imageData, targetX, targetY);
		return true;
	};

	/**
	 * Returns a string representation of this object.
	 * @method toString
	 * @return {String} a string representation of the instance.
	 **/
	p.toString = function () {
		return "[ShadowFilter]";
	};

	/**
	 * Returns a clone of this ShadowFilter instance.
	 * @method clone
	 * @return {ShadowFilter} A clone of the current ShadowFilter instance.
	 **/
	p.clone = function () {
		return new ShadowFilter(this.heights, this.units_per_pixel);
	};

	createjs.ShadowFilter = ShadowFilter;

	function greys_in_data(pix) {
		return _.reduce(pix, function (out, g, i) {
			if (!(i % 4)) out.push(g);
			return out;
		}, [])
	}

	function greys_to_heights(greys, heights) {
		return _.map(greys, function (grey) {
			if (heights[grey]) {
				return heights[grey];
			} else {
				return 0;
			}
		});
	}


	function shade_data(data, canvas_width, canvas_height, heights, units_per_pixel) {

		var grey_array = greys_in_data(data);
		var height_array = greys_to_heights(grey_array, heights);
		var height_grid = [];

		// console.log('shade data: len' , data.length, 'width:', canvas_width, 'height array:', height_array.length);

		_.each(_.range(0, height_array.length, canvas_width), function (i) {
			height_grid.push(height_array.slice(i, i + canvas_width));
		});

		// console.log('height grid: rows: ', height_grid.length, 'row 1 len: ', height_grid[0].length);

		var shaded = [];
		function write_shade(d, x, y) {
			var offset = 4 * (y * canvas_width + x);
			_.each(_.range(0, 2), function(i){
				shaded[offset + i] = d > 0 ? 255 : 0;
			})
			shaded[offset + 3] = Math.min(Math.abs(d), 255);
		}

		_.each(height_grid, function (row, y) {
			_.each(row, function (height, x) {
				var nw, se;
				try {

					if (x && y && (y < (height_grid.length - 1))) {
						nw = height_grid[y - 1][x - 1];
						se = height;
					} else {
						nw = height;
						se = height_grid[y + 1][x + 1];
					}
				} catch(err) {
					nw = se = 0;
				}

				write_shade(nw - se, x, y);

			});
		});

		// console.log('shaded: ', shaded);

		return shaded;
	}

}());