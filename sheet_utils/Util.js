var { GoogleSpreadsheet } = require('google-spreadsheet');
var document;

module.exports.getDoc = function(){
    if(document == null){
        document = new GoogleSpreadsheet('1MfOCBF6z4nh1TADsAXIyLcLf1z2Ip8wrl-LVJ8oT9s8');
    }
    return document;
};