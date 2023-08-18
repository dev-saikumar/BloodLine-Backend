const Constants = require("../../../utils/constants");
var MetaModel = require('../../../models/models').MetaModel;

class Helper{
    constructor(){

    }

    static async addBCoins(amount, currency, family_id){
        let totalCoins = Math.ceil(amount * Constants.payment.conversions[currency]);
        let updateDoc = { "b_coins": totalCoins };
        await MetaModel().updateOne({ _id: family_id }, { "$inc": updateDoc });
    }
}
module.exports = Helper;