'use strict';
var express = require('express');
var router = express.Router();

// GET player list based on team
router.get('/', function (req, res) {
    const requestedRegion = req.query.region; // recieve the data after the ?
    const requestedTeam = req.query.team; // recieve the data after the ?
    res.render('team', { region: requestedRegion, team: requestedTeam });
});
module.exports = router;