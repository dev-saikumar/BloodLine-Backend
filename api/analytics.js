var express = require('express');
let router = express.Router({mergeParams: true});
var MembersModel = require('../models/models').MembersModel;
var MiddleWare = require("../utils/middleware");

router.post("/", MiddleWare.checkSurname, async function (req, res) {
    let resData = await MembersModel().find({ "_id": { $in : req.body }, "family_id": req.family_id},{"gender": 1});
    res.send(resData);
});

module.exports = router;  