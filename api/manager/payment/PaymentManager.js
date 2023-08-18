const Paypal = require('./gateways/Paypal');
const Razorpay = require('./gateways/Razorpay');
const Constants = require('../../../utils/constants');

class PaymentManager{
    constructor(req){
        if(req.body.currency !== Constants.payment.INR)
            this.obj = new Paypal();
        else{
            this.obj = new Razorpay()
        }
    }

    async createOrderContext(req){
        return await this.obj.createOrderContext(req);
    }

    async checkAndAcceptPayment(req){
        return await this.obj.checkAndAcceptPayment(req);
    }
}

module.exports = PaymentManager;