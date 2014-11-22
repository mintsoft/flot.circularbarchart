flot.circularbarchart
=====================

A Circular BarChart plugin!

Follows a similiar mechanism to normal barcharts however is currently missing
the ability to put labels on "x-axis" values and the magnitude ("y-axis" or radius)

Looks kinda like this:

![Example Image](https://raw.githubusercontent.com/mintsoft/flot.circularbarchart/master/Example2.png "Rough Example")

Minimal example:

![Example Image](https://raw.githubusercontent.com/mintsoft/flot.circularbarchart/master/Example1.png "Minimal Example")

==Usage==
```javascript
var d1 = [[0,99],[1,80],[2,79],[3,97]],
    d2 = [[0,39],[1,42],[2,51],[3,46]],
    data = [d1, d2];
    
// data is the same format as for barcharts
$.plot("#graph", data, {
	series: {
		stack: true,
		circularbar: {
			show: true,
			barWidth: 1,  // in the same unit as the x-axis values
			internalRadius: 0.25,
			startAngle: 3/4,	//as a proportion of a circle, 3/4 makes 0 at the top
			stroke: {
				width: 0
			},
			fill: true,
			accentLines:[{
				angle: seconds/86400,	//between 0 & 1; the proportion of circle
				color: '#f00',
				width: 2, // line width
			}]
		}
	},
	yaxis: {
		//min: 0,
		//max: 8,
		//ticks: 8, //number of ticks or null
		tickSize: 2
	},
	xaxis: {
		tickStep: 1
	},
	grid: {
		markingsColor: '#aaa'
	}
});
```
