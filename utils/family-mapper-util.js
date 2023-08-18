var TreesModel = require('../models/models').TreesModel;
var MembersModel = require('../models/models').MembersModel;
var ImagesModel = require('../models/models').ImagesModel;
var SubTreeMapperModel = require('../models/models').SubTreeMapperModel;
var SubTreesModel = require('../models/models').SubTreesModel;
var Util = require('./helper');
var constants = require('../utils/constants');
var MiddleWare = require("../utils/middleware");
var mongoose = require("mongoose");
var _ = require("lodash");


var removeFamilyLinkages = async function (allChildren, family_id, imageDel, byPassAllChildren) {
    let allLinkedTreeNodes;
    if(byPassAllChildren){
        allLinkedTreeNodes = byPassAllChildren;
    }
    else{
        allLinkedTreeNodes = await MembersModel().find({ _id: { $in: allChildren }, linked_tree: { $ne: null } }).lean();
    }

    if (allLinkedTreeNodes.length > 0) {
        let familyTreeMapping = await SubTreeMapperModel().find({ id: family_id }).lean();
        familyTreeMapping = familyTreeMapping[0];
        let allDeletableSubTrees = new Set();
        for (let eachLinkedNode of allLinkedTreeNodes) {
            allDeletableSubTrees.add(eachLinkedNode.linked_tree);
            let parentSubtree = Util.findParent(familyTreeMapping, eachLinkedNode.linked_tree);
            Util.findAllChildren(parentSubtree, allDeletableSubTrees);
        }
        let allPromises = [];
        Util.deleteAllMappingNodes(familyTreeMapping, allDeletableSubTrees);
        allPromises.push(SubTreeMapperModel().findOneAndUpdate({ id: family_id }, familyTreeMapping));

        allDeletableSubTrees = Array.from(allDeletableSubTrees);

        let allMembersIds = await MembersModel().find({ "subtree_id": { $in: allDeletableSubTrees } }, { "_id": 1 }).lean();
        for (let eachMember of allMembersIds) {
            imageDel[eachMember._id] = 1;
        }
        allPromises.push(SubTreesModel().deleteMany({ "_id": { $in: allDeletableSubTrees } }));
        allPromises.push(MembersModel().deleteMany({ "subtree_id": { $in: allDeletableSubTrees } }));
        Promise.all(allPromises).then();
    }
}

module.exports.removeFamilyLinkages = removeFamilyLinkages;