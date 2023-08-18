var MetaModel = require('../models/models').MetaModel;
var _ = require('lodash');
var mongoose = require("mongoose");

class MiddleWare {
    static async checkSurname(req, res, next) {
        let metaData = await MetaModel().find({ "surname": req.params.surname }, { "pin": 0 });
        if (metaData.length == 0) {
            res.status(404).send("No Family Tree like that");
        }
        else {
            req.metaData = metaData;
            req.family_id = metaData[0]._id;
            next();
        }
    }

    static async checkAndAttachSession(req, res, next){
        if (req.session.surname) {
            let metaData = await MetaModel().find({ "surname": req.session.surname }, { "pin": 0 });
            if (metaData.length == 0) {
                res.status(404).send("No Family Tree like that");
            }
            else {
                req.metaData = metaData;
                req.family_id = metaData[0]._id;
                next();
            }
        }
        else {
            res.status(403).send("You didn't log in. Please Login to your tree and try again.");
        }
    }

    static async checkEntrySession(req, res, next) {
        const parsedCookies = {};
        if (req.headers.cookie) {
            const rawCookies = req.headers.cookie.split('; ');
            rawCookies.forEach(rawCookie => {
                const parsedCookie = rawCookie.split('=');
                parsedCookies[parsedCookie[0]] = parsedCookie[1];
            });
        }
        //Has Session
        if (req.session.surname && req.session.surname == req.params.surname) {
            req.family_id = req.session.family_id;
            next();
        }
        //For PDF Puppy Bypass
        else if (parsedCookies.puppy_bypass == "jai_pass") {
            let metaData = await MetaModel().find({ "surname": req.params.surname }, { "pin": 0 }).lean();
            req.family_id = metaData[0]._id;
            next();
        }
        //No Session but a Celeb Family
        else {
            let metaData = await MetaModel().find({ "surname": req.params.surname }, { "pin": 0 }).lean();
            if (!_.isEmpty(metaData) && metaData[0].celeb) {
                req.family_id = metaData[0]._id;
                next();
            }
            else if (!_.isEmpty(metaData)) {
                res.status(403).send(metaData);
            }
            else {
                res.status(404).send("There is no such FamilyTree Boy..!");
            }
        }
    }

    static async checkParamSession(req, res, next) {
        if (req.session.surname && req.session.surname == req.params.surname) {
            req.family_id = mongoose.Types.ObjectId(req.session.family_id);
            next();
        }
        else {
            res.status(403).send("You don't have access to touch this tree");
        }
    }

    static async checkSessionPassive(req, res, next) {
        req.has_session = (req.session.surname && req.session.surname == req.params.surname) ? true : false;
        if(req.session.view_only){
            req.view_only = true
        }
        next();
    }


    static async checkBodySession(req, res, next) {
        if (req.session.surname && req.session.surname == req.body.surname) {
            next();
        }
        else {
            res.status(403).send("You don't have access to touch this tree");
        }
    }

    static async checkBodyId(req, res, next) {
        if (req.session.family_id && req.session.family_id == req.body.family_id) {
            next();
        }
        else {
            res.status(403).send("You don't have access to touch this tree");
        }
    }

    static async notForViewOnly(req, res, next) {
        if (_.get(req.session,'view_only')) {
            res.status(403).send("View Only Users Don't have this access.");
        }
        else {
            next();
        }
    }
}

module.exports = MiddleWare;