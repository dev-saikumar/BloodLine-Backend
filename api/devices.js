var express = require('express');
let router = express.Router();
var DevicesModel = require('../models/models').DevicesModel;
var MetaModel = require('../models/models').MetaModel;

router.post("/", async function (req, res) {
    let filter = {device_id : req.body.device_id};
    let resData = await DevicesModel().findOneAndUpdate(filter, req.body, {upsert:true});
    res.send(resData);
});

router.put("/", async function (req, res) {
    let oldId = req.body.old_id;
    delete req.body.old_id;
    let filter = {device_id : oldId};
    let resData = await DevicesModel().findOneAndUpdate(filter, req.body, {upsert:true});
    res.send(resData);
});

router.get("/:device_id", async function (req, res) {
    let device_id = req.params.device_id;
    let filter = {device_id : device_id};
    let resData = await DevicesModel().findOne(filter).lean();
    
    let familyIds = [];
    for(eachFamily of resData.families){
        familyIds.push(eachFamily.family_id);
    }

    let allFamilies = await MetaModel().find({ "_id": { $in : familyIds }},{"pin": 0});
    res.send(allFamilies);
});

module.exports = router;  