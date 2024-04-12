'use strict';
var express = require('express');
var router = express.Router();

// GET team list based on region
router.get('/', function (req, res) {
    const requestedRegion = req.query.region; // recieve the data after the ?
    const year = new Date().getFullYear();

    res.render('region', { year: year, region: requestedRegion });
});

module.exports = router;