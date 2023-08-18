const RazorpayInstance = require("razorpay");
const constants = require('../../../../utils/constants');
const PaymentModel = require('../../../../models/models').PaymentModel;
var crypto = require("crypto");
const Helper = require("../Helper");

class Razorpay {
    constructor(){

    }

    async createOrderContext(req) {
        return new Promise(function(resolve, reject){
            var params = {
                amount: 100 * req.body.amount,
                currency: constants.payment.INR,
                receipt: "0001", //unique id from our side
                payment_capture: '1'  //automatic  0 for manual..
              };
            Razorpay.instance.orders.create(params).then(async (data) => {
                let dataStore = {};
                dataStore = data;
                dataStore.type = "razor";
                dataStore.family_id = req.family_id;
                await PaymentModel().findOneAndUpdate({ "id": dataStore.id }, { "$set": dataStore }, { "upsert": true });
                resolve(data);
            }).catch((error) => {
                reject(error);
            })
        });
    }

    async checkAndAcceptPayment(req) {
        let body = req.body.payer_id + "|" + req.body.payment_id;
        let expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(body.toString())
            .digest('hex');
        
        
        let dataStore = {};
        let returnObj = {
            "status": "failure"
        }
        if (expectedSignature === req.body.signature){
            returnObj = {
                "status": "success"
            }
            dataStore.state = "approved"
        }
        
        dataStore.id = req.body.payer_id;
        dataStore.payment_id = req.body.payment_id;
        dataStore.signature = req.body.signature;
        let paymentDetails = await Razorpay.instance.payments.fetch(dataStore.payment_id);
        dataStore.email = paymentDetails.email;
        dataStore.contact = paymentDetails.contact;
        dataStore.method = paymentDetails.method;
        let paymentData = await PaymentModel().findOneAndUpdate({ "id": req.body.payer_id }, { "$set": dataStore });
        let amount = paymentData._doc.amount/100;
        let currency = paymentData._doc.currency;

        Helper.addBCoins(amount, currency, req.family_id);

        returnObj.surname = req.metaData[0].surname;
        return returnObj;
    }
}

Razorpay.instance = new RazorpayInstance({
	key_id: process.env.RAZORPAY_KEY,
	key_secret: process.env.RAZORPAY_SECRET
})

module.exports = Razorpay;