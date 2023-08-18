const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

var schema = {};
schema.metadata = Schema({
    title: String,
    surname: { type: String, unique: true },
    created_at: String,
    updated_at: String,
    pin: String,
    is_private : Boolean,
    stepper: Number
}, { strict: false });

schema.dummy = Schema({
     
}, { strict: false });

schema.trees = Schema({
     
}, { strict: false });

schema.members = Schema({
     
}, { strict: false });

schema.images = Schema({
     
}, { strict: false });

schema.subtrees = Schema({
     
}, { strict: false });

schema.subtreemap = Schema({
     
}, { strict: false });

schema.payment = Schema({
     
}, { strict: false });

schema.metadata.plugin(mongoosePaginate);
module.exports = schema;     