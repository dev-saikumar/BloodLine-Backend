var express = require('express');
let router = express.Router();
var jobs = require('../jobs/jobs-init');

router.get("/", async function (req, res) {
    let response = {};
    response.daily_job = {};
    response.wakeup_job = {};

    response.daily_job.status = jobs.dailyJob.running;
    response.daily_job.next_date = jobs.dailyJob.nextDate().toString();
   
    response.wakeup_job.status = jobs.hourlyJob.running;
    response.wakeup_job.next_date = jobs.hourlyJob.nextDate().toString();

    res.send(response);
});

router.put("/", async function (req, res) {
    let job = req.body.job;
    let toggleStatus = req.body.toggle;

    if(job === 1){ //Daily Job
        (toggleStatus === 0)?jobs.dailyJob.stop() : jobs.dailyJob.start();
    }
    else{
        (toggleStatus === 0)?jobs.hourlyJob.stop() : jobs.hourlyJob.start();
    }
    res.send("Success");
});

module.exports = router;  