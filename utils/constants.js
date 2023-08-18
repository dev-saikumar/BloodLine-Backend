module.exports = {
    port: process.env.PORT || 5000,
    relation: {
        soul_mate : 1,
        child : 2
    },
    family: {
        type: {
            ALL: 1,
            DEMO: 2,
            SUPER: 3
        }
    },
    payment:{
        INR: "INR",
        gateway:{
            RAZOR_PAY: "razor"
        },
        conversions: {
            INR : 1,
            AUD : 55,
            BRL : 14,
            CAD : 60,
            CNY : 11,
            CZK : 3,
            DKK : 12,
            EUR : 88,
            HKD : 10,
            HUF : 0.25,
            ILS : 22,
            JPY : 0.67,
            MYR : 18,
            MXN : 3.5,
            TWD : 2.67,
            NZD : 51,
            NOK : 8.5,
            PHP : 1.5,
            PLN : 19,
            GBP : 102,
            RUB : 1,
            SGD : 55,
            SEK : 8.6,
            CHF : 80,
            THB : 2.3,
            USD : 74
        },
        donation: {
            paypal: {
                createPayment : {
                    "intent": "sale",
                    "experience_profile_id": process.env.PAYPAL_EXPERIENCE_PROFILE,
                    "payer": {
                        "payment_method": "paypal"
                    },
                    "redirect_urls": {
                        "return_url": process.env.PAYPAL_RETURN_URL,
                        "cancel_url": process.env.PAYPAL_CANCEL_URL
                    },
                    "transactions": [{
                        "item_list": {
                            "items": [{
                            }]
                        },
                        "amount": {},
                        "description": "Thanks you for your contribution ! - Losers Team"
                    }]
                }
            }
        }
    }

} 

//India offset = 330
//Medam Family ID = 5eadbe333003860004f01f3b