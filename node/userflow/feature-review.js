const sql = require('mssql');
const router = require('express').Router();
const moment = require('moment');
const sqlConfig = require('../setup/db/config');
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;
const stripe = require('stripe')(process.env.STRIPE_API_KEY);


router.get('/feature-review/:id', verifyTokenChecking, async (req, res) => {

    let userid = req.payload;
    let plan;

    let pool = await sql.connect(sqlConfig).then(async (pool) => {

        let stripeid = await pool.query(`select top 1 stripeCustomerId from tb_usermaster where id = ${userid}`).then(stripid => {
            return stripid.recordset[0].stripeCustomerId
        })
        console.log(stripeid);
        if (stripeid) {
            const subscriptions = await stripe.subscriptions.list(
                {
                    customer: stripeid,
                    status: "all",
                    expand: ["data.default_payment_method"],
                }
            );

            plan = subscriptions.data.length > 0 ? subscriptions.data[0].plan.nickname : "Basic"
        } else {
            plan = "Basic"
        }
        console.log(plan);
        if (plan == "Platinum") {
            pool.query(`update tb_rating set featured = 1 where id = ${req.params.id}`).then((result) => {
                return res.send({
                    success: result.rowsAffected.length > 0 ? true : false,
                    message: result.rowsAffected.length > 0 ? "Featured" : "Cannot Feature",
                    data: []
                })
            }).catch(error => {
                console.log(error)
                return error
            })
        } else {
            return res.send({
                success: false,
                message: "Upgrade plan to feature a review",
                data: []
            })
        }
    })

})

router.get('/hide-review/:id', verifyTokenChecking, async (req, res) => {

    let pool = await sql.connect(sqlConfig).then((pool) => {
        pool.query(`update tb_rating set isActive = 0 where id = ${req.params.id}`).then((result) => {
            return res.send({
                success: result.rowsAffected.length > 0 ? true : false,
                message: result.rowsAffected.length > 0 ? "Hidden" : "Cannot Hide",
                data: []
            })
        })
    })

})

module.exports = router