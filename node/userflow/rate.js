const sql = require('mssql');
const router = require('express').Router();
const moment = require('moment');
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;
const stripe = require('stripe')(process.env.STRIPE_API_KEY);


// Created by Vivek on 10-07-2022
// This api is used to rate functionality
router.post('/rate', verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);
        let userId = req.payload
        let { rateId, rating, review } = req.body;

        const result = await pool.request()
            .input('userid', sql.Int, userId)
            .input('rateId', sql.Int, rateId)
            .input('rating', sql.Int, rating)
            .input('review', sql.VarChar(500), review)
            .execute(`sp_post_review`)

        console.log(result);

        if (result.rowsAffected > 0) {
            return res.send({
                success: true,
                message: "Rated",
                data: []
            })
        } else {
            return res.send({
                success: true,
                message: "Cannot rate",
                data: []
            })
        }
    } catch (error) {

        console.log(error);

        return res.send({
            success: false,
            message: "Error while Rating",
            data: error
        })
    }
});

// Created by Vivek on 10-07-2022
// This api is used to get liked trainers/users functionality
// Modified on 14-07-2022 - Added reviewd date
router.get('/getReviews/:id', verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);
        let trainerId = req.params.id

        let plan;
        let stripeid = await pool.query(`select top 1 stripeCustomerId from tb_usermaster where id = ${trainerId} and Lgn_type = 'T' `).then(stripid => {
            return stripid.recordset[0].stripeCustomerId
        })
        console.log(stripeid);

        if (stripeid) {
            const subscriptions = await stripe.subscriptions.list(
                {
                    customer: stripeid,
                    status: "all",
                    expand: ["data.default_payment_method"],
                },
                {
                    apiKey: process.env.STRIPE_SECRET_KEY,
                }
            );

            plan = subscriptions.data.length > 0 ? subscriptions.data[0].plan.nickname : "Basic"
        } else {
            plan = "Basic"
        }

        let result = await pool.request()
            .input('plan', sql.VarChar(10), plan)
            .input('userid', sql.VarChar(10), trainerId)
            .execute(`sp_select_reviews`)

        console.log(result.recordset.length);

        for (let i = 0; i < result.recordset.length; i++) {

            console.log(result.recordset[0].userId)
            let result2 = await pool.query(`select ta.id, tac.goals as goals from tb_usermaster ta
                join tb_goals tac on tac.userId = ta.id
                where ta.isActive = 1 and ta.id = ${result.recordset[i].userId}`)

            result.recordset[i].goals = result2.recordset;
        }

        return res.send({
            success: true,
            message: "Fetched Rates & Reviews",
            data: result.recordset
        })
    } catch (error) {

        console.log(error);

        return res.send({
            success: false,
            message: "Error while fetching",
            data: error
        })
    }
});


module.exports = router
