var express = require('express');
let router = express.Router({ mergeParams: true });
var MembersModel = require('../models/models').MembersModel;
var mongoose = require("mongoose");
var Util = require("../utils/helper");

function birthEvent(events, doc){
    let event = {};
    event.type = 1;
    event.name = doc.name;
    Util.makeDOBObj(doc, event, false);
    event._id = doc._id;
    event.is_died = doc.is_died;
    event.gender = doc.gender;

    if(doc.subtree_id){
        event.subtree_id = doc.subtree_id;
    }

    events.push(event);
}

function deathEvent(events, doc){
    let event = {};
    event.type = 2;
    event.name = doc.name;
    Util.makeDOBObj(doc, event, false);
    event._id = doc._id;
    event.is_died = doc.is_died;
    event.gender = doc.gender;

    if(doc.subtree_id){
        event.subtree_id = doc.subtree_id;
    }

    events.push(event);
}

function timelineEvent(events, doc, timelineEvent){
    let event = {};
    event.type = 3;
    event.name = doc.name;
    Util.makeTimelineDateObj(timelineEvent, event, false, false);
    event._id = doc._id;
    event.is_died = doc.is_died;
    event.gender = doc.gender;

    if(doc.subtree_id){
        event.subtree_id = doc.subtree_id;
    }

    event.title = timelineEvent.title;
    event.content = timelineEvent.content;
    event.event_id = timelineEvent.id;
    events.push(event);
}


router.get("/", async function (req, res) {
    let date = req.query.date.split("-");
    let day = parseInt(date[2]);
    let month = parseInt(date[1]);
    let family_id = mongoose.Types.ObjectId(req.session.family_id);
    let events = [];
    
    MembersModel().find({ "$or": [{ dob_d: day, dob_m: month, "family_id": family_id}, { dod_d: day, dod_m: month, "family_id": family_id }, { "timeline.d": day, "timeline.m": month, "family_id": family_id }] }, {}).exec(function (err, docs) {
        if(err){
            console.log(err);
        }

        for(let doc of docs){
            doc = doc._doc;
            if(doc.dob_d === day && doc.dob_m === month){
                birthEvent(events, doc);
            } 
            if(doc.dod_d === day && doc.dod_m === month){
                deathEvent(events, doc);
            }

            if(doc.timeline){
                for(let event of doc.timeline){
                    if(event.d === day && event.m === month){
                        timelineEvent(events, doc, event);
                    }
                }
            }

        }
        res.send(events);
    });
});

module.exports = router;  