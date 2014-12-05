var express = require("express");
var mongo = require("mongodb");

var app = express();
var MongoClient = mongo.MongoClient;

app.use(express.static(__dirname + '/public'));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

var create_season_data = function(team, start, games, maxes) {
  var ret = {};
  ret.team = team;
  ret.year = start;
  ret.data = games;
  ret.maxes = maxes;
  return ret;
};


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
  for (obj in data_obj) {
    ret.data.push({
      year: obj,
      values: data_obj[obj]
    });
  }
  return ret;
};

var flatten_obj = function(obj, cat) {
  var replacement = [];
  for (var team in obj) {
    replacement.push({team: team, value: obj[team]});
  }
  return replacement.sort(function(a,b) { return a.value - b.value;});
};

var create_rankings = function(start, end, games) {
  var ret = {};
  ret.start = start;
  ret.end = end;
  ret.data = [];
  var data_obj = {};

  var cats = ["ScoreOff", "FirstDownOff", "ThirdDownPctOff", "RushAttOff",
    "RushYdsOff", "PassAttOff", "PassCompOff", "PassYdsOff", "PassIntOff",
    "FumblesOff", "SackNumOff", "SackYdsOff", "PenYdsOff", "PuntAvgOff"];
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
  for (var cat in data_obj) {
    for (var team in data_obj[cat]) {
      data_obj[cat][team] = data_obj[cat][team].reduce(function(a,b) { return a+b;})/data_obj[cat][team].length;
    }
    data_obj[cat] = flatten_obj(data_obj[cat], cat);
  }
  ret.data = data_obj;
  return ret;
};

var find_ranking = function(start, end, games) {
  var ret = {};
  ret.start = start;
  ret.end = end;
  var teams = {};
  var rank_arr = [];
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
  for (team in teams) {
    rank_arr[teams[team].spot] = {
      team: team,
      wins: rank_arr[teams[team].spot][0],
      losses: rank_arr[teams[team].spot][1]
    };
  }
  ret.value = rank_arr.sort(function(a,b){ return (b.wins/(b.wins+b.losses)) - (a.wins/(a.wins+a.losses))});
  return ret;
};

app.get("/viz1", function(req, res) {
  var team = req.param('team');
  var start_year = parseInt(req.param('start_year'));
  var end_year = parseInt(req.param('end_year'));
  var result = {};

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
    g[cats_avg[i]] = { "$avg": "$"+cats[i]}
  }
  g["_id"] = {team: "$TeamName", year: "$year"};

  MongoClient.connect('mongodb://localhost:27017/nfl', function(err, db) {
    db.collection("games").find(query ,function(err, data) {
      if (err) { return err; }
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
    if (start_year == end_year) {
      db.collection("ranks").findOne({year: start_year} ,function(err, doc) {
        res.end(JSON.stringify({year: start_year, value: doc}));
      });
    } else {
      db.collection("games").find(query ,function(err, data) {
        data.toArray(function(err, arr) {
          res.end(JSON.stringify(find_ranking(start_year, end_year, arr)));
        });
      });
    }
  });
});
app.listen(8000);
