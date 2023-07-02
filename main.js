var width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
var height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

var svg = d3.select("body")
    .append("svg")
    .style("cursor", "pointer");

svg.attr("viewBox", "50 10 " + width + " " + height)
    .attr("preserveAspectRatio", "xMinYMin");

var zoom = d3.zoom()
    .on("zoom", function () {
        var transform = d3.zoomTransform(this);
        map.attr("transform", transform);
    });

svg.call(zoom);

var map = svg.append("g")
    .attr("class", "map");

d3.queue()
    .defer(d3.json, "50m.json")
    .defer(d3.json, "religion.json")
    .await(function (error, world, data) {
        if (error) {
            console.error('Oh dear, something went wrong: ' + error);
        }
        else {
            drawMap(world, data);
        }
    });

var selectedCountry;

function drawMap(world, data) {
    // geoMercator projection
    var projection = d3.geoMercator()
        .scale(190)
        .translate([width / 1.6, height / 1.6]);

    // geoPath projection
    var path = d3.geoPath().projection(projection);

    var features = topojson.feature(world, world.objects.countries).features;
    var religionById = {};
    
    data.forEach(function (d) {
        religionById[d["Name"]] = {
            Christianity: +d.Christianity,
            Islam: +d.Islam,
            Buddhism: +d.Buddhism,
            Hinduism: +d.Hinduism,
            nondenominational: +d.nondenominational,
            Other: +d.Other
        }
    });
    

    features.forEach(function (d) {
        d.details = religionById[d.properties.name] ? religionById[d.properties.name] : {};
    });

    var maxValue = d3.max(features, function(d) {
        return d3.max([
            d.details.Christianity,
            d.details.Islam,
            d.details.Buddhism,
            d.details.Hinduism,
            d.details.nondenominational,
        ]);
    });

    console.log(features);
    
    map.append("g")
        .selectAll("path")
        .data(features)
        .enter().append("path")
        .attr("name", function (d) {
            return d.properties.Name;
        })
        .attr("id", function (d) {
            return d.id;
        })
        .attr("d", path)

        .style("fill", function(d) {
            var maxValue = d3.max([
                d.details.Christianity,
                d.details.Islam,
                d.details.Buddhism,
                d.details.Hinduism,
                d.details.nondenominational,
            ]);
            if (maxValue) {
                if (maxValue === d.details.Christianity) return "red";
                if (maxValue === d.details.Islam) return "green";
                if (maxValue === d.details.Buddhism) return "blue";
                if (maxValue === d.details.Hinduism) return "yellow";
                if (maxValue === d.details.nondenominational) return "purple";
            }
            return "gray";
        })

        .on("click", function (d) {
            if (selectedCountry) {
                d3.select(selectedCountry)
                .style("stroke", null)
                .style("stroke-width", 0.25);
            }

            selectedCountry = this;

            d3.select(this)
                .style("stroke", "black")
                .style("stroke-width", 1.5)
        
            d3.select(".country")
                .text(d.properties.name);
        
            var religionData = d.details;
            var pieData = Object.entries(religionData).map(function ([religion, value]) {
                return { religion: religion, value: value };
            });
        
            // Remove any existing chart before rendering a new one
            d3.select("#chart-container").selectAll("*").remove();
        
            // Set up the dimensions for the chart
            var chartWidth = 350;
            var chartHeight = 350;
            var radius = Math.min(chartWidth, chartHeight) / 2;
        
            // Create an SVG element for the chart
            var chart = d3
                .select("#chart-container")
                .append("svg")
                .attr("width", chartWidth)
                .attr("height", chartHeight)
                .append("g")
                .attr("transform", "translate(" + chartWidth / 2 + "," + chartHeight / 2 + ")");
        
            // Create a pie layout
            var pie = d3
                .pie()
                .value(function (d) {
                    return d.value;
                })
                .sort(null);
        
            // Define an arc generator for the pie chart
            var arc = d3.arc().innerRadius(0).outerRadius(radius);

            var slices = chart
                .selectAll("path")
                .data(pie(pieData))
                .enter()
                .append("path")
                .attr("d", arc)
                .style("fill", function (d) {
                    var religion = d.data.religion;
                    if (religion === "Christianity") return "red";
                    if (religion === "Islam") return "green";
                    if (religion === "Buddhism") return "blue";
                    if (religion === "Hinduism") return "yellow";
                    if (religion === "nondenominational") return "purple";
                    if (religion === "Other") return "black";
                });
            
        
            // Add tooltip on mouseover to show religion and value
            slices
                .on("mouseover", function (d) {
                    var tooltip = d3.select("#chart-container").append("div").attr("class", "tooltip");
        
                    tooltip
                        .html(d.data.religion + ": " + d.data.value + "%")
                        .style("left", d3.event.pageX + "px")
                        .style("top", d3.event.pageY + "px");
                })
                .on("mouseout", function () {
                    d3.select(".tooltip").remove();
                });
    
        })

        document.getElementById("religion-select").addEventListener("change", updateMap);

        function updateMap() {
            var selectedReligion = document.getElementById("religion-select").value;
          
            if (selectedReligion === "all") {
              map.selectAll("path")
                .style("opacity", 1);
            } else {
              var opacityScale = d3.scaleLinear()
                .domain([0, maxValue]) 
                .range([0, 1]); 
          
              map.selectAll("path")
                .style("opacity", function(d) {
                  var religionValue = d.details[selectedReligion];
                  var maxValue = d3.max([
                    d.details.Christianity,
                    d.details.Islam,
                    d.details.Buddhism,
                    d.details.Hinduism,
                    d.details.nondenominational
                  ]);
          
                  if (religionValue === maxValue) {
                    return opacityScale(religionValue); 
                  } else {
                    return 0.1; 
                  }
                });
            }
        }        
}