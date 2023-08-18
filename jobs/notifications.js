var moment = require('moment');
const OneSignal = require('onesignal-node');
const oneSignalClient = new OneSignal.Client('1995c828-4bd1-4d15-ab4b-427b65d477df', 'YzAyZjUyNzktOGYwNi00MTI0LTg5MmYtN2QxYmQzNmEzNTg5');

const constants = require('../utils/constants');
const asyncRedis = require("async-redis");
const redisClient = asyncRedis.createClient(process.env.REDIS_STORE);

async function sendNotification(heading, url, content, deviceIds, redisDetails) {
    // deviceIds = ["939fcf8ce10e65c4", "0aa31893167992fe"];
    const notification = {
        headings: {
            "en": heading
        },
        "delayed_option": "timezone",
        "delivery_time_of_day": "7:00AM",
        "data": {
            "params": url
        },
        contents: {
            'en': content,
        },
        include_external_user_ids: deviceIds
    };

    try {
        const response = await oneSignalClient.createNotification(notification);
        if (response.body.id) {
            redisDetails.recipients = response.body.recipients;
            redisDetails.notification = notification;
            if (process.env.IS_PROD)
                redisClient.set(response.body.id, JSON.stringify(redisDetails));
        }
    }
    catch (err) {
        console.log(err);
    }

    //Redis Insertion by Time Series
    // await redisClient.zadd("events", unixTime, {"name":"Test4"});
    // let x = await redisClient.zrangebyscore("events", "-inf", unixTime);
}

function frameBdayMsg(userObj) {
    let now = moment();
    let aniv = now.year() - userObj.dob_y;
    let msg = "";

    //For Alive People
    if (!userObj.is_died) {
        msg = "Celebrating " + aniv + "th Birth Anniversary"
    }
    else {
        msg = aniv + "th Birth Anniversary"
    }
    return msg;
}

function frameDeathMsg(userObj) {
    let now = moment();
    let aniv = now.year() - userObj.dod_y;
    let msg = "";

    let gender = (userObj.gender === '1') ? 'him' : 'her';
    msg = `Remembering ${gender} on ${aniv}th Memorial day`;

    return msg;
}

function frameTimelineMsg(userObj, event) {
    let now = moment();
    let aniv = now.year() - event.y;

    let msg = `Timeline : ${event.title} - ${aniv} years ago`;

    return msg;
}

async function createBirthNotification(userObj, familyDetails, deviceIds, redisDetails) {

    let url = `/${familyDetails.surname}/events`;
    let content = frameBdayMsg(userObj);
    await sendNotification(userObj.name, url, content, deviceIds, redisDetails);

}

async function createDeathNotification(userObj, familyDetails, deviceIds, redisDetails) {

    let url = `/${familyDetails.surname}/events`;
    let content = frameDeathMsg(userObj);
    await sendNotification(userObj.name, url, content, deviceIds, redisDetails);
}


async function createTimelineNotification(userObj, familyDetails, deviceIds, event, redisDetails) {

    redisDetails.event = event;
    let url = `/${familyDetails.surname}/events`;
    let content = frameTimelineMsg(userObj, event);
    await sendNotification(userObj.name, url, content, deviceIds, redisDetails);
}

module.exports.createBirthNotification = createBirthNotification;
module.exports.createDeathNotification = createDeathNotification;
module.exports.createTimelineNotification = createTimelineNotification;