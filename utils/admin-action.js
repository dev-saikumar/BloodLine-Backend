var MetaModel = require('../models/models').MetaModel;
const mongoose = require('mongoose');
var _ = require('lodash');

// let  allChildren = [ "121232", "23212123","321312312"];
// allChildren = _.zipObject(allChildren, _.fill(Array(allChildren.length), 1));
// console.log(allChildren);

// class AdminActions {
//     static async deleteFamily(surname) {
//         await MetaModel().findOneAndDelete({ "surname": surname });
//         mongoose.connection.db.dropCollection(surname, function (err, result) {
//             if (err) {
//                 console.log(err);
//             }
//             else {
//                 console.log("Deleted");
//             }
//         });
//     }
// }

// Delete Multiple Collections
// mongoose.connection.db.listCollections().toArray(function (err, names) {
//     console.log(names.length);
//     for(let i=0;i<names.length;i++){
//         if(names[i].name == 'medam' || names[i].name == 'metadata' || names[i].name == 'nehru'){
//             names.splice(i,1);
//         }
//     }
//     for(let i = 0;i < names.length;i++){
//         mongoose.connection.db.dropCollection(names[i].name, function(err, result) {
//             console.log("Deleted");
//         });
//     }
//     console.log(names.length);
// });
// module.exports = AdminActions;