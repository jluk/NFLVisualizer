// the first few lines load dependencies and define a simple
// http server to listen for api requests and serve static files
var express = require("express");
var mongo = require("mongodb");

var app = express();
var MongoClient = mongo.MongoClient;

app.use(express.static(__dirname + '/public'));

// the root page is just a simple link to a static html page
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

// this is a helper function that declutters formatting data into a json object
var create_season_data = function(team, start, games, maxes) {
  var ret = {};
  ret.team = team;
  ret.year = start;
  ret.data = games;
  ret.maxes = maxes;
  return ret;
};

// this is a helper function that declutters formatting data into a json object
var create_years_data  = function(team, start, end, games, maxes) {
  var ret = {};
  ret.team = team;
  ret.start = start;
  ret.end = end;
  ret.data = [];
  ret.maxes = maxes;
  var data_obj = {};
  for (var i = start; i <= end; i++) {
    data_obj[i] = {};
  }

  // we require some additional logic to make sure that only numeric categories that can be displayed by the front-end
  // are passed-through
  var non_numeric_cats = ["_id" ,"year", "file", "Date", "TeamName","TimePossDef", "TimePossOff", "Opponent", "TImePossDef", "Site", "Line", "TotalLine"];
  for (var i = 0; i < games.length ; i++) {
    for (cat in games[i]) {
      if (non_numeric_cats.indexOf(cat) == -1) {
        if (data_obj[games[i].year].hasOwnProperty(cat)) {
          data_obj[games[i].year][cat] += games[i][cat]/16;
        } else {
          data_obj[games[i].year][cat] = games[i][cat]/16;
        }
      }
    }
  }

  //finally we need to format this as an array
  for (obj in data_obj) {
    ret.data.push({
      year: obj,
      values: data_obj[obj]
    });
  }
  return ret;
};

/*
 * Array of metrics that are bad to have high values in
 */
var bad_cats = ["PassIntOff","FumblesOff","SackNumOff","SackYdsOff","PenYdsOff"];

/*
* Helper function taking in an object containing more objects
* Flatten objects into an array
* Sort it based on values within the object
*/
var flatten_obj = function(obj, cat) {
  var replacement = [];
  for (var team in obj) {
    replacement.push({team: team, value: obj[team]});
  }
  return replacement.sort(function(a,b) { 
    if (bad_cats.indexOf(cat) != -1) {
      return b.value - a.value;
    }
    return a.value - b.value;
  });
};

/*
* Create ranking of all teams for any given category or time frame
* @input start time, end time, games
*/
var create_rankings = function(start, end, games) {
  var ret = {};
  ret.start = start;
  ret.end = end;
  ret.data = [];
  var data_obj = {};

  // we filter out only these categories that we're interested in
  var cats = ["ScoreOff", "FirstDownOff", "ThirdDownPctOff", "RushAttOff",
    "RushYdsOff", "PassAttOff", "PassCompOff", "PassYdsOff", "PassIntOff",
    "FumblesOff", "SackNumOff", "SackYdsOff", "PenYdsOff", "PuntAvgOff"];

  // we iterate over the data and if the value has a slot in our object-to-return
  // we modify that slot with additional data, otherwise we create the original slot
  for (var i = 0; i < games.length; i++) {
    for (var j = 0; j < cats.length; j++) {
      if (!data_obj.hasOwnProperty(cats[j])) {
        data_obj[cats[j]] = {};
      }
      if (!data_obj[cats[j]].hasOwnProperty([games[i].TeamName])) {
        data_obj[cats[j]][games[i].TeamName] = [];
      }
      data_obj[cats[j]][games[i].TeamName].push(parseFloat(games[i][cats[j]]));
    }
  }

  //after we create all the array, we're interested in averaging our the
  //values so we can compare all the teams and find the best average ranking
  for (var cat in data_obj) {
    for (var team in data_obj[cat]) {
      data_obj[cat][team] = data_obj[cat][team].reduce(function(a,b) { return a+b;})/data_obj[cat][team].length;
    }
    data_obj[cat] = flatten_obj(data_obj[cat], cat);
  }
  ret.data = data_obj;
  return ret;
};

/*
* Rank all times for any given time frame
* Dynamically relist sidebar of teams when user slides timescale
*/
var find_ranking = function(start, end, games) {
  var ret = {};
  ret.start = start;
  ret.end = end;
  var teams = {};
  var rank_arr = [];
  //we iterate over all games and create a corresponding slot in our return array
  //for each game that corresponds with the team in question. this slot is a
  //2-element array showing [ wins, losses ]
  for (var i = 0; i < games.length; i++) {
    if (!teams.hasOwnProperty(games[i].TeamName)) {
      teams[games[i].TeamName] = {team: games[i].TeamName, spot: rank_arr.length};
      rank_arr[teams[games[i].TeamName].spot] = [0, 0];
    }
    if (games[i].ScoreOff > games[i].ScoreDef) {
      rank_arr[teams[games[i].TeamName].spot][0]++;
    } else if (games[i].ScoreOff < games[i].ScoreDef) {
      rank_arr[teams[games[i].TeamName].spot][1]++;
    }
  }
  // we iterate over the array again, this time creating verbose objects with porper keys
  for (team in teams) {
    rank_arr[teams[team].spot] = {
      team: team,
      wins: rank_arr[teams[team].spot][0],
      losses: rank_arr[teams[team].spot][1]
    };
  }
  // finally we sort our array based on winrate
  ret.value = rank_arr.sort(function(a,b){ return (b.wins/(b.wins+b.losses)) - (a.wins/(a.wins+a.losses))});
  return ret;
};

//this function handles requests for data for drawing our first viz
app.get("/viz1", function(req, res) {
  var team = req.param('team');
  var start_year = parseInt(req.param('start_year'));
  var end_year = parseInt(req.param('end_year'));
  var result = {};

  //we produce a query that searches for all games played by that team in our time frame
  //and a second query that aggregates all the games played by all teams in that time frame
  //so that we can come up with the maximum average values which we used to calculate the
  //precentile of each value
  result.team = team;
  result.start_year = start_year;
  result.end_year = end_year;
  var year_q = {"$gte": start_year, "$lte": end_year};

  var query = {
    year: year_q,
    TeamName: team
  };

  var cats = ["ScoreOff", "FirstDownOff", "ThirdDownPctOff", "RushAttOff",
    "RushYdsOff", "PassAttOff", "PassCompOff", "PassYdsOff", "PassIntOff",
    "FumblesOff", "SackNumOff", "SackYdsOff", "PenYdsOff", "PuntAvgOff"];

  var cats_avg = cats.map(function(q) { return "avg" + q;});

  var g = {};

  for (var i = 0; i < cats_avg.length; i++) {
    if (start_year == end_year) {
      g[cats_avg[i]] = { "$max": "$"+cats[i]}
    } else{
      g[cats_avg[i]] = { "$avg": "$"+cats[i]}
    }
  }
  if (start_year == end_year) {
    g["_id"] = "$TeamName";
  } else {
    g["_id"] = {team: "$TeamName", year: "$year"};
  }




  //after producing the appropriate query, we connect to the database
  MongoClient.connect('mongodb://localhost:27017/nfl', function(err, db) {
    // we first find all the games played by the team in question
    db.collection("games").find(query ,function(err, data) {
      if (err) { return err; }
      // then we produce the aggregation of all the other games in the same timeframe
      db.collection("games").aggregate([{$match: {year:year_q}}, {$group: g}], function(err, agg_data) {
        var maxes = {};
        for (var i = 0; i < agg_data.length; i++) {
          for (cat in agg_data[i]) {
            if (cat != "_id") {
              if (!maxes[cat] || maxes[cat] < agg_data[i][cat]) {
                maxes[cat] = agg_data[i][cat];
              }
            }
          }
        }
        //we convert our games results into an array and produce a response using our helper functions
        data.toArray(function(err, arr) {
          // this is the case that the years are the same
          if (start_year == end_year) {
            res.end(JSON.stringify(create_season_data(team, start_year, arr, maxes)));
          } else {
            res.end(JSON.stringify(create_years_data(team, start_year, end_year, arr, maxes)));
          }
        });
      })
    });
  });
});


//similar to the handler for viz1 above, we look for all the games within
//the timeframe and use the resulting array to calculate rankings of all the
//teams across all the metrics
app.get("/viz2", function(req, res) {
  var start_year = parseInt(req.param('start_year'));
  var end_year = parseInt(req.param('end_year'));
  var result = {};
  result.start_year = start_year;
  result.end_year = end_year;
  var query = {
    year: {"$gte": start_year, "$lte": end_year}
  };

  MongoClient.connect('mongodb://localhost:27017/nfl', function(err, db) {
    db.collection("games").find(query ,function(err, data) {
      data.toArray(function(err, arr) {
        res.end(JSON.stringify(create_rankings(start_year, end_year, arr)));
      });
    });
  });
});


// this handler just finds all the games within the timeframe
// and produces a ranking based on win-rate for each team in the database
app.get("/ranking", function(req, res) {
  var start_year = parseInt(req.param('start_year'));
  var end_year = parseInt(req.param('end_year'));
  var result = {};
  result.start_year = start_year;
  result.end_year = end_year;
  var query = {
    year: {"$gte": start_year, "$lte": end_year}
  };

  MongoClient.connect('mongodb://localhost:27017/nfl', function(err, db) {
    db.collection("games").find(query ,function(err, data) {
      data.toArray(function(err, arr) {
        res.end(JSON.stringify(find_ranking(start_year, end_year, arr)));
      });
    });
  });
});
app.listen(8000);
