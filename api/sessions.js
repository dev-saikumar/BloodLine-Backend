var express = require('express');
let router = express.Router();
var MetaModel = require('../models/models').MetaModel;
var helper = require('../utils/helper');


router.post("/", function (req, res) {
    MetaModel().find({ surname: req.body.surname }, async function (err, data) {
        if (err) {
            res.send(err);
        }
        else {
            data = JSON.parse(JSON.stringify(data));
            data = data[0];
            if (data.pin == req.body.pin) {
                await helper.createSession(req, data._id);
                res.send({view_only : false});
            }
            else if(data.view_pin == req.body.pin){
                await helper.createSession(req, data._id, true);
                res.send({view_only : true});
            }
            else {
                res.status(403).send("Wrong Pin Bro");
            }
        }
    });
});

module.exports = router;  