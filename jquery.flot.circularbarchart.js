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
		var baseAngle = null;
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
				
				if(options.series.circularbar.startAngle)
					baseAngle = TAU * options.series.circularbar.startAngle;
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

			function determineRangesForStackedSeries(series) {
				var perSeriesRanges = [];

				var dataSet;
				for (var s = 0; s < series.length; ++s) {
					dataSet = series[s].data;

					var range = {
						x: {
							min: null,
							max: null
						},
						y: {
							min: null,
							max: null
						}
					};

					for (var i = 0; i < dataSet.length; ++i) {
						if (range.x.min === null || range.x.min > dataSet[i][0])
							range.x.min = dataSet[i][0];
						if (range.x.max === null || range.x.max < dataSet[i][0])
							range.x.max = dataSet[i][0];
						if (range.y.min === null || range.y.min > dataSet[i][1])
							range.y.min = dataSet[i][1];
						if (range.y.max === null || range.y.max < dataSet[i][1])
							range.y.max = dataSet[i][1];
					}

					perSeriesRanges[s] = range;
				}

				var ranges = {
					x: {
						min: null,
						max: null
					},
					y: {
						min: null,
						max: 0
					}
				};
				for (var x=0; x<perSeriesRanges.length; ++x)
				{
					if (ranges.x.min === null || ranges.x.min > perSeriesRanges[x].x.min)
						ranges.x.min = perSeriesRanges[x].x.min;
					if (ranges.x.max === null || ranges.x.max < perSeriesRanges[x].y.min)
						ranges.x.max = perSeriesRanges[x].x.max;
					if (ranges.y.min === null || ranges.y.min > perSeriesRanges[x].y.min)
						ranges.y.min = perSeriesRanges[x].y.min;
					ranges.y.max += perSeriesRanges[x].y.max;
				}

				ranges.x.range = ranges.x.max - ranges.x.min;
				ranges.y.range = ranges.y.max - ranges.y.min;
				return ranges;
			}

			function determineRangesForSeries(series) {
				if(options.series.stack)
				{
					return determineRangesForStackedSeries(series);
				}
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

				var dataSet;
				for (var s = 0; s < series.length; ++s) {
					dataSet = series[s].data;

					for (var i = 0; i < dataSet.length; ++i) {
						if (ranges.x.min === null || ranges.x.min > dataSet[i][0])
							ranges.x.min = dataSet[i][0];
						if (ranges.x.max === null || ranges.x.max < dataSet[i][0])
							ranges.x.max = dataSet[i][0];
						if (ranges.y.min === null || ranges.y.min > dataSet[i][1])
							ranges.y.min = dataSet[i][1];
						if (ranges.y.max === null || ranges.y.max < dataSet[i][1])
							ranges.y.max = dataSet[i][1];
					}
				}

				ranges.x.range = ranges.x.max - ranges.x.min;
				ranges.y.range = ranges.y.max - ranges.y.min;
				return ranges;
			}

			function drawPie() {
				if(options.series.stack)
					return drawStackedPie();

				var radius = options.series.circularbar.radius > 1 ? options.series.circularbar.radius : maxRadius * options.series.circularbar.radius;

				var ranges = determineRangesForSeries(series);
			
				// center and rotate to starting position
				ctx.save();
				ctx.translate(centerLeft,centerTop);
				ctx.save();

				drawAxis(radius, ranges);
				
				for(var s=0; s < series.length; ++s) {
					var dataSet = series[s].data;
					for (var i = 0; i < dataSet.length; ++i) {
						var datapoint = dataSet[i];
						var endDataPoint = datapoint[0] + options.series.circularbar.barWidth;
						var sliceStartAngle = baseAngle + findAngleForXValue(datapoint[0], ranges);
						var sliceEndAngle = baseAngle + findAngleForXValue(endDataPoint, ranges);
						var sliceRadius = findRadiusForYValue(datapoint[1], ranges, radius);
						drawBarSlice(sliceStartAngle, sliceEndAngle, sliceRadius, series[s].color, true);
						if(options.series.circularbar.stroke.width > 0)
							drawBarSlice(sliceStartAngle, sliceEndAngle, sliceRadius, options.series.circularbar.stroke.color, false);

						//console.debug("Input:" + datapoint + "\t Drawing : "+ sliceStartAngle/TAU, sliceEndAngle/TAU, sliceRadius);
					}
				}

				drawInternalHole(ctx);
				ctx.restore();
				
				return true;
				
				function drawAxis(radius, ranges) {
					//vertical line
					ctx.beginPath();
					ctx.strokeStyle = options.grid.markingsColor;
					ctx.lineWidth = 1;
					ctx.moveTo(0, 0);
					ctx.lineTo(0, -1 * radius);
					ctx.stroke();
					
					//rings
					for (var y_val = ranges.y.min; y_val <= ranges.y.max; y_val += ranges.y.range/5)
					{
						var rad = findRadiusForYValue(y_val, ranges, radius);
						ctx.beginPath();
						ctx.arc(0, 0, rad, 0, TAU, false);
						ctx.stroke();
					}
					
					//segments
					for (var x_val = ranges.x.min; x_val <= ranges.x.max; x_val += options.series.circularbar.barWidth)
					{
						var sliceStartAngle = baseAngle + findAngleForXValue(x_val, ranges);
						var sliceEndAngle = baseAngle + findAngleForXValue(x_val + options.series.circularbar.barWidth, ranges);
						console.log(sliceStartAngle, sliceEndAngle);
						drawBarSlice(sliceStartAngle, sliceEndAngle, radius, options.grid.markingsColor, false);
					}
					
					ctx.restore();
				}
				
				function drawStackedPie() {
					var radius = options.series.circularbar.radius > 1 ? options.series.circularbar.radius : maxRadius * options.series.circularbar.radius;
					
					var ranges = determineRangesForSeries(series);
					//console.log("radius", radius, maxRadius, ranges.y.max);
					ctx.save();
					ctx.translate(centerLeft,centerTop);
					ctx.save();

					drawAxis(radius, ranges);
					
					var maximumValuesPerX = [];

					for(var s=0; s < series.length; ++s) {
						var dataSet = series[s].data;
						for (var i = 0; i < dataSet.length; ++i) {
							var datapoint = dataSet[i];
							
							var endDataPoint = datapoint[0] + options.series.circularbar.barWidth;
							var sliceStartAngle = baseAngle + findAngleForXValue(datapoint[0], ranges);
							var sliceEndAngle = baseAngle + findAngleForXValue(endDataPoint, ranges);
							
							var radii = findBoundariesForYValueSegment(datapoint[1], maximumValuesPerX[datapoint[0]], ranges, radius);
							var endRadius = radii.end;
							var startRadius = radii.start;
							//console.log(radii);
							
							drawBarSegment(sliceStartAngle, sliceEndAngle, startRadius, endRadius, series[s].color, true);
							if(options.series.circularbar.stroke.width > 0)
								drawBarSegment(sliceStartAngle, sliceEndAngle, startRadius, endRadius, options.series.circularbar.stroke.color, false);

							maximumValuesPerX[datapoint[0]] = endRadius;
							
							//console.debug("Set: ",s,"Input:",i,datapoint,"\t Drawing : ", sliceStartAngle/TAU, sliceEndAngle/TAU, sliceRadius, endRadius);
						}
					}

					drawInternalHole(ctx);
					ctx.restore();

					return true;
				}

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
					if (Math.abs(startAngle - TAU) > 0.000000001) {
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
				
				function drawBarSegment(startAngle, endAngle, startRadius, endRadius, color, fill) {

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
					if (Math.abs(startAngle - TAU) > 0.000000001) {
						ctx.moveTo(0, 0); // Center of the pie
					}
					
					// this works by drawing the outside arc in clockwise and
					// the inside arc anticlockwise then joining them to form
					// a segment ^_^
					ctx.beginPath();
					ctx.arc(0, 0, endRadius, startAngle, endAngle, false);
					ctx.arc(0, 0, startRadius, endAngle, startAngle, true);
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
				
				function findBoundariesForYValueSegment(y, startRadius, ranges, maxRadius)
				{
					var y_ratio = y/ranges.y.max;
					
					var returns = {
						start: null,
						end: null
					};
					
					if(startRadius)
					{
						returns.start = startRadius;
						returns.end = startRadius + (maxRadius - internalHole()) * y_ratio; 
					}
					else 
					{	
						returns.start = internalHole();
						returns.end = internalHole() + (maxRadius-internalHole()) * y_ratio;
					}
					
					return returns;
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
					if(options.series.circularbar.stroke.width > 0)
					{				
						layer.save();
						layer.beginPath();
						layer.strokeStyle = options.series.circularbar.stroke.color;
						layer.arc(0, 0, innerRadius, 0, TAU, false);
						layer.stroke();
						layer.closePath();
						layer.restore();
					}
				}
				
			} // end drawPie function
		} // end draw function
    }

	var options = {
		series: {
			stack: false,
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
