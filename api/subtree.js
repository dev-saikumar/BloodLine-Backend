var express = require('express');
let router = express.Router({ mergeParams: true });
var SubTreesModel = require('../models/models').SubTreesModel;
var MembersModel = require('../models/models').MembersModel;
var ImagesModel = require('../models/models').ImagesModel;
var SubTreeMapperModel = require('../models/models').SubTreeMapperModel;
var MiddleWare = require("../utils/middleware");
var Helper = require("../utils/helper");
var constants = require('../utils/constants');
var FamilyMapperUtil = require('../utils/family-mapper-util');

var _ = require("lodash");


//Adding Partner Parent
router.post("/:surname/partner-parent", async function (req, res) {
    let subtreeObj = {};
    req.body.main_tree_id = Helper.getMongoObjectId(req.body.main_tree_id);
    subtreeObj.main_tree_id = req.body.main_tree_id;
    subtreeObj.member_id = req.body.child_id;

    let parentUserObj = Helper.getUserObj(req, subtreeObj.main_tree_id);
    parentUserObj = await MembersModel().create(parentUserObj);

    let subtree = {};
    subtree.id = parentUserObj._id;
    subtree.name = parentUserObj.short_name;

    subtree.children = [
        {
            id: req.body.child_id,
            way_point_node: true
        }
    ];

    subtreeObj.tree = subtree;
    subtreeObj = await SubTreesModel().create(subtreeObj);
    
    let familyTreeMapper = await SubTreeMapperModel().find({ id: req.body.main_tree_id }).lean();
    familyTreeMapper = familyTreeMapper[0];

    //Adding Subtree to Main-tree
    if (!req.body.subtree_id) {

        if (familyTreeMapper) {
            familyTreeMapper.children.push({ id: subtreeObj._id });
        }
        else {
            familyTreeMapper = {};
            familyTreeMapper.id = req.body.main_tree_id;
            familyTreeMapper.children = [
                {
                    id: subtreeObj._id
                }
            ]
        }
    }

    //Adding Subtree to Subtree
    else {
        let parent = Helper.findParent(familyTreeMapper, req.body.subtree_id);
        if(!parent.children){
            parent.children = [];
        }
        parent.children.push({ id: subtreeObj._id });
    }

    let updateChild = {};
    updateChild.linked_tree = subtreeObj._id;
    let updateParent = {};
    updateParent.subtree_id = subtreeObj._id;

    let allPromises = []
    allPromises.push(MembersModel().findOneAndUpdate({ "_id": req.body.child_id }, { "$set": updateChild }));
    allPromises.push(MembersModel().findOneAndUpdate({ "_id": parentUserObj._id }, { "$set": updateParent }));
    allPromises.push(SubTreeMapperModel().findOneAndUpdate({ id: familyTreeMapper.id }, familyTreeMapper, { "upsert": true }));
    Promise.all(allPromises).then();
    res.send(subtreeObj._id);
});

//Get the Subtree
router.get("/:surname/:subtree_id", async function (req, res) {
    let returnData = {};
    let subtree = await SubTreesModel().find({ _id: req.params.subtree_id }).lean();
    subtree = subtree[0];
    let memberData = await MembersModel().find({ _id: subtree.member_id }).lean();
    memberData = memberData[0];

    returnData.member_data = memberData;
    returnData.tree_data = subtree;

    res.send(returnData);
});

//Adding Member to Subtree
router.post("/:surname/:subtree_id", MiddleWare.checkSurname, MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let subtree_id = Helper.getMongoObjectId(req.params.subtree_id);
    let main_tree_id = req.family_id;
    let subtreeObj = await SubTreesModel().find({ _id: subtree_id }).lean();
    subtreeObj = subtreeObj[0];

    let userData = {};
    userData = Helper.getUserObj(req, main_tree_id);
    userData.subtree_id = subtree_id;

    if (req.body.type == constants.relation.soul_mate) {
        userData.is_mate = true;
    }
    let updatedUserData = await MembersModel().create(userData);

    let newTree = {};
    newTree.name = updatedUserData.short_name;
    newTree.id = updatedUserData._id;

    if (req.body.parent_id) {

        //Adding Parent to Root
        if (req.body.type == 0) {
            newTree.children = [];
            newTree.children.push(subtreeObj.tree);
            subtreeObj.tree = newTree;
            let updateChild = {};
            updateChild.parent_id = updatedUserData._id;
            await MembersModel().findOneAndUpdate({ "_id": req.body.parent_id }, { "$set": updateChild });
        }

        //Adding Children or Mate
        else {
            let parent = Helper.findParent(subtreeObj.tree, userData.parent_id);
            Helper.addUser(newTree, parent, req.body.type);
        }
    }
    await SubTreesModel().findOneAndUpdate({ _id: subtree_id }, subtreeObj, { "upsert": true });
    res.send(subtreeObj.tree);
});

//Delete Member of Subtree
router.delete("/:surname/:subtree_id/:person_id", MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let main_tree_id = req.family_id;
    let subtree_id = Helper.getMongoObjectId(req.params.subtree_id);
    let userObj = await MembersModel().findOneAndDelete({ _id: Helper.getMongoObjectId(req.params.person_id), "subtree_id": subtree_id }).lean();

    let newTreeObj = await SubTreesModel().find({ _id: subtree_id }).lean();
    newTreeObj = newTreeObj[0];

    let id = (userObj.is_mate) ? userObj.parent_id : userObj._id;
    let parent = Helper.findParent(newTreeObj.tree, id);

    let imageDel = {};

    let allPromises = [];
    //For Mate
    if (userObj.is_mate) {
        for (let i = 0; i < parent.mate.length; i++) {
            if (userObj._id.equals(parent.mate[i].id)) {
                parent.mate.splice(i, 1);
            }
        }
        if (parent.mate.length == 0) {
            delete parent.mate;
        }
        allPromises.push(SubTreesModel().findOneAndUpdate({ _id: subtree_id }, newTreeObj));

        if(userObj.linked_tree){
            let byPassArray = [
                {
                    linked_tree: userObj.linked_tree
                }
            ];
            allPromises.push(FamilyMapperUtil.removeFamilyLinkages([], req.family_id, imageDel, byPassArray));
        }
    }
    //For Root
    else if (!userObj.parent_id || userObj.parent_id == "") {
        allPromises.push(MembersModel().update({ _id: newTreeObj.member_id }, { $unset: { linked_tree: 1 } }));
        newTreeObj.tree = {};

        let byPassArray = [
            {
                linked_tree: subtree_id
            }
        ];
        allPromises.push(FamilyMapperUtil.removeFamilyLinkages([], req.family_id, imageDel, byPassArray));
    }
    //For Normal Cases
    else {
        let allChildren = new Set();
        Helper.findAllChildren(parent, allChildren);
        let wayOutNode = Helper.findWayOutNode(parent);
        if (wayOutNode) {
            allChildren.delete(wayOutNode.id);
        }
        allChildren = Array.from(allChildren);
        
        imageDel = _.zipObject(allChildren, _.fill(Array(allChildren.length), 1));

        parent = Helper.findParent(newTreeObj.tree, userObj.parent_id);
        parent.children = parent.children.filter(child => !(child.id).equals(userObj._id));

        if (wayOutNode) {
            parent.children.push(wayOutNode);
        }
        if (parent.children.length == 0) {
            delete parent.children;
        }
        allPromises.push(SubTreesModel().findOneAndUpdate({ _id: subtree_id }, newTreeObj));

        await FamilyMapperUtil.removeFamilyLinkages(allChildren, req.family_id, imageDel);

        allPromises.push(MembersModel().deleteMany({ "_id": { $in: allChildren } }));
    }

    imageDel[userObj._id] = 1;
    allPromises.push(ImagesModel().updateOne({ "family_id": main_tree_id }, { "$unset": imageDel }));

    Promise.all(allPromises).then();
    res.send(newTreeObj.tree);
});

//Updating a Member
router.put("/:surname/:subtree_id/:person_id", MiddleWare.checkSurname, MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let main_tree_id = req.metaData[0]._id;
    let subtree_id = Helper.getMongoObjectId(req.params.subtree_id);

    let newTreeObj = await SubTreesModel().find({ _id: subtree_id }).lean();
    newTreeObj = newTreeObj[0];

    let userData = {};
    userData = Helper.getUserObj(req, main_tree_id, true);
    userData.subtree_id = subtree_id;

    let updatedUserData = await MembersModel().findOneAndUpdate({ "_id": userData._id, "subtree_id": subtree_id }, { "$set": userData }).lean();

    let id;
    if (updatedUserData.is_mate) {
        id = updatedUserData.parent_id;
    }
    else {
        id = updatedUserData._id;
    }

    let parent = Helper.findParent(newTreeObj.tree, id);
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

    await SubTreesModel().findOneAndUpdate({ _id: subtree_id }, newTreeObj);
    res.send("Updated");
});

//Swap a Sibling
router.put("/:surname/:subtree_id/person/swap", MiddleWare.checkSurname, MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let subtree_id = Helper.getMongoObjectId(req.params.subtree_id);
    let person_id = req.body.id;
    let order = req.body.order;
    
    let treeCol = await SubTreesModel().find({ _id: subtree_id }).lean();
    treeCol = treeCol[0];

    let allSiblings = [];
    allSiblings = Helper.findAllSiblings(treeCol.tree, person_id, treeCol.tree);
    let parentTree = Helper.findRealParent(treeCol.tree, person_id, treeCol.tree);

    for(let i=0; i < order.length; i++){
        parentTree.children[i] = allSiblings[order[i]];
    }

    await SubTreesModel().findOneAndUpdate({ _id: subtree_id }, treeCol);
    res.send(treeCol.tree);
});

module.exports = router;  