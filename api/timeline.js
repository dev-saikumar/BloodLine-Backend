var express = require('express');
let router = express.Router({ mergeParams: true });
var MembersModel = require('../models/models').MembersModel;
var uniqid = require('uniqid');
var MiddleWare = require("../utils/middleware");
var Util = require("../utils/helper");

function getTimelinePostObj(body) {
    let obj = {};
    obj.title = body.title;
    obj.content = body.content;
    obj.id = uniqid();
    Util.makeTimelineDateObj(body, obj, true, false);
    if (body.shared_with) {
        obj.shared_with = body.shared_with;
    }
    return obj;
}

function getTimelinePutObj(body) {
    let obj = {};
    obj["timeline.$.title"] = body.title;
    obj["timeline.$.content"] = body.content;
    obj["timeline.$.id"] = body.id;
    Util.makeTimelineDateObj(body, obj, true, true);
    if (body.shared_with) {
        obj["timeline.$.shared_with"] = body.shared_with;
    }
    return obj;
}

router.post("/", MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let dbObj = getTimelinePostObj(req.body);
    await MembersModel().findOneAndUpdate({ "_id": req.params.person_id , "family_id": req.family_id}, { "$push": { "timeline": dbObj } });
    res.send(dbObj.id);
});

router.get("/", MiddleWare.checkParamSession, async function (req, res) {
    let family_id = req.family_id;
    let resData = await MembersModel().find({ "_id": req.params.person_id, "family_id": family_id }, { "timeline": 1, "name": 1, "short_name": 1, "dob_y": 1, "dob_m": 1, "dob_d": 1, "dod_d": 1, "dod_m": 1, "dod_y": 1 }).lean();
    Util.makeDOBObj(resData[0], resData[0], false);
    let sharedTimelines = await MembersModel().find({ "timeline.shared_with": req.params.person_id, "family_id": family_id }, { "timeline": 1 }).lean();
    for (let i = 0; i < sharedTimelines.length; i++) {
        let singlePersonTimeLine = sharedTimelines[i];
        for (eachEvent of singlePersonTimeLine.timeline) {
            if (eachEvent.shared_with && eachEvent.shared_with.indexOf(req.params.person_id) != -1) {
                eachEvent.shared_by = singlePersonTimeLine._id;
                if (!resData[0].timeline) {
                    resData[0].timeline = [];
                }
                resData[0].timeline.push(eachEvent);
            }
        }
    }
    if(resData[0].timeline){
        for(let eachEvent of resData[0].timeline){
            Util.makeTimelineDateObj(eachEvent, eachEvent, false, false);
        }
    }
    res.send(resData);
});

router.put("/", MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let dbObj = getTimelinePutObj(req.body);
    await MembersModel().updateOne({ "_id": req.params.person_id, "family_id": req.family_id,"timeline.id": req.body.id }, { "$set": dbObj });
    res.send("Updated");
});

router.delete("/", MiddleWare.checkParamSession, MiddleWare.notForViewOnly, function (req, res) {
    MembersModel().updateOne({ "_id": req.params.person_id, "family_id": req.family_id }, { $pull: { "timeline": { id: req.body.id } } }, function (err, data) {
        if (err) {
            res.send(err);
        }
        else {
            res.send("Deleted");
        }
    });
});

module.exports = router;  