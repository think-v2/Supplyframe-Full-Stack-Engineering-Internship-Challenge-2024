'use strict';
var debug = require('debug')('my express app');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');

var routes = require('./routes/index');
var region = require('./routes/region');
var team = require('./routes/team');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/region', region);
app.use('/team', team);

app.get('/fetchData', async (req, res) => {
    let apiUrl = 'https://liquipedia.net/valorant/api.php';
    let payload = {
        action: 'parse',
        format: 'json',
        page: "Portal:Teams",
        formatversion: '2'
    };
    let url = new URL(apiUrl);
    url.search = new URLSearchParams(payload).toString();

    // assigning smaller regions to the larger regions
    let AmericasRegions = ["North_America", "Brazil", "Latin_America_North", "Latin_America_South"];
    let CNRregions = ["China"];
    let EMEARegions = ["Europe", "CIS", "Turkey", "Middle_East_&amp;_Africa",];
    let PacificRegions = ["Korea", "Japan", "Southeast_Asia", "South_Asia", "Oceania"];

    // retrieve data from api
    let AmericasTeams = [];
    let CNTeams = [];
    let EMEATeams = [];
    let PacificTeams = [];
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // isolate desired data
            let parsed_text = data.parse.text
            let fetched_data = parsed_text.substring(parsed_text.indexOf('<h3><span class="mw-headline" id="Regions">'));

            // goes thru each region
            let players = [];
            let indexOfLastRecorded = 0;
            while (-1 != indexOfLastRecorded && -1 != fetched_data.indexOf('<h4><span class="mw-headline" id="', indexOfLastRecorded)) {
                let MEAcase = (fetched_data.indexOf('<h4><span id="Middle_East_.26_Africa"></span><span class="mw-headline" id="', indexOfLastRecorded));
                let startingIndex = fetched_data.indexOf('<h4><span class="mw-headline" id="', indexOfLastRecorded);
                let region = fetched_data.substring(startingIndex + 34, fetched_data.indexOf('"', startingIndex + 34));

                // MEA is formatted slightly differently, so it must be accounted for
                if (MEAcase != -1 && MEAcase < startingIndex) {
                    startingIndex = MEAcase;
                    region = fetched_data.substring(startingIndex + 75, fetched_data.indexOf('"', startingIndex + 75));
                }
                let endingIndex = fetched_data.indexOf('</div></div>\n</div>', startingIndex);
                if (!(AmericasRegions.includes(region) || CNRregions.includes(region) || EMEARegions.includes(region) || PacificRegions.includes(region))) {
                    console.log("Bad Region:" + region);
                    indexOfLastRecorded = startingIndex + 1;
                    continue;
                }

                // goes thru each team
                let teams = [];
                let rawTeams = fetched_data.substring(startingIndex, endingIndex).split('\n');
                rawTeams.forEach(rawTeam => {
                    let teamName = rawTeam.substring(rawTeam.indexOf('highlightingclass="') + 19, rawTeam.indexOf('"', rawTeam.indexOf('highlightingclass="') + 19));
                    let players = [];
                    let invalidTeamNames = ["w-headline", "-group toggle-state-show", "te-box", "le_East_.26_Africa", "emplate-box"];
                    if (!invalidTeamNames.includes(teamName)) {
                        // goes thru each payer
                        let indexOfLastRecordedPlayer = 0;
                        while (-1 != indexOfLastRecordedPlayer && -1 != rawTeam.indexOf('<span class="flag">', indexOfLastRecordedPlayer)) {
                            let startingIndexPlayer = rawTeam.indexOf('<span class="flag">', indexOfLastRecordedPlayer);
                            let endingIndexPlayer = rawTeam.indexOf('<td style="font-weight:bold">', startingIndexPlayer);
                            indexOfLastRecordedPlayer = endingIndexPlayer;
                            if (endingIndexPlayer == -1) {
                                endingIndexPlayer = rawTeam.length;
                            }
                            packagePlayer(rawTeam, startingIndexPlayer, endingIndexPlayer, players);
                            
                            indexOfLastRecordedPlayer = endingIndexPlayer;
                        }
                        // assign team dictionary
                        teams.push({
                            "name": teamName,
                            "players": players
                        });
                    }

                });
                // sort teams into each region
                if (AmericasRegions.includes(region)) {
                    AmericasTeams = AmericasTeams.concat(teams);
                    //console.log("Adding to Americas");
                } else if (CNRregions.includes(region)) {
                    CNTeams = CNTeams.concat(teams);
                    //console.log("Adding to CN");
                } else if (EMEARegions.includes(region)) {
                    EMEATeams = EMEATeams.concat(teams);
                    //console.log("Adding to EMEA");
                } else if (PacificRegions.includes(region)) {
                    PacificTeams = PacificTeams.concat(teams);
                    //console.log("Adding to Pacific");
                } else {
                    //console.log("Adding to None!");
                }


                indexOfLastRecorded = endingIndex;
            }
            // assign allteam dictionary
            let AllTeams = {
                "AmericasTeams": AmericasTeams,
                "CNTeams": CNTeams,
                "EMEATeams": EMEATeams,
                "PacificTeams": PacificTeams
            };
            res.send(AllTeams);
        })
        .catch(error => console.error('Error fetching data:', error));
});

// grab each attribute of the player
function packagePlayer(rawTeam, startingIndexPlayer, endingIndexPlayer, players ) {
    let rawPlayer = rawTeam.substring(startingIndexPlayer, endingIndexPlayer);
    let flag = rawPlayer.substring(rawPlayer.indexOf('_hd.png') - 2, rawPlayer.indexOf('_hd.png'));
    let country = rawPlayer.substring(rawPlayer.indexOf('<span class="flag"><a href="/valorant/Category:') + 47, rawPlayer.indexOf('"', rawPlayer.indexOf('<span class="flag"><a href="/valorant/Category:') + 47)).replaceAll('_', ' ');
    let id = rawPlayer.substring(rawPlayer.indexOf('<span style="white-space:pre"><a href="/valorant/') + 49, rawPlayer.indexOf('"', rawPlayer.indexOf('<span style="white-space:pre"><a href="/valorant/') + 49));
    let name = rawPlayer.substring(rawPlayer.indexOf('</a></span></td><td>') + 20, rawPlayer.indexOf('<', rawPlayer.indexOf('</a></span></td><td>') + 20));
    let sub = rawPlayer.indexOf('Substitute') != -1;

    // assign player dictionary
    if (id.substring(0, 10) != "index.php?") {
        players.push({
            "flag": flag,
            "country": country,
            "id": id,
            "name": name,
            "sub": sub
        });
    }
}

module.exports = packagePlayer;

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.set('port', process.env.PORT || 3000);
console.log("localhost:" + app.get('port'));

var server = app.listen(app.get('port'), function () {
    debug('Express server listening on port ' + server.address().port);
});