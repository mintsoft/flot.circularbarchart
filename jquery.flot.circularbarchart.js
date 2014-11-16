/* Flot plugin for creating circular barcharts

Copyright (c) 2014 Robert Emery
Licensed under the Apache license.
*/

(function ($) {
    function init(plot) {
		var target = null,
			processed = null,
			options = null,
			maxRadius = null,
			centerLeft = null,
			centerTop = null,
			ctx = null,
			barWidth = null;
		var TAU = 2 * Math.PI;
		/*
		Flot hooks
		*/
		//options handling
		plot.hooks.processOptions.push(function(plot, options) {
			if (options.series.circularbar.show) {
				options.grid.show = false;

				// set radius
				if (options.series.circularbar.radius == "auto") {
					options.series.circularbar.radius = 1;
				}
				if(options.series.circularbar.barWidth == "auto") {
					options.series.circularbar.barWidth = 1;
				}
			}
		});

		/*
		plot.hooks.bindEvents.push(function(plot, eventHolder) {
			var options = plot.getOptions();
		});
*/
		plot.hooks.processDatapoints.push(function(plot, series, data, datapoints) {
			var options = plot.getOptions();
			if (options.series.circularbar.show) {
				processDatapoints(plot, series, data, datapoints);
			}
		});
/*
		plot.hooks.drawOverlay.push(function(plot, octx) {
			var options = plot.getOptions();
			if (options.series.circularbar.show) {
				drawOverlay(plot, octx);
			}
		});
*/
		plot.hooks.draw.push(function(plot, newCtx) {
			var options = plot.getOptions();
			if (options.series.circularbar.show) {
				draw(plot, newCtx);
			}
		});

		function processDatapoints(plot, series, datapoints) {
			if (!processed)	{
				processed = true;
				canvas = plot.getCanvas();
				target = $(canvas).parent();
				options = plot.getOptions();
				plot.setData(processFlotFormat(plot.getData()));
			}
		}

		function processFlotFormat(data)
		{
			return data;
		}

		function draw(plot, newCtx) {

			if (!target) {
				return; // if no series were passed
			}

			var canvasWidth = plot.getPlaceholder().width(),
				canvasHeight = plot.getPlaceholder().height(),
				legendWidth = target.children().filter(".legend").children().width() || 0;

			ctx = newCtx;

			processed = false;

			// calculate maximum radius and center point

			maxRadius =  Math.min(canvasWidth, canvasHeight) / 2;
			centerTop = canvasHeight / 2 + options.series.circularbar.offset.top;
			centerLeft = canvasWidth / 2;

			if (options.series.circularbar.offset.left == "auto") {
				if (options.legend.position.match("w")) {
					centerLeft += legendWidth / 2;
				} else {
					centerLeft -= legendWidth / 2;
				}
				if (centerLeft < maxRadius) {
					centerLeft = maxRadius;
				} else if (centerLeft > canvasWidth - maxRadius) {
					centerLeft = canvasWidth - maxRadius;
				}
			} else {
				centerLeft += options.series.circularbar.offset.left;
			}

			var series = plot.getData();
			drawPie();

			// we're actually done at this point, just defining internal functions at this point

			function clear() {
				ctx.clearRect(0, 0, canvasWidth, canvasHeight);
				target.children().filter(".pieLabel, .pieLabelBackground").remove();
			}

			function drawPie() {
				var baseAngle = TAU * options.series.circularbar.startAngle;
				var radius = options.series.circularbar.radius > 1 ? options.series.circularbar.radius : maxRadius * options.series.circularbar.radius;

				var ranges = {
					x: {
						min: null,
						max: null
					},
					y: {
						min: null,
						max: null
					}
				};
				for(var i=0; i<series.length; ++i) {
					if(ranges.x.min === null || ranges.x.min > series[i].data[0])
						ranges.x.min = series[i].data[0];
					if(ranges.x.max === null || ranges.x.max < series[i].data[0])
						ranges.x.max = series[i].data[0];
					if(ranges.y.min === null || ranges.y.min > series[i].data[1])
						ranges.y.min = series[i].data[1];
					if(ranges.y.max === null || ranges.y.max < series[i].data[1])
						ranges.y.max = series[i].data[1];
				}
				
				ranges.x.range = ranges.x.max - ranges.x.min;
				ranges.y.range = ranges.y.max - ranges.y.min;
				
				// center and rotate to starting position
				ctx.save();
				ctx.translate(centerLeft,centerTop);

				// draw slices
				ctx.save();
				for (var i = 0; i < series.length; ++i) {
					var datapoint = series[i].data;
					var endDataPoint = datapoint[0] + options.series.circularbar.barWidth;
					var sliceStartAngle = baseAngle + findAngleForXValue(datapoint[0], ranges);
					var sliceEndAngle = baseAngle + findAngleForXValue(endDataPoint, ranges);
					var sliceRadius = findRadiusForYValue(datapoint[1], ranges, radius);
					drawBarSlice(sliceStartAngle, sliceEndAngle, sliceRadius, series[i].color, true);
					drawBarSlice(sliceStartAngle, sliceEndAngle, sliceRadius, options.series.circularbar.stroke.color, false);
					
					//console.debug("Input:" + datapoint + "\t Drawing : "+ sliceStartAngle/TAU, sliceEndAngle/TAU, sliceRadius);
				}
				drawInternalHole(ctx);
				ctx.restore();
				
				return true;

				function drawBarSlice(startAngle, endAngle, sliceRadius, color, fill) {

					if (startAngle < 0 || isNaN(startAngle)) {
						return;
					}

					if (fill) {
						ctx.fillStyle = color;
					} else {
						ctx.strokeStyle = color;
						ctx.lineJoin = "round";
					}

					ctx.beginPath();
					if (Math.abs(startAngle - Math.PI * 2) > 0.000000001) {
						ctx.moveTo(0, 0); // Center of the pie
					}

					//ctx.arc(0, 0, radius, 0, angle, false); // This doesn't work properly in Opera
					ctx.arc(0, 0, sliceRadius, startAngle, endAngle, false);
					ctx.closePath();
					//ctx.rotate(angle); // This doesn't work properly in Opera

					if (fill) {
						ctx.fill();
					} else {
						ctx.stroke();
					}
				}

				function findAngleForXValue(x, ranges)
				{
					/*
					 so 0 = ranges.x.min
					 and tau || 2pi = ranges.x.max
					 */
					var dx = x - ranges.x.min;
					var xAngle = x / (ranges.x.max + options.series.circularbar.barWidth);

					return xAngle * TAU;
				}

				function findRadiusForYValue(y, ranges, maxRadius)
				{
					var ratio = y/ranges.y.max;
					return internalHole() + (maxRadius-internalHole()) * ratio;
				}
				
				function internalHole()
				{
					return options.series.circularbar.internalRadius * maxRadius;
				}
				
				function drawInternalHole(layer) {
					layer.save();
					var innerRadius = internalHole();
					
					layer.globalCompositeOperation = "destination-out"; // this does not work with excanvas, but it will fall back to using the stroke color
					layer.beginPath();
					layer.fillStyle = options.series.circularbar.stroke.color;
					layer.arc(0, 0, innerRadius, 0, TAU, false);
					layer.fill();
					layer.closePath();
					layer.restore();
					
					// add inner stroke/*
					layer.save();
					layer.beginPath();
					layer.strokeStyle = options.series.circularbar.stroke.color;
					layer.arc(0, 0, innerRadius, 0, TAU, false);
					layer.stroke();
					layer.closePath();
					layer.restore();
				}
				
			} // end drawPie function
		} // end draw function
    }

	var options = {
		series: {
			circularbar: {
				show: false,
				radius: "auto",	// actual radius of the visible pie (based on full calculated radius if <=1, or hard pixel value)
				startAngle: 3/4,
				offset: {
					top: 0,
					left: "auto"
				},
				barWidth: "auto",
				internalRadius: 0.2,	//as a ratio of the entire radius
				stroke: {
					color: "#000",
					width: 1
				}
			}
		}
	};

    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'circularbar',
        version: '1.0'
    });
})(jQuery);
