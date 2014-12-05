var GLOBALS = {
  time_frame: {start: 2003, end: 2013},
  selected_team: "Atlanta Falcons",
  selected_fields: ["ScoreOff", "FirstDownOff"],
  selected_ranking: "viz2back1.csv"
};

//globals for Visualization1 check boxes
var max_count=3;
var boxCount=0;
var clickedData= [true,false,false,false,
					false,false,false,false,
					false,false,false,false,
					false,false,false,false];
var button = ["Score Offense", "First Down", "Third Down Conversion",
				"Yards Per Carry", "Rush Yards", "Pass Completion", "Pass Yards", "Turnovers",
				"Sacks Taken", "Defensive Scoring","Rushing Yards Allowed", "Passing Yards Allowed", 
				"Interceptions","Fumbles", "Sacks", "Third Down Stop"];
var cats_names = ["ScoreOff", "FirstDownOff", "ThirdDownPctOff", "RushAttOff",
    "RushYdsOff", "PassAttOff", "PassCompOff", "PassYdsOff", "PassIntOff",
    "FumblesOff", "SackNumOff", "SackYdsOff", "PenYdsOff", "PuntAvgOff"];
var maxes = [62,40,9,9,9,9,9,9,9,9,9,9,9,9,9,9];

var top_margin = {top: 30, right: 50, bottom: 30, left: 120},
  top_width = 1200 - top_margin.left - top_margin.right,
  top_height = 400 - top_margin.top - top_margin.bottom;

var top_base_svg = d3.select("body").select(".top_vis");

top_base_svg
  .insert("g")
  .attr("transform", "translate(" + top_margin.left + "," + top_margin.top + ")");

var top_svg = top_base_svg.select('g');

//Edited radial progress bar inspiration from Mike Bostock
function makeRadialBar(wins, losses){

  var winRate = wins/(wins+losses);
  var width = 300,
  height = 300;

  var p = 2 * Math.PI;

  // An arc function with all values bound except the endAngle. So, to compute an
  // SVG path string for a given angle, we pass an object with an endAngle
  // property to the `arc` function, and it will return the corresponding string.
  var arc = d3.svg.arc()
  .innerRadius(90)
  .outerRadius(120)
  .startAngle(0);

  // Create the SVG container, and apply a transform such that the origin is the
  // center of the canvas. This way, we don't need to position arcs individually.
  var svg = d3.select("body").select(".radial_win")
  .attr("width", width)
  .attr("height", height)
  .append("g")
  .attr("transform", "translate(" + width/2 + "," + height/2 + ")")
  .on("mouseover", function(d) {
    d3.select(this).select("text").text(wins + " - " + losses).attr("x", -30);
  })
  .on("mouseout", function(d) {
    d3.select(this).select("text").text(pWin(winRate)).attr("x", -16);
  });

  var pWin = d3.format("%");

  d3.select("body").select(".radial_win").select("g").selectAll("text").remove();
  d3.select("body").select(".radial_win").select("g")
  .append("text")
  .attr("x", -16)
  .attr("y", -10)
  .text(pWin(winRate))
  .style("font-size", "22px")
  .style({'stroke': 'black', 'stroke-width': 1.5});

  d3.select("body").select(".radial_win").select("g")
  .append("text")
  .attr("x", -40)
  .attr("y", 15)
  .text("Win Rate")
  .style("font-size", "22px")
  .style({'stroke': 'black', 'stroke-width': 1.5});

  // Add the background arc, from 0 to 100% (τ).
  var background = svg.append("path")
  .datum({endAngle: p})
  .style("fill", "#ddd")
  .attr("d", arc);

  // Add the foreground arc in green
  var foreground = svg.append("path")
  .datum({endAngle: .127 * p})
  .style("fill", "green")
  .attr("d", arc);

  // Every so often, start a transition to a new random angle. Use transition.call
  // (identical to selection.call) so that we can encapsulate the logic for
  // tweening the arc in a separate function below.
  setInterval(function() {
    foreground.transition()
    .duration(750)
    .call(arcTween, winRate * p);
  }, 1500);

  // Creates a tween on the specified transition's "d" attribute, transitioning
  // any selected arcs from their current angle to the specified new angle.
  function arcTween(transition, newAngle) {

    transition.attrTween("d", function(d) {

      var interpolate = d3.interpolate(d.endAngle, newAngle);


      return function(t) {

        d.endAngle = interpolate(t);

        return arc(d);
      };
    });
  }
}

/* Modified bar graph to display vis #1
* Handles dynamic scaling to respond to which check boxes are selected by the
* user. Base chart taken from Mike Bostock, all additional layers and features
* completed by our group.
*/
function makeBarGraph(viz_data) {

  var margin = top_margin ,//{top: 30, right: 50, bottom: 30, left: 120},
      width = top_width, //1200 - margin.left - margin.right,
      height = top_height; //400 - margin.top - margin.bottom;

  var x0 = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var x1 = d3.scale.ordinal();

  var y = d3.scale.linear()
      .range([height, 0]);

//color range of vis1 bars
  var color = d3.scale.ordinal()
      .range(["#7A14CC", "#19FF71", "#FF9E00"]);

//X-Axis
  var xAxis = d3.svg.axis()
      .scale(x0)
      .orient("bottom");

//SVG element

  //d3.csv("sample_graph1.csv", function(error, data) {
    //var ageNames = d3.keys(data[0]).filter(function(key) { return key !== "State"; });
	var ageNames = GLOBALS.selected_fields;
    viz_data.data.forEach(function(d) {
      d.ages = ageNames.map(function(name) { return {name: name, value: +d.values[name], max: viz_data.maxes["avg" + name]}; });
    });

   // after the previous line executes we can run:
   //   data[3].ages[0] => { name: "Under 5 Years", value: 1208495}
   //   data[3].ages[1] => { name: "5 TO 13 Years", value: 2141490}
   //   data[4].ages[0] => { name: "Under 5 Years", value: 1140516}

    x0.domain(viz_data.data.map(function(d) { return d.year; }));
              // ["CA", "TX", ...]
    x1.domain(ageNames).rangeRoundBands([0, x0.rangeBand()]);
              // ageNames ~= ["Under 5 Years", "5 to 13", ...]
              // x0.rangeBand ~= 160 (total_width/number of divisions)
    top_svg.select(".x_axis")
        .call(xAxis)
        .append("text")
        .attr('id','xAxisLabel')
        .attr("x", width + 43)
        .attr("y", 8)
        .style("text-anchor", "end")
        .text("Years"); //label on x-axis


    var yaxis = top_svg.select(".y_axis");

    top_svg.selectAll(".state").remove();
    //conditional for normalizing data or setting it as raw values
    if (boxCount == 1){
      var index;
      for (i = 0 ; i < clickedData.length; i++){
        if (clickedData[i] == true){
          index = i;
        }
      }
      gen_yaxis(false, yaxis, y, 0, maxes[index], GLOBALS.selected_fields[0])

      var state = top_svg.selectAll(".state")
      .data(viz_data.data)
      .enter().append("g")
      .attr("class", "state")
      .attr("transform", function(d) { return "translate(" + x0(d.year) + ",0)"; });

      state.selectAll("rect")
      .data(function(d) {
        var new_data = [];
        for (jj = 0; jj < GLOBALS.selected_fields.length; jj++) {
          new_data.push({name: GLOBALS.selected_fields[jj], value: d.values[GLOBALS.selected_fields[jj]]})
        }
        return new_data;
      })
      .enter().append("rect")
      .attr("width", x1.rangeBand())
      .attr("x", function(d) { return x1(d.name); })
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); })
      .style("fill", function(d) { return color(d.name); });

    } else {
      gen_yaxis(true, yaxis, y, 0 , 10)

      var state = top_svg.selectAll(".state")
      .data(viz_data.data)
      .enter().append("g")
      .attr("class", "state")
      .attr("transform", function(d) { return "translate(" + x0(d.year) + ",0)"; });

      state.selectAll("rect")
      .data(function(d) {
        //iterate over each individual datapoint
        for (i = 0; i < d.ages.length; i++){
          var index = 0;
          //find correct max to divide by
          for ( j=0 ; j < clickedData.length; j++){
            if (d.ages[i].name == button[j]){
              index = j;
            }
          }
          //console.log(d.ages[i].value/(maxes[index]));

          //update value with normalized value
          console.log(d.ages[i].name, d.ages[i].value, d.ages[i].max)
          d.ages[i].value = d.ages[i].value/(d.ages[i].max);
        }
        return d.ages;
      })
      .enter().append("rect")
      .attr("width", x1.rangeBand())
      .attr("x", function(d) { return x1(d.name); })
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); })
      .style("fill", function(d) { return color(d.name); });

    }

  //define behavior of timeline
	var drag = d3.behavior.drag()
			.on("drag", function(d){if (d3.select(this).attr("r")==11){
										if((d3.event.x>=0)&&(d3.event.x<=980)&&(d3.event.x<(GLOBALS.time_frame.end-2002)*95)){
											GLOBALS.time_frame.start = Math.floor((d3.event.x/95)+2003);
											drawCircles(0.6);
											drawYears();
										}
									}else{
											if((d3.event.x>=95)&&(d3.event.x<=1100)&&(d3.event.x>(GLOBALS.time_frame.start-2002)*95)){
												GLOBALS.time_frame.end = Math.floor((d3.event.x/95)+2002);
												drawCircles(0.6);
												drawYears();
											}
										}
									})
			.on("dragend", function(d){
        drawCircles(1);
        update();
      });
	var yheight = 420;
	drawCircles(1);
	
	var op;
  //helper function to draw circles on timeline scale
	function drawCircles(op){
		if (GLOBALS.time_frame.start == GLOBALS.time_frame.end){
			// update display to single season display
		}
		top_svg.selectAll("circle").remove();
		var circle1 = top_svg.append("circle")
			.attr("cx", (GLOBALS.time_frame.start-2003)*95)
			.attr("cy", yheight)
			.attr("r", 11)
			.attr("fill", "red")
			.attr("opacity", op)
			.call(drag)
			.on("mouseover", function(d) {
				d3.select(this)
				  .attr("opacity", 0.6);
			})
			.on("mouseout", function(d) {
				d3.select(this)
				  .attr("opacity", 1);
			});

		var circle2 = top_svg.append("circle")
			.attr("cx", (GLOBALS.time_frame.end-2002)*95)
			.attr("cy", yheight)
			.attr("r", 10)
			.attr("fill", "red")
			.attr("opacity", op)
			.call(drag)
			.on("mouseover", function(d) {
				d3.select(this)
				  .attr("opacity", 0.6);
			})
			.on("mouseout", function(d) {
				d3.select(this)
				  .attr("opacity", 1);
			});
	}

	var line = top_svg.append("line")
		.attr("x1", 0)
		.attr("y1", yheight)
		.attr("x2", 1045)
		.attr("y2", yheight)
		.attr("stroke", "black")
		;

  //helper function to draw timeline base
	function drawYears(){
    var years = ["2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013"];

		d3.selectAll(".time_frame_lable").remove();
		var time_frame_label = top_svg.append("g")
								  .attr("class", "time_frame_lable")
								  .attr("x",0)
								  .attr("y", 360)
								  .selectAll("text")
								  .data(function(){return years;})
								.enter().append("text")
								  .text(function(d,i){return years[i];})
								  .attr("x", function(d,i) {return i*95 + 40;})
								  .attr("y", function(d,i){if ((i>=GLOBALS.time_frame.start-2003)&&(i<=GLOBALS.time_frame.end-2003)){return yheight-8}else{return yheight-3}})
								  .attr("font-family", "sans-serif")
								  .attr("font-size", 14)
								  .attr("fill", function(d,i){if ((i>=GLOBALS.time_frame.start-2003)&&(i<=GLOBALS.time_frame.end-2003)){return "red"}else{return "black"}})
								  ;
	}

	drawYears();
    //  x0(index_within_x0) => pixel value of where this index is located
    // ex.
    //  x0("CA") => 1st one in our array which is x_pixels = 0px;
    //  x0("NY") => 2nd one in our array which is x_pixels = 160px;

    var legend = top_svg.selectAll(".legend")
        .data(ageNames.slice())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(" + i * 20 + "0)"; });

    //create legend boxes
    legend.append("rect")
        .attr("x", (width/2 - 125) + 3) //width + 32
        .attr("y", -32)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);
    //create legend text
    legend.append("text")
        .attr("x", width/2 - 125)
        .attr("y", -24)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; })

          //Should handle highlighting
          .on("mouseover", function (d) {//filtering
            d3.select(this)
              .attr('fill', color);
            var cat_name = d.name;
            state.selectAll("rect").each(function(d){
              d3.select(this)
                .attr('fill', function(d) {
                  if (d.name === cat_name){
                    return 'black';
                  } else {
                    return 'green';
                  }
                });
            });

          })

          .on("mouseout", function(d) {
              d3.select(this)
                .attr('fill','black');
              state.selectAll("rect").each(function(d){
                d3.select(this)
                .attr('fill', d.name);
              });
          });

    //});
}

function clear() {
  d3.select("body").select(".top_vis").select("g")
  .remove();
  d3.select("body").select(".radial_win").select("g")
  .remove();
}

function drawRankingList(svg, ranking, viz1) {
  var select = svg.selectAll("g");
  select.data(ranking.value).each(function(d) {
    //update team name/icon
    d3.select(this).select("text").text(d.team)
      .on('click', function() {
        GLOBALS.selected_team = d.team;
        update();
      })
      .attr("style", function() { if (d.team == GLOBALS.selected_team){ return "font-weight: bold;";}});
  }).enter().append("g").each(function(d, i) {
    d3.select(this)
      .attr("transform", function() {return "translate(0," + (i+1)*16 + ")"; })
      .append("text").text(d.team)
      .on('click', function() {
        GLOBALS.selected_team = d.team;
        update();
      })
      .attr("style", function() { if (d.team == GLOBALS.selected_team){ return "font-weight: bold;";}});
  });
  return select;
}
//custom selection box created by our group
function itemsClicked(){
	var i = 0;
	for(var j = 0; j < clickedData.length; j++)
	i += clickedData[j]?1:0;
	return(i);
}

function itemClicked(t) {
  var check_this=true;
	var x=itemsClicked();

	if (x>=max_count && !clickedData[t]) {
		check_this=false;

	} else {

		if(clickedData[t]) {
      boxCount--;
			clickedData[t] = false;

			for(i = 0; i < GLOBALS.selected_fields.length; i++) {
				if(button[t] == GLOBALS.selected_fields[i])
					GLOBALS.selected_fields.splice(i,1);
			}

		} else {
      boxCount++;
			clickedData[t] = true;
			GLOBALS.selected_fields.push(button[t]);
		}
		//console.log(t);
		update();
	}

	return (check_this);
}

function changeButtons() {
	GLOBALS.selected_fields[2] = document.getElementById('button1').value;
	update();
}

//additional params: percentile, maxValue, minValue, metricName
/*
* Create a dynamic y-scale to link to second vis
* If multiple boxes checked -> percentile = true and return a normalized
* representation of the data. Otherwise show raw values on scale for single metric
* @param percentile boolean value to normalize or not
* @param yx
* @param y object to adjust based on chosen metrics
* @param minValue int set as bottom of scale if one metric
* @param maxValue int set as top scale if one metric and used to normalize
*/
function gen_yaxis(percentile, yx, y, minValue, maxValue, metricName){

  //set normalize the y-scale
  if (percentile) {
    y.domain([minValue/maxValue, maxValue/maxValue]);
    var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format("%"));

    yx
    .attr("class", "y_axis")
    .call(yAxis)
    .append("text")
    .attr('id','yAxisLabel')
    //.attr("transform", "rotate(-90)")
    .attr("y", -28)
    .attr("x",28)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Percentile"); // label at the side of the y-axis

  //set raw value y-scale
  } else {
    y.domain([minValue, maxValue]);
    var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format("d"));

    yx
    .attr("class", "y_axis")
    .call(yAxis)
    .append("text")
    .attr('id','yAxisLabel')
    //.attr("transform", "rotate(-90)")
    .attr("y", -28)
    .attr("x",28)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text(metricName); // label at the side of the y-axis
  }

}


function makeRankVis(viz2_data, rankings) {
  var margin = {top: 20, right: 20, bottom: 30, left: 90},
      width = 1300 - margin.left - margin.right,
      height = 700 - margin.top - margin.bottom;

  var color = d3.scale.ordinal()
      .range(["#3366CC", "#DC3912",  "#FF9900", "#109618", "#990099", "#0099C6",
              "#3366CC", "#DC3912",  "#FF9900", "#109618", "#990099", "#0099C6",
              "#3366CC", "#DC3912",  "#FF9900", "#109618", "#990099", "#0099C6",
              "#3366CC", "#DC3912",  "#FF9900", "#109618", "#990099", "#0099C6",
              "#3366CC", "#DC3912",  "#FF9900", "#109618", "#990099", "#0099C6",
              "#3366CC", "#DC3912",  "#FF9900", "#109618", "#990099", "#0099C6",
              "#3366CC", "#DC3912"])
      .domain(rankings.value.map(function(q) { return q.team;}));

  var svg = d3.select("body").select(".bot_vis")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .select("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    var data = viz2_data.data;
    var metrics = {};
    var metrics_ranks = {};
    var metrics_arr = [];
    for (metric_name in data) {
      metrics_arr.push({
        metric: metric_name,
        values: data[metric_name]
      });
    }

    // the next part tries to draw the data to the screen
    var lines = svg.selectAll("g");
    var placeholder = lines.data(metrics_arr);
    placeholder.each(function(d) {
      d3.select(this).selectAll("rect").data(d.values).each(function(ddd, iii) {
        d3.select(this)
          .attr("x", function() { return iii * 32 })
          .attr("fill", function() {return color(ddd.team)})
          .style("opacity", function() { return (ddd.team == GLOBALS.selected_team)?1:0.25; })
      });
    });

    placeholder.enter().append("g")
      .attr("class", function(d) { return d.metric; })
      .attr("transform", function(d, i) {return "translate(0," + i*36 + ")"})
      .selectAll("rect").data(function(d) { return d.values; })
      .enter().append("rect")
      .attr("width", "32px")
      .attr("height", "32px")
      .attr("x", function(d, i) { return i * 32 })
      .attr("class", function(d) { return d.team; })
      .attr("data-value", function(d) { return d.value;})
      .attr("fill", function(d) {return color(d.team)})
      .style("opacity", function(d) { return (d.team == GLOBALS.selected_team)?1:0.25; })
      .on('click', function(d) { 
        GLOBALS.selected_team = d.team;
        update();
      })
      .on('mouseover', function(d) {
        d3.select(this).style("opacity", 1)
        .attr("width", "64px")
        .attr("height", "64px")
      })
      .on('mouseout', function(d) {
        d3.select(this).style("opacity", function(d) { return (d.team == GLOBALS.selected_team)?1:0.25; })
        .attr("width", "32px")
        .attr("height", "32px")
      })
      .append("title").text(function(d) { return d.team + "; " + d.value});
    placeholder.each(function(d,i) {
      d3.select(this).selectAll("text").data([d.metric]).enter()
        .append("text").text(function(d) { return d;}).attr("y", 18).attr("x", width - 150);
    });
}


/*
* Update function to clear and redraw visualization based on user input
*/
function update() {
  ranking_svg = d3.select("body").select(".team_ranks");
  d3.json("/viz1?team="+ GLOBALS.selected_team +"&start_year="+ GLOBALS.time_frame.start +"&end_year=" + GLOBALS.time_frame.end, function(err, viz1_data) {
    d3.json("/viz2?&start_year="+ GLOBALS.time_frame.start +"&end_year=" + GLOBALS.time_frame.end, function(err, viz2_data) {
      d3.json("/ranking?&start_year="+ GLOBALS.time_frame.start +"&end_year=" + GLOBALS.time_frame.end, function(err, ranking_data) {
        //console.log("viz1",viz1_data);
        //console.log("viz2",viz2_data);
        //console.log("ranking",ranking_data);
        var viz1 = makeBarGraph(viz1_data);
        var viz2 = makeRankVis(viz2_data, ranking_data, viz1);
        var ranking_list = drawRankingList(ranking_svg, ranking_data, viz1, viz2);
        for (var i = 0; i < ranking_data.value.length; i++) {
          if (ranking_data.value[i].team == GLOBALS.selected_team) {
            makeRadialBar(ranking_data.value[i].wins, ranking_data.value[i].losses);
          }
        }
      });
    });
  });
}

function set_up() {
  top_base_svg.attr("width", top_width + top_margin.left + top_margin.right)
  .attr("height", 500 + top_margin.top + top_margin.bottom)

  top_svg.append("g")
    .attr("class", "x_axis")
    .attr("transform", "translate(0," + top_height + ")");
  yaxis = top_svg.append("g")
    .attr("class", "y_axis");

}

set_up();
update();
