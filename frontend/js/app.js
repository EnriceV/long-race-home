(function() {
    var riders,
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
        var sql = "SELECT * FROM (SELECT t." + nameField + ", t.date_time, (st_distance_sphere(t.the_geom,lag(t.the_geom,1) over(ORDER BY t." + nameField + ", t.date_time))/1000)/(extract(epoch FROM (t.date_time - lag(t.date_time,1) over(ORDER BY t." + nameField + ", t.date_time)))/3600) AS km_per_hour FROM " + riderTableName + " AS t) as v WHERE v.km_per_hour is not null;";
        return $.get(baseURL + "?q=" + sql)
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
        var y = [];
        indata.forEach(function(el) {
            x.push(el.date_time);
            y.push(el.km_per_hour);
        });
        return {x: x, y: y};
    };

    var insertSpeedTableAndChart = function() {
        fetchRiderSpeeds()
            .done(function (data) {
                var speeds_per_rider = _.groupBy(data.rows, function(x) {return x[nameField]});
                var avg_speed_per_rider = _.mapObject(speeds_per_rider, function(val, key) {
                    var total = 0;
                    for (var i= 0;i<val.length;i++) {
                        total = total+val[i].km_per_hour;
                    }
                    return total/val.length;
                });
                var avg_speed_records = _.mapObject(speeds_per_rider, function(records, rider) {
                    return speedsToC3(records);
                });
                var all_records = [];
                var xs = [];
                var c3Data = _.each(avg_speed_records, function(val, key, list) {
                    val.x.unshift('x' + key);
                    xs[key] = 'x' + key;
                    val.y.unshift(key);
                    all_records.push(val.x);
                    all_records.push(val.y);
                });
                console.log(all_records);

                // insert html table with average speeds
                var tableRows = _.mapObject(avg_speed_per_rider, function(speed, rider) {
                    return "<tr><td>" + rider + "</td><td>" + speed + "</td></tr>"
                });
                var tableRowsOneHTML = _.reduce(tableRows, function(memo, el) {
                    return memo + el;
                });
                $("<div id=\"chart-full\"><div class=\"container\"><div class=\"row\"><div class=\"col-md-12\"><div id=\"chart\"></div></div></div></div></div>").insertAfter("#map");
                $("<div id=\"table-full\"><div class=\"container\"><div class=\"row\"><table id=\"table\" class=\"table table-striped\"><thead><tr><td>Rider</td><td>Average speed (km/h)</td></tr></thead><tbody>" +
                tableRowsOneHTML + "</tbody></table></div></div></div>").insertAfter("#map");

                // create chart
                var chart = c3.generate({
                    bindto: "#chart",
                    data : {
                        //x: "date_time",
                        xs: xs,
                        xFormat: '%Y-%m-%dT%H:%M:%SZ',
                        columns: all_records,

                    },
                    axis: {
                        x: {
                            type: "timeseries",
                            tick: {
                                format: "%Y-%m-%d %H:%M"
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
    }
})();