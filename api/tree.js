var express = require('express');
let router = express.Router();
var TreesModel = require('../models/models').TreesModel;
var MembersModel = require('../models/models').MembersModel;
var ImagesModel = require('../models/models').ImagesModel;
var SubTreeMapperModel = require('../models/models').SubTreeMapperModel;
var SubTreesModel = require('../models/models').SubTreesModel;
var Util = require('../utils/helper');
var FamilyMapperUtil = require('../utils/family-mapper-util');
var constants = require('../utils/constants');
var MiddleWare = require("../utils/middleware");
var mongoose = require("mongoose");
var _ = require("lodash");

router.get("/:surname", MiddleWare.checkSurname, MiddleWare.checkSessionPassive);

router.get("/:surname", async function (req, res) {
    let treeCol = await TreesModel().find({ "family_id": req.metaData[0]._id });
    treeCol = JSON.parse(JSON.stringify(treeCol));
    let resData = {};
    if (treeCol.length != 0) {
        resData.tree = treeCol[0].tree;
    }
    resData.meta = req.metaData;
    if (req.has_session) {
        resData.has_session = req.has_session;
    }
    if (req.view_only) {
        resData.view_only = req.view_only;
    }
    res.status(200).send(resData);
});

//Adding Member to Tree
router.post("/:surname/person", MiddleWare.checkSurname, MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let family_id = req.metaData[0]._id;
    let treeCol = await TreesModel().find({ "family_id": family_id }).lean();

    let userData = {};
    let treeData = {};
    treeData.family_id = family_id;
    userData = Util.getUserObj(req, family_id);

    if (req.body.type == constants.relation.soul_mate) {
        userData.is_mate = true;
    }
    let updatedUserData = await MembersModel().create(userData);

    let newTree = {};
    newTree.name = updatedUserData.short_name;
    newTree.id = updatedUserData._id;

    if (treeCol.length == 0) {
        treeData.tree = newTree;
    }
    else {
        treeData = treeCol[0];
        if (req.body.parent_id) {

            //Adding Parent to Root
            if (req.body.type == 0) {
                newTree.children = [];
                newTree.children.push(treeData.tree);
                treeData.tree = newTree;
                let updateChild = {};
                updateChild.parent_id = updatedUserData._id;
                await MembersModel().findOneAndUpdate({ "_id": req.body.parent_id }, { "$set": updateChild });
            }

            //Adding Children or Mate
            else {
                let parent = Util.findParent(treeData.tree, userData.parent_id);
                Util.addUser(newTree, parent, req.body.type);
            }
        }
    }
    await TreesModel().findOneAndUpdate({ "family_id": family_id }, treeData, { "upsert": true });
    res.send(treeData.tree);
});

router.put("/:surname/person", MiddleWare.checkSurname, MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let family_id = req.metaData[0]._id;
    let treeCol = await TreesModel().find({ "family_id": family_id }).lean();

    let userData = {};
    let newTreeObj = {};
    userData = Util.getUserObj(req, family_id, true);


    let updatedUserData = await MembersModel().findOneAndUpdate({ "_id": userData._id, "family_id": family_id }, { "$set": userData }).lean();

    newTreeObj = treeCol[0];

    let id;
    if (updatedUserData.is_mate) {
        id = updatedUserData.parent_id;
    }
    else {
        id = updatedUserData._id;
    }

    let parent = Util.findParent(newTreeObj.tree, id);
    if (updatedUserData.is_mate) {
        for (mate of parent.mate) {
            if (mate.id.equals(updatedUserData._id)) {
                mate.name = userData.short_name;
                break;
            }
        }
    }
    else {
        parent.name = userData.short_name;
    }

    await TreesModel().findOneAndUpdate({ "family_id": family_id }, newTreeObj);
    res.send("Updated");
});

router.get("/:surname/person/:id", MiddleWare.checkSurname, MiddleWare.checkSessionPassive, async function (req, res) {
    try {
        let resObj = await MembersModel().find({ "_id": Util.getMongoObjectId(req.params.id), "family_id": req.family_id }).lean();
        resObj = resObj[0];
        resObj.has_session = req.has_session;
        resObj.view_only = req.view_only;
        Util.makeDOBObj(resObj, resObj, false);
        res.send(resObj);
    } catch (error) {
        res.status(404).send("No Such User Exists");
    }
});

router.delete("/:surname/person/:id", MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let family_id = req.family_id;
    let userObj = await MembersModel().findOneAndDelete({ "_id": req.params.id, "family_id": family_id }).lean();

    let treeCol = await TreesModel().find({ "family_id": family_id }).lean();
    let newTreeObj = treeCol[0];

    let id = (userObj.is_mate) ? userObj.parent_id : userObj._id;
    let parent = Util.findParent(newTreeObj.tree, id);

    let imageDel = {};
    //For Mate
    if (userObj.is_mate) {
        for (let i = 0; i < parent.mate.length; i++) {
            if (userObj._id.equals(parent.mate[i].id)) {
                parent.mate.splice(i, 1);
            }
        }
        await TreesModel().findOneAndUpdate({ "family_id": family_id }, newTreeObj);

        if(userObj.linked_tree){
            let byPassArray = [
                {
                    linked_tree: userObj.linked_tree
                }
            ];
            await FamilyMapperUtil.removeFamilyLinkages([], req.family_id, imageDel, byPassArray);
        }
    }
    //For Root
    else if (!userObj.parent_id || userObj.parent_id == "") {
        let allPromises =  [];
        allPromises.push(TreesModel().deleteMany({ "family_id": family_id }));
        allPromises.push(MembersModel().deleteMany({ "family_id": family_id }));
        allPromises.push(ImagesModel().deleteMany({ "family_id": family_id }));
        
        allPromises.push(SubTreesModel().deleteMany({ "main_tree_id": family_id}));
        allPromises.push(SubTreeMapperModel().deleteMany( {"id": family_id}));
        
        Promise.all(allPromises).then();
        newTreeObj.tree = {};
    }
    //For Normal Cases
    else {
        let allChildren = new Set();
        Util.findAllChildren(parent, allChildren);
        allChildren = Array.from(allChildren);

        imageDel = _.zipObject(allChildren, _.fill(Array(allChildren.length), 1));
        parent = Util.findParent(newTreeObj.tree, userObj.parent_id);
        parent.children = parent.children.filter(child => !(child.id).equals(userObj._id));
        if (parent.children.length == 0) {
            delete parent.children;
        }
        await TreesModel().findOneAndUpdate({ "family_id": family_id }, newTreeObj);

        await FamilyMapperUtil.removeFamilyLinkages(allChildren, req.family_id, imageDel);

        await MembersModel().deleteMany({ "_id": { $in: allChildren } });
    }
    imageDel[userObj._id] = 1;
    await ImagesModel().updateOne({ "family_id": family_id }, { "$unset": imageDel });
    res.send(newTreeObj.tree);
});

router.post("/:surname/person/:id/image", MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let family_id = req.family_id;
    let buff = new Buffer(req.body.image_data, 'base64');
    let userData = {};
    userData[req.params.id] = buff;
    await ImagesModel().findOneAndUpdate({ "family_id": family_id }, { "$set": userData }, { "upsert": true });
    res.send("uploaded");
});

router.get("/:surname/person/:id/image", MiddleWare.checkSurname, async function (req, res) {
    let family_id = req.family_id;
    let returnData = await ImagesModel().find({ "family_id": family_id }, req.params.id);
    res.send(returnData);
});

router.get("/:surname/person/:id/images", MiddleWare.checkEntrySession, async function (req, res) {
    let family_id = req.family_id;
    let returnData = await ImagesModel().find({ "family_id": mongoose.Types.ObjectId(family_id) });
    res.send(returnData);
});

//Swap a Sibling
router.put("/:surname/person/swap", MiddleWare.checkSurname, MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let family_id = req.metaData[0]._id;
    let person_id = req.body.id;
    let order = req.body.order;
    
    let treeCol = await TreesModel().find({ "family_id": family_id }).lean();
    treeCol = treeCol[0];

    let allSiblings = [];
    allSiblings = Util.findAllSiblings(treeCol.tree, person_id, treeCol.tree);
    let parentTree = Util.findRealParent(treeCol.tree, person_id, treeCol.tree);

    for(let i=0; i < order.length; i++){
        parentTree.children[i] = allSiblings[order[i]];
    }

    await TreesModel().findOneAndUpdate({ "family_id": family_id }, treeCol);
    res.send(treeCol.tree);
});

module.exports = router;  