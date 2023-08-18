const mongoose = require('mongoose');

let conn = mongoose.createConnection(process.env.DEVICES_STORE, { useNewUrlParser: true, useUnifiedTopology: true ,useFindAndModify : false});

module.exports = conn;