const mongoose = require('mongoose');
const devices_mong = require('../db/devices-db');
const schema = require('./schema');
const devices_schema = require('./devices-schema');

module.exports.MetaModel = function () {
    return mongoose.model('metadata', schema.metadata, 'metadata');
}

// module.exports.MembersModel = function(){
//     return mongoose.model('dummy', schema.dummy, 'dummy');
// }

module.exports.TreesModel = function(){
    return mongoose.model('trees', schema.trees, 'trees');
}

module.exports.MembersModel = function(){
    return mongoose.model('members', schema.members, 'members');
}

module.exports.ImagesModel = function(){
    return mongoose.model('images', schema.images, 'images');
}

module.exports.SubTreesModel = function(){
    return mongoose.model('subtrees', schema.subtrees, 'subtrees');
}

module.exports.SubTreeMapperModel = function(){
    return mongoose.model('subtreemap', schema.subtreemap, 'subtreemap');
}

module.exports.PaymentModel = function(){
    return mongoose.model('payment', schema.payment, 'payment');
}

module.exports.DevicesModel = function(){
    return devices_mong.model('familymap', devices_schema.devices, 'familymap');
}