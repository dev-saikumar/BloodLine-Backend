const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const constants = require('./utils/constants');
var app = express();
var meta_routes = require('./api/meta');
var bodyParser = require('body-parser');

let session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const useragent = require('express-useragent');
var paypal = require('paypal-rest-sdk');

var cors = require('cors');

var tree_routes = require("./api/tree");
var session_routes = require("./api/sessions");
var timeline_routes = require("./api/timeline");
var analytics_routes = require("./api/analytics");
var devices_routes = require("./api/devices");
var events_routes = require("./api/events");
var puppy_gen_routes = require("./api/puppy-gen");
var jobs_routes = require("./api/jobs");
var subtree_routes = require("./api/subtree");
var payment_routes = require("./api/payments");

var jobs = require('./jobs/jobs-init');

var sheetCreds = require('./client_secret.json');
var sheetUtils = require('./sheet_utils/Util');

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(useragent.express());

app.use(cors({
    'Access-Control-Allow-Origin': '*',
    'allowedHeaders': ['Content-Type'],
    'origin': ['http://localhost:8081', 'http://localhost:8080', 'https://bline.netlify.app', 'http://bloodline.ga', 'https://bloodline.ga', 'https://blineqa.netlify.app'],
    'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
    'preflightContinue': false,
    credentials: true
}));

paypal.configure({
    'mode': process.env.PAYPAL_MODE, 
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
});

app.set('trust proxy', 1);
app.use(session({
    secret: 'jai',
    store: new MongoStore({ url: process.env.SESSION_STORE }),
    resave: false,
    saveUninitialized: false,
    // cookie : { sameSite: 'none' , secure: false , httpOnly : true}
}));

app.use("/meta", meta_routes);
app.use("/tree", tree_routes);
app.use("/sessions", session_routes);
app.use("/timeline/:surname/:person_id", timeline_routes);
app.use("/analytics/:surname", analytics_routes);
app.use("/devices", devices_routes);
app.use("/events", events_routes);
app.use("/puppy", puppy_gen_routes);
app.use("/jobs", jobs_routes);
app.use("/subtree", subtree_routes);
app.use("/pay", payment_routes);

mongoose.connect(process.env.MAIN_CLUSTER, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false }, (err) => {
    if (!err) {
        app.listen(constants.port, (err) => {
            console.log(`Server listening at port : ` + constants.port);
            let cronTime = jobs.getDailyCronTime();
            jobs.dailyJob.setTime(cronTime);
            if (process.env.IS_PROD) {
                console.log("Jobs Started");
                jobs.dailyJob.start();
                jobs.hourlyJob.start();
            }
        })
    }
    else {
        console.log(err);
    }
});

//Testing Job
// jobs.triggerDailyJob();

if (process.env.IS_PROD) {
    var doc = sheetUtils.getDoc();
    doc.useServiceAccountAuth(sheetCreds).then(function (err) {
        if (err)
            console.log(err);
        console.log("Google Auth Success");
    });
}


app.get("/", (req, res) => {
    res.send("Hello Babji, Nice Try !");
})
