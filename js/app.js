var app = (function() {
    var chart,
        chartData,
        riders,
        selectedRider,
        vizlayers;
    var riderTableName = "tracks";
    var nameField = "rider_full_name";
    var baseURL = "https://bartaelterman.cartodb.com/api/v2/sql";

    var fetchRider = function () {
      var sql = "SELECT distinct " + nameField + " from " + riderTableName;
      return $.get(baseURL + "?q=" + sql);
    };

    var fetchRiderSpeeds = function () {
        var sql = "SELECT v." + nameField + ", v.date_time,v.distance_km,v.time_diff,v.distance_km/v.time_diff as speed,sum(v.distance_km) OVER (PARTITION BY v." + nameField + " ORDER BY v.date_time) as cum_dist FROM (SELECT t." + nameField + ", t.date_time, (st_distance_sphere(t.the_geom,lag(t.the_geom,1) over(PARTITION BY t." + nameField + " ORDER BY t.date_time) )/1000) as distance_km, (extract(epoch FROM (t.date_time - lag(t.date_time,1) over(PARTITION BY t." + nameField + " ORDER BY t.date_time)))/3600) AS time_diff FROM " + riderTableName + " as t) as v ;";
        return $.get(baseURL + "?q=" + sql);
    };

    var createRiderSelection = function () {
        $("#select-rider").append('<option value="0">All riders</option>');
        $("#select-rider").append('<option disabled>──────────</option>');
        for (var i=0; i<riders.length; i++) {
            var ridername = riders[i][nameField];
            var option = '<option value="' + (i+1) + '">' + ridername + '</option>';
            $("#select-rider").append(option);
        };
    };

    var selectRider = function() {
        var riderID = $("option:selected", this).val();
        if (riderID==0) {
            clearSelection();
        } else {
            selectedRider = riders[riderID-1];
            //console.log("selected: " + selectedRider);
            loadRider();
        }
    };

    var clearSelection = function() {
        vizlayers[1].getSubLayer(0).set({"sql": "SELECT * FROM " + riderTableName});
        vizlayers[1].getSubLayer(1).set(
            {
                "sql": "SELECT ST_MakeLine (the_geom_webmercator ORDER BY date_time ASC) AS the_geom_webmercator, " + nameField + " FROM " + riderTableName + " GROUP BY " + nameField
            });
    };

    var loadRider = function() {
        vizlayers[1].getSubLayer(0).set({"sql": "SELECT * FROM " + riderTableName + " WHERE " + nameField + "='" + selectedRider[nameField] + "'"});
        vizlayers[1].getSubLayer(1).set(
            {"sql": "SELECT ST_MakeLine (the_geom_webmercator ORDER BY date_time ASC) AS the_geom_webmercator, " + nameField + " FROM " +
        riderTableName + " WHERE " + nameField + "='" + selectedRider[nameField] + "' GROUP BY " + nameField
        });
    };

    var speedsToC3 = function(indata) {
        var x = [];
        var speed = [];
        var distance = [];
        indata.forEach(function(el) {
            x.push(new Date(el.date_time));
            speed.push(el.speed);
            distance.push(el.cum_dist);
        });
        return {x: x, speed: speed, distance: distance};
    };

    var setSpeedDataChart = function() {
        chart.axis.labels({
            x: "time",
            y: "speed (km/h)"
        });
        chart.load(chartData.speed);
    };

    var setDistanceDataChart = function() {
        chart.axis.labels({
            x: "time",
            y: "distance (km)"
        });
        chart.load(chartData.distance);
    };

    var insertSpeedTableAndChart = function() {
        fetchRiderSpeeds()
            .done(function (data) {
                console.log(data);
                var data_per_rider = _.groupBy(data.rows, function(x) {return x[nameField]});
                var aggregatedPerRider = _.mapObject(data_per_rider, function(val, key) {
                    var total = 0;
                    for (var i= 0;i<val.length;i++) {
                        total = total+val[i].speed;
                    }
                    return {
                        avg_speed: total/val.length,
                        total_distance: val[val.length-1].cum_dist
                    };
                });
                var c3RecordsPerRider = _.mapObject(data_per_rider, function(records, rider) {
                    return speedsToC3(records);
                });
                var all_speed_records = [];
                var all_distance_records = [];
                var xs = [];
                var c3Data = _.each(c3RecordsPerRider, function(val, key, list) {
                    var times = _.map(val.x, function(time) {return new Date(time)});
                    val.x.unshift('x' + key);
                    xs[key] = 'x' + key;
                    val.speed.unshift(key);
                    val.distance.unshift(key);
                    all_speed_records.push(val.x);
                    all_speed_records.push(val.speed);
                    all_distance_records.push(val.x);
                    all_distance_records.push(val.distance);
                });

                // insert html table with average speeds
                var tableRows = _.mapObject(aggregatedPerRider, function(aggValues, rider) {
                    return "<tr><td>" + rider + "</td><td>" + aggValues.avg_speed + "</td><td>" + aggValues.total_distance + "</td></tr>"
                });
                var tableRowsOneHTML = _.reduce(tableRows, function(memo, el) {
                    return memo + el;
                });
                $("#table-container").append(
                    "<table id=\"stats-table\" class=\"table table-striped\">" + 
                    "<thead><tr><th>Cyclist</th><th>Average speed (km/h)</th><th>Total distance travelled</th></tr></thead>" + 
                    "<tbody>" + tableRowsOneHTML + "</tbody></table>");

                // set chart data
                chartData = {
                    speed: {
                        xs: xs,
                        xFormat: '%Y-%m-%dT%H:%M:%SZ',
                        columns: all_speed_records
                    },
                    distance: {
                        xs: xs,
                        xFormat: '%Y-%m-%dT%H:%M:%SZ',
                        columns: all_distance_records
                    }
                };

                // create chart
                chart = c3.generate({
                    bindto: "#chart",
                    data: {
                        xs: xs,
                        xFormat: '%Y-%m-%dT%H:%M:%SZ',
                        columns: all_speed_records
                    },
                    axis: {
                        x: {
                            label: "time",
                            type: "timeseries",
                            tick: {
                                format: "%Y-%m-%d %H:%M"
                            }
                        },
                        y: {
                            label: "speed (km/h)",
                            min: 0,
                            tick: {
                                format: function (x) {return Math.round(x*100)/100.0}
                            }
                        }
                    }
                });
            });
    };

    window.onload = function() {
        fetchRider()
            .done(function (data) {
                riders = _.sortBy(data.rows, function(x) {return x[nameField];});
                createRiderSelection();
                $("#select-rider").on("change", selectRider);
            });
        var map = cartodb.createVis('map-canvas', 'https://bartaelterman.cartodb.com/api/v2/viz/2a23018e-87eb-11e5-98de-0ea31932ec1d/viz.json')
            .done(function(vis, layers) {
                vizlayers = layers;
            })
            .error(function(err) {
                console.log(err);
            });
        insertSpeedTableAndChart();
    };

    var a = {
        setDistanceDataChart: setDistanceDataChart,
        setSpeedDataChart: setSpeedDataChart
    };

    return a;
})();

$("#speed").on("click", function() {
    var selectedButton = $(this),
        sibling = selectedButton.siblings();
    sibling.removeClass("active");
    selectedButton.addClass("active");
    app.setSpeedDataChart();
});
$("#distance").on("click", function () {
    var selectedButton = $(this),
        sibling = selectedButton.siblings();
    sibling.removeClass("active");
    selectedButton.addClass("active");
    app.setDistanceDataChart();
});

// Closes the responsive menu on menu item click
$(".navbar-collapse ul li a").click(function() {
    $(".navbar-toggle:visible").click();
});
