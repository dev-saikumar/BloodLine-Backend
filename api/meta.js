var express = require('express');
let router = express.Router();
var MetaModel = require('../models/models').MetaModel;
var TressModel = require('../models/models').TreesModel;
var MembersModel = require('../models/models').MembersModel;
var ImagesModel = require('../models/models').ImagesModel;
var SubTreeMapperModel = require('../models/models').SubTreeMapperModel;
var SubTreesModel = require('../models/models').SubTreesModel;
var MiddleWare = require("../utils/middleware");
var _ = require('lodash');
var helper = require('../utils/helper');
var Constants = require('../utils/constants');

router.post("/add", async function (req, res) {
    try {
        req.body.created_at = helper.getISTTime();
        req.body.updated_at = req.body.created_at;
        let data = await MetaModel().create(req.body);
        await helper.createSession(req, data._id);
        res.send(data);
    }
    catch (err) {
        res.status(403).send("Surname Already Exists !");
    };
});

router.get("/get/:surname", MiddleWare.notForViewOnly, MiddleWare.checkParamSession, function (req, res) {
    MetaModel().find({ surname: req.params.surname }, function (err, data) {
        if (err) {
            res.send(err);
        }
        else {
            data = data[0];
            data = JSON.parse(JSON.stringify(data));
            res.send(data);
        }
    });
});

router.get("/", async function (req, res) {
    const options = {
        page: 1,
        limit: 10,
        sort: { _id: 1 },
        projection: { "pin": 0, "view_pin": 0 },
        collation: {
            locale: 'en'
        },
        lean: true
    };

    let filterQuery = {};
    if(req.query.type && req.query.type == Constants.family.type.DEMO){
        filterQuery.celeb = true;
    }
    else if(req.query.type && req.query.type == Constants.family.type.SUPER){
        filterQuery.b_coins = { $ne: null };
        options.sort = { b_coins : 1 }
    }
    options.page = _.get(req, "query.page", 1);
    let result = await MetaModel().paginate(filterQuery, options);

    let skipCurFamily = (options.page === 1 && req.query.type != 2 ) ? false : true;
    if (req.session.family_id && !skipCurFamily) {
        let cur_family = await MetaModel().find({ "_id": req.session.family_id }, { "pin": 0, "view_pin": 0 }).lean();
        result.docs = _.concat(cur_family, result.docs);
        if(req.query.type === '3' && !cur_family[0].b_coins){
            skipCurFamily = true;
        }   
    }

    let completeRes = helper.createFamilyListing(result.docs, req, skipCurFamily);
    completeRes.total_families = result.totalDocs;
    completeRes.next_page = result.nextPage;
    completeRes.has_next = result.hasNextPage;
    res.send(completeRes);
});

router.get("/search", function (req, res) {
    MetaModel().find({ "$or": [{ title: { $regex: req.query.text, $options: "i" } }, { surname: { $regex: req.query.text, $options: "i" } }] }, { "pin": 0, "view_pin": 0 }).limit(10).exec(function (err, docs) {
        if (err) {
            res.send(err);
        }
        else {
            let completeRes = helper.createFamilyListing(docs, req);
            res.send(completeRes);
        }
    });
});

router.put("/update", function (req, res) {
    if (req.body._id == req.session.family_id) {
        req.body.updated_at = helper.getISTTime();
        MetaModel().updateOne({ _id: req.body._id }, req.body, function (err, data) {
            if (err) {
                res.send(err);
            }
            else {
                res.send(data);
            }
        });
    }
    else {
        res.status(403).send("No Access to this tree");
    }
});

router.put("/stepper", MiddleWare.checkBodyId, async function (req, res) {
    let stepperObj = { "stepper": req.body.stepper };
    await MetaModel().updateOne({ _id: req.body.family_id }, { "$set": stepperObj });
    res.send("Success");
});

router.put("/:surname/update-title", MiddleWare.checkParamSession, async function (req, res) {
    let metaObj = { "title": req.body.title };
    if (req.body.subtree_id) {
        await SubTreesModel().findOneAndUpdate({ _id: req.body.subtree_id }, { "$set": metaObj });
    } else {
        await MetaModel().findOneAndUpdate({ _id: req.family_id }, { "$set": metaObj });
    }
    res.send(req.body.title);
});

router.delete("/", MiddleWare.checkBodySession, async function (req, res) {
    let data = await MetaModel().findOneAndDelete({ "surname": req.body.surname });

    let allPromises = [];

    allPromises.push(MembersModel().deleteMany({ "family_id": data._id }));
    allPromises.push(TressModel().deleteOne({ "family_id": data._id }));
    allPromises.push(ImagesModel().deleteOne({ "family_id": data._id }));
    allPromises.push(SubTreesModel().deleteMany({ "main_tree_id": data._id }));
    allPromises.push(SubTreeMapperModel().deleteMany({ "id": data._id }));

    Promise.all(allPromises).then();
    req.session.destroy();
    res.send("Succesfully Deleted");
});

module.exports = router; 
