var constants = require('./constants');
var _ = require('lodash');
var request = require('request-promise');
var mongoose = require('mongoose');
const currency = require( 'country-to-currency');

var findParent = function (tree, parentId) {
    if (!tree) {
        return;
    }
    if (typeof tree.id == "string") {
        tree.id = mongoose.Types.ObjectId(tree.id);
    }
    if (tree.id.equals(parentId)) {
        return tree;
    }
    if (tree.children) {
        for (let i = 0; i < tree.children.length; i++) {
            let z = findParent(tree.children[i], parentId); 
            if (z) {
                return z;
            }
        }
    }
}

var findRealParent = function (tree, id, parentTree) {
    if (!tree) {
        return;
    }
    if (typeof tree.id == "string") {
        tree.id = mongoose.Types.ObjectId(tree.id);
    }
    if (tree.id.equals(id)) {
        return parentTree;
    }
    if (tree.children) {
        for (let i = 0; i < tree.children.length; i++) {
            let z = findRealParent(tree.children[i], id, tree);
            if (z) {
                return z;
            }
        }
    }
}

var findAllSiblings = function (tree, id, parentTree) {
    let parent = findRealParent(tree, id, parentTree);
    let arr = [];
    for(let eachChild of parent.children){
        arr.push(eachChild);
    }
    return arr;
}

var findAllChildren = function (tree, set) {
    if (!tree) {
        return set;
    }

    if (tree.mate) {
        for(let eachMate of tree.mate){
            set.add(eachMate.id);
        }
    }
    if (tree.children) {
         for (let i = 0; i < tree.children.length; i++) {
            set.add(tree.children[i].id);
            findAllChildren(tree.children[i], set);
        }
    }
    return set;
}

var deleteAllMappingNodes = function(tree, set){
    if(!tree){
        return;
    }
    let flag = false;
    if(tree.children){
        for(let i=0; i< tree.children.length; i++){
            for( val of set.values()){
                if(val.toHexString() == tree.children[i].id.toHexString()){
                    tree.children.splice(i, 1);
                    i--;
                    flag = true;
                    break;
                }
            }
            if(!flag)
                deleteAllMappingNodes(tree.children[i], set);
        }
    }
}

var findWayOutNode = function (tree) {
    if (!tree) {
        return;
    }

    if(tree.way_point_node){
        return tree;
    }

    if (tree.children) {
        for (let i = 0; i < tree.children.length; i++) {
            let wayOutNode = findWayOutNode(tree.children[i]);
            if(wayOutNode) return wayOutNode;
        }
    }
}

var addUser = function (nodeData, parent, type) {
    if (type == constants.relation.soul_mate) {
        if (!parent.mate) {
            parent.mate = [];
        }
        parent.mate.push(nodeData);
    }
    else if (type == constants.relation.child) {
        if (!parent.children) {
            parent.children = [];
        }
        parent.children.push(nodeData);
    }
}

var getUserObj = function (req, family_id, isUpdate = false) {
    let userData = {};

    if (req.body._id) {
        userData._id = req.body._id;
    }
    userData.short_name = req.body.short_name;
    if (req.body.type != 0) {
        userData.parent_id = req.body.parent_id;
    }
    else {
        userData.parent_id = "";
    }
    if (req.body.xtra_parent_id) {
        userData.xtra_parent_id = req.body.xtra_parent_id;
    }
    userData.name = req.body.name;
    userData.family_id = family_id;
    userData.is_died = req.body.is_died;
    userData.gender = req.body.gender;
    if (req.body.mobile)
        userData.mobile = req.body.mobile;
    if (req.body.email)
        userData.email = req.body.email;
    if (req.body.address)
        userData.address = req.body.address;
    if (req.body.country)
        userData.country = req.body.country;
    if (req.body.description)
        userData.description = req.body.description;
    if (req.body.fb)
        userData.fb = req.body.fb;
    if (req.body.insta)
        userData.insta = req.body.insta;
    if (req.body.twitter)
        userData.twitter = req.body.twitter;
    if (req.body.site)
        userData.site = req.body.site;

    makeDOBObj(req.body, userData, true, isUpdate);

    return userData;
}

var makeDOBObj = function (fromUserData, toUserData, toDB, isUpdate = false) {
    if (toDB) {
        if (fromUserData.dob) {
            fromUserData.dob = fromUserData.dob.split("-");
            toUserData.dob_d = parseInt(fromUserData.dob[2]);
            toUserData.dob_m = parseInt(fromUserData.dob[1]);
            toUserData.dob_y = parseInt(fromUserData.dob[0]);
            delete fromUserData.dob;
        }
        else {
            if(isUpdate){
                toUserData.dob_d = null;
                toUserData.dob_m = null;
                toUserData.dob_y = null;
            }
        }
        if (fromUserData.died_on) {
            fromUserData.died_on = fromUserData.died_on.split("-");
            toUserData.dod_d = parseInt(fromUserData.died_on[2]);
            toUserData.dod_m = parseInt(fromUserData.died_on[1]);
            toUserData.dod_y = parseInt(fromUserData.died_on[0]);
            delete fromUserData.died_on;
        }
        else {
            if(isUpdate){
                toUserData.dod_d = null;
                toUserData.dod_m = null;
                toUserData.dod_y = null;
            }
        }
    }
    else {
        if (fromUserData.dob_d && fromUserData.dob_m) {
            toUserData.dob = `${fromUserData.dob_y.toString()}-${fromUserData.dob_m.toString()}-${fromUserData.dob_d.toString()}`;
            delete toUserData.dob_y;
            delete toUserData.dob_m;
            delete toUserData.dob_d;
        }
        if (fromUserData.dod_d) {
            toUserData.died_on = `${fromUserData.dod_y.toString()}-${fromUserData.dod_m.toString()}-${fromUserData.dod_d.toString()}`;
            delete toUserData.dod_y;
            delete toUserData.dod_m;
            delete toUserData.dod_d;
        }
    }
}

var makeTimelineDateObj = function (fromObj, toObj, toDB, isUpdate) {
    if (toDB) {
        if (isUpdate) {
            fromObj.date = fromObj.date.split("-");
            toObj["timeline.$.d"] = parseInt(fromObj.date[2]);
            toObj["timeline.$.m"] = parseInt(fromObj.date[1]);
            toObj["timeline.$.y"] = parseInt(fromObj.date[0]);
            delete fromObj.date;
        }
        else {
            fromObj.date = fromObj.date.split("-");
            toObj.d = parseInt(fromObj.date[2]);
            toObj.m = parseInt(fromObj.date[1]);
            toObj.y = parseInt(fromObj.date[0]);
            delete fromObj.date;
        }
    }
    else {
        toObj.date = `${fromObj.y.toString()}-${fromObj.m.toString()}-${fromObj.d.toString()}`;
        delete fromObj.d;
        delete fromObj.m;
        delete fromObj.y;
    }
}
var createSession = async function (req, family_id, isViewOnly) {
    req.session.surname = req.body.surname;
    req.session.family_id = family_id;

    if(isViewOnly){
        req.session.view_only = true;
    }
    else{
        req.session.view_only = false;
    }
    
    let ip_data = {};
    ip_data.ip = this.getIp(req);

    ip_data.last_accessed = this.getISTTime();
    ip_data.last_accessed = ip_data.last_accessed.toLocaleDateString() + " " + ip_data.last_accessed.toLocaleTimeString();

    req.session.last_accessed = ip_data.last_accessed;
    ip_data.meta = {};
    // let resp = await request.get("https://iplocation.zoho.com/getipinfo?ip=" + ip_data.ip + "&type=json");
    // resp = JSON.parse(resp);
    // resp.ip = ip_data.ip;
    req.session.ip_data = ip_data;

    let user_agent = _.pickBy(req.useragent);
    req.session.user_agent = user_agent;
}

var getPaymentLocationInfoByIP = async function(req){
    let response = {};
    let ip;
    ip = this.getIp(req);
    ip = process.env.LOCAL_IP || ip;
    // let ipStackURL = `http://api.ipstack.com/${ip}?access_key=${process.env.IPSTACK_KEY}`;
    let ipStackURL =  `http://ip-api.com/json/${ip}?fields=8437763`;
    let resp = await request.get(ipStackURL);
    resp = JSON.parse(resp);

    response.country_code = resp.countryCode;
    // response.currency_code = currency[resp.country_code];
    response.currency_code = resp.currency;
    return response;
}

var createFamilyListing = function (data, req, skipCurFamily) {
    let completeRes = {};
    completeRes.list = data;
    if (!_.isEmpty(req.session.family_id)) {
        completeRes.cur_family = req.session.family_id;
        let family_id = req.session.family_id;
        let curFamily = _.remove(completeRes.list, function (family) {
            return family._id == family_id;
        })
        if (!skipCurFamily) {
            if (curFamily[0])
                completeRes.list = _.concat(curFamily[0], completeRes.list);
        }
    }
    return completeRes;
}

module.exports.getIp = function (req) {
    return (req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress).split(",")[0];
}

module.exports.getISTTime = function () {
    var currentTime = new Date();
    var currentOffset = currentTime.getTimezoneOffset();
    var ISTOffset = 330;
    var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
    return ISTTime;
}

module.exports.getMongoObjectId = function (id) {
    return (typeof id == "string")?mongoose.Types.ObjectId(id):id;
}

module.exports.findParent = findParent;
module.exports.addUser = addUser;
module.exports.getUserObj = getUserObj;
module.exports.findAllChildren = findAllChildren;
module.exports.findWayOutNode = findWayOutNode;
module.exports.findRealParent = findRealParent;
module.exports.deleteAllMappingNodes = deleteAllMappingNodes;
module.exports.createSession = createSession;
module.exports.createFamilyListing = createFamilyListing;
module.exports.makeDOBObj = makeDOBObj;
module.exports.makeTimelineDateObj = makeTimelineDateObj;
module.exports.findAllSiblings = findAllSiblings;
module.exports.getPaymentLocationInfoByIP = getPaymentLocationInfoByIP;
