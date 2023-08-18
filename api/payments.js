var express = require('express');
let router = express.Router({ mergeParams: true });
var MiddleWare = require("../utils/middleware");

var helper = require('../utils/helper');
var PaymentModel = require('../models/models').PaymentModel;

const Constants = require('../utils/constants');
const PaymentManager = require('./manager/payment/PaymentManager');

router.get("/:surname/donation-info",MiddleWare.checkSurname, MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let responseObj = {};
    responseObj.prev_transactions = [];
    let allPayments = await PaymentModel().find({ "family_id": req.family_id, "state": "approved" }).lean();
    for(let eachPayment of allPayments){
        if(eachPayment.type == Constants.payment.gateway.RAZOR_PAY){
            let obj = {};
            obj.name = eachPayment.email;
            obj.currency = eachPayment.currency;
            obj.amount = eachPayment.amount/100; 
            responseObj.prev_transactions.push(obj);
        }
        else{
            let obj = {};
            obj.name = eachPayment.payer.payer_info.first_name;
            obj.currency = eachPayment.transactions[0].amount.currency;
            obj.amount = eachPayment.transactions[0].amount.total;
            responseObj.prev_transactions.push(obj);
        }
    }
    let locInfo = await helper.getPaymentLocationInfoByIP(req);
    responseObj.loc_info = locInfo;
    if(locInfo.currency_code === Constants.payment.INR){
        responseObj.loc_info.key = process.env.RAZORPAY_KEY;
    }
    res.send(responseObj);
});

router.post("/:surname/", MiddleWare.checkSurname, MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
    let paymentManager  = new PaymentManager(req);
    let resp = await paymentManager.createOrderContext(req);
    res.send(resp);
});

// http://localhost:8081/app/payment-confirm?paymentId=PAYID-MAUDIDY40D66579AJ3814340&token=EC-9N1509462H6020250&PayerID=ET7C3JAMXXXYJ

router.put("/", MiddleWare.checkAndAttachSession, async function (req, res) {
    try{
        let paymentManager  = new PaymentManager(req);
        let resp = await paymentManager.checkAndAcceptPayment(req);
        res.send(resp);
    }
    catch(err){
        res.status(500).send("Internal Server Error");
    }
});

// router.post("/:surname/profile/", MiddleWare.checkSurname, MiddleWare.checkParamSession, MiddleWare.notForViewOnly, async function (req, res) {
//     let profile = {
//         "name": "bloodlineProfile2",
//         "presentation":
//         {
//             "brand_name": "Bloodline",
//             "logo_image": "https://bloodline.ga/lib/images/logo.png"
//         },
//         "input_fields":
//         {
//             "no_shipping": 1
//         },
//         "flow_config":
//         {
//             "landing_page_type": "Billing"
//         }
//     }
//     paypal.webProfile.create(profile, function (err, data) {
//         console.log(data);
//         res.send(data);
//     });
// });

module.exports = router;  