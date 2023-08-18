var sheetUtils = require('./Util');
var doc = sheetUtils.getDoc();

var addDailyJob = async function(obj){
    await doc.loadInfo();
    let sheet = doc.sheetsByIndex[0];
    await sheet.addRow(obj);
}

module.exports.addDailyJob = addDailyJob;