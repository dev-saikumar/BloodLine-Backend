const constants = require('../../../../utils/constants');
var paypal = require('paypal-rest-sdk');
var PaymentModel = require('../../../../models/models').PaymentModel;
const Helper = require("../Helper");

class Paypal {
    constructor() {

    }

    async checkAndAcceptPayment(req){
        let paymentId = req.body.payment_id;
        let payerId = req.body.payer_id;
        let returnObj = {};
        returnObj.surname = req.metaData[0].surname;

        let transactions = await PaymentModel().find({ "id": paymentId }, { "transactions": 1 }).lean();
        transactions = transactions[0].transactions[0];

        var execute_payment_json = {
            "payer_id": payerId,
            "transactions": [{
                "amount" : transactions.amount
            }]
        };

        return new Promise(function(resolve, reject){
            paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
                if (error) {
                    reject(error);
                } else {
                    payment.family_id = req.family_id;
                    
                    PaymentModel().updateOne({ id: payment.id }, payment, function (err, data) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            Helper.addBCoins(payment.transactions[0].amount.total, payment.transactions[0].amount.currency, req.family_id);
                            resolve(returnObj);
                        }
                    });
                }
            });
        });
    }

    async createOrderContext(req) {
        let create_payment_json = constants.payment.donation.paypal.createPayment;
        let itemsObj = [
            {
                "name": "Donation",
                "sku": "donation",
                "price": req.body.amount,
                "currency": req.body.currency,
                "quantity": 1
            }
        ];
        let amountObj = {
            "currency": req.body.currency,
            "total": req.body.amount
        };
        create_payment_json.transactions[0].item_list.items = itemsObj;
        create_payment_json.transactions[0].amount = amountObj;

        let returnObj = {};
        return new Promise(function(resolve, reject){
            paypal.payment.create(create_payment_json, async function (error, payment) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    if (payment.links) {
                        for (let link of payment.links) {
                            if (link.rel === "approval_url") {
                                returnObj.url = link.href;
                            }
                        }
                    }
                    returnObj.id = payment.id;
                    payment.family_id = req.family_id;
    
                    await PaymentModel().findOneAndUpdate({ "id": payment.id }, { "$set": payment }, { "upsert": true });
                    resolve(returnObj);
                }
            });
        });
    }
}

module.exports = Paypal;