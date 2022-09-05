const sql = require('mssql')
const sqlConfig = require('../setup/db/config');

const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;

router.post("/getPaymentInfo", verifyTokenChecking, async (req, res) => {

    let { page, size, search } = req.body;

    const getPaymentInfo = await sql.connect(sqlConfig).then((pool) => {
        pool.request()
            .input('page', sql.Int, page || 1)
            .input('size', sql.Int, size)
            .input('search', sql.VarChar(500), search || '')
            .execute(`sp_payment_info`)
            .then((result) => {
                console.log("result", result);

                let totalPay;
                if (search) {
                    totalPay = result.recordset[0]?.filteredCount || 0
                } else {
                    totalPay = result.recordsets[1][0].totalPay
                }

                return res.json({
                    success: true,
                    message: "Successfully Fetched!",
                    data: {
                        paymentInfo: result.recordset,
                        totalPay
                    }
                })
            }).catch((error) => {
                console.log(error);
                return res.json({
                    success: false,
                    message: error.message
                })
            })
    })
});

router.post("/getSubscriptionList", verifyTokenChecking, async (req, res) => {

    let { page, size, search, membership, status } = req.body;

    const getSubscriptionList = await sql.connect(sqlConfig).then((pool) => {
        pool.request()
            .input('page', sql.Int, page || 1)
            .input('size', sql.Int, size)
            .input('search', sql.VarChar(500), search || '')
            .input('membership', sql.VarChar(500), membership || '')
            .input('status', sql.VarChar(10), status || '')
            .execute(`sp_subscription_list`).then((result) => {
                console.log("result", result);

                let totalSubs;
                if (search || membership || status) {
                    totalSubs = result.recordset[0]?.filteredCount || 0
                } else {
                    totalSubs = result.recordsets[1][0].totalSubs
                }

                return res.json({
                    success: true,
                    message: "Successfully Fetched!",
                    data: {
                        subscriptionList: result.recordset,
                        totalSubs
                    }
                })
            }).catch((error) => {
                console.log(error);
                return res.json({
                    success: false,
                    message: error.message
                })
            })
    })

});

module.exports = router