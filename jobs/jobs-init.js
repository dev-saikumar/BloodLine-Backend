var CronJob = require('cron').CronJob;
const CronTime = require('cron').CronTime;
var moment = require('moment');
const asyncRedis = require("async-redis");
const constants = require('../utils/constants');
var _ = require('lodash');
const redisClient = asyncRedis.createClient(process.env.REDIS_STORE);


const sheets = require('../sheet_utils/sheets');

var mongoose = require("mongoose");
var MembersModel = require('../models/models').MembersModel;
var DevicesModel = require('../models/models').DevicesModel;
var MetaModel = require('../models/models').MetaModel;


const Notifications = require('./notifications');
var http = require('http');

function buildRedisDetails(redisDetails, doc, familyDetails, devices){
    redisDetails.user = doc;
    redisDetails.family = familyDetails;
    redisDetails.devices = devices;
}

function getDailyCronTime(){
    let nextJobTime = moment();

    //Kiribati Offset
    nextJobTime.utcOffset(840);
    nextJobTime.startOf('day');
    nextJobTime.add(24, 'hours');

    let serverNow = moment();

    nextJobTime.utcOffset(serverNow.utcOffset());

    let cronTimeString = nextJobTime.second()+ " " + nextJobTime.minute()+ " " + nextJobTime.hour() + " " + nextJobTime.date()+ " " + nextJobTime.month() + " *";
    let cronTime = new CronTime(cronTimeString);

    return cronTime;
}

function triggerWakeUpJob(){
    var options = {
        host: process.env.WAKE_UP_SERVER,
        path: '/'
    };
    http.request(options).end()
}

async function triggerDailyJob(){
    let sheetObj = {};
    sheetObj['StartTime'] = moment().utcOffset(330).toString();

    if(process.env.IS_PROD){
        await redisClient.flushall();
    }
    
    let eventTime = moment();
    eventTime.add(1, 'day');
    let eventDay = eventTime.date();
    let eventMonth = eventTime.month()*1 + 1;

    MembersModel().find({ "$or": [{ dob_d: eventDay, dob_m: eventMonth }, { dod_d: eventDay, dod_m: eventMonth }, { "timeline.d": eventDay, "timeline.m": eventMonth }] }, {}).exec(async function (err, docs) {
        if(err){
            console.log(err);
        }

        sheetObj['Num Of Notifications'] = 0;

        let familyIds = new Set();
        for(let doc of docs){
            doc = doc._doc;
            familyIds.add(doc.family_id.toString());
        }

        familyIds = Array.from(familyIds);
        let allDevicesData = await DevicesModel().find({ "families.family_id": { $in : familyIds } },{"token": 0}).lean();

        let familyIdVsDeviceIds = {};
        for( singleDevice of allDevicesData ){
            for ( eachFamily of singleDevice.families ){
                if(familyIds.includes(eachFamily.family_id)){
                    if(!familyIdVsDeviceIds[eachFamily.family_id]){
                        familyIdVsDeviceIds[eachFamily.family_id] = [];
                    }
                    familyIdVsDeviceIds[eachFamily.family_id].push(singleDevice.device_id);
                }
            }
        }
        
        let deviceIdsNotFound = [];
        let deviceIdsFound = [];
        for( familyId of familyIds ){
            if( !familyIdVsDeviceIds[familyId] ){
                deviceIdsNotFound.push(familyId);
            }
            else{
                deviceIdsFound.push(familyId);
            }
        }
        
        sheetObj['Sent To Families'] = deviceIdsFound.toString();
        sheetObj['Not Sent to Families'] = deviceIdsNotFound.toString();

        let allFamilyDetails = await MetaModel().find({ "_id": { $in : deviceIdsFound }},{"pin": 0}).lean();
        
        // Create Different Types of Notifications
        for(let doc of docs){
            doc = doc._doc;
            let family_id = doc.family_id.toString();
            if(familyIdVsDeviceIds[family_id]){
                let familyDetails = _.filter(allFamilyDetails, {"_id" : mongoose.Types.ObjectId(family_id)});
                
                //Birth Notification
                if(doc.dob_d === eventDay && doc.dob_m === eventMonth){
                    let redisDetails = {};
                    buildRedisDetails(redisDetails, doc, familyDetails[0], familyIdVsDeviceIds[family_id]);

                    sheetObj['Num Of Notifications']++;
                    await Notifications.createBirthNotification(doc, familyDetails[0], familyIdVsDeviceIds[family_id], redisDetails);
                } 
                //Death Notification
                if(doc.dod_d === eventDay && doc.dod_m === eventMonth){
                    let redisDetails = {};
                    buildRedisDetails(redisDetails, doc, familyDetails[0], familyIdVsDeviceIds[family_id]);

                    sheetObj['Num Of Notifications']++;
                    await Notifications.createDeathNotification(doc, familyDetails[0], familyIdVsDeviceIds[family_id], redisDetails);
                }
                //Timeline Event
                if(doc.timeline){
                    for(let event of doc.timeline){
                        if(event.d === eventDay && event.m === eventMonth){
                            let redisDetails = {};
                            buildRedisDetails(redisDetails, doc, familyDetails[0], familyIdVsDeviceIds[family_id]);

                            sheetObj['Num Of Notifications']++;
                            await Notifications.createTimelineNotification(doc, familyDetails[0], familyIdVsDeviceIds[family_id], event, redisDetails);
                        }
                    }
                }
            }
        }
        
        let cronTime = getDailyCronTime();
        dailyJob.setTime(cronTime);
        dailyJob.start();
        
        sheetObj['EndTime'] = moment().utcOffset(330).toString();
        sheetObj['Next Run Time'] = dailyJob.nextDate().utcOffset(330).toString();
        
        //Write to Google Sheets
        if(process.env.IS_PROD)
            sheets.addDailyJob(sheetObj);
    });
}

const hourlyJob = new CronJob('* */20 * * * *', function() {
    triggerWakeUpJob();
});

const dailyJob = new CronJob('* * */2 * * *', async function() {
    triggerDailyJob();
});

module.exports.hourlyJob = hourlyJob;
module.exports.dailyJob = dailyJob;
module.exports.getDailyCronTime = getDailyCronTime;
module.exports.triggerDailyJob = triggerDailyJob;