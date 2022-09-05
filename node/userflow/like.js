const sql = require('mssql');
const router = require('express').Router();
const moment = require('moment');
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;
const stripe = require('stripe')(process.env.STRIPE_API_KEY);


// Created by Vivek on 10-07-2022
// This api is used to like functionality
// Modified on 07-08-2022. effective, like-unlike based on plans, stored procedure
router.get('/like/:Id', verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // connect db
        // let pool = await sql.connect(sqlConfig);
        let userId = req.payload
        let likedID = req.params.Id
        let plan = "";
        let message;
        let pool = await sql.connect(sqlConfig).then(async (pool) => {

            let stripeid = await pool.query(`select top 1 stripeCustomerId from tb_usermaster where id = ${userId} and Lgn_type = 'T' `).then(stripid => {
                return stripid.recordset[0]?.stripeCustomerId
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
            }
            // else {
            //     plan = "Basic"
            // }
            console.log(plan);

            const liked_per_day = await pool.query(`
                SELECT count(dateadd(day,datediff(D,0,t.createdDate)- 7,0)) AS likesPerday
                FROM tb_like t where userId = ${userId} and dateadd(day,datediff(D,0,t.createdDate)- 7,0) = dateadd(day,datediff(D,0,GETDATE())- 7,0)
            `).then(async (liked_per_day_result) => {

                let like_count = liked_per_day_result.recordset[0]?.likesPerday
                console.log("like_count", like_count);
                if (plan == "Basic") {
                    if (like_count == 5) {

                        return res.json({
                            success: false,
                            message: "Only 5 likes per day. Please Upgrade Plan",
                            data: []
                        })
                    }
                } else if (plan == "Gold") {
                    if (like_count == 20) {

                        return res.json({
                            success: false,
                            message: "Only 20 likes per day. Please Upgrade Plan",
                            data: []
                        })
                    }
                }
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('likedId', sql.Int, likedID)
                    .input('plan', sql.VarChar, plan)
                    .execute(`sp_post_like`).then((result) => {

                        console.log("1 LOG: ", result.recordsets[0]);
                        console.log("2 LOG: ", result.recordsets[1][0]['result']);
                        let action = result.recordsets[0][0].$action
                        let status = result.recordsets[0][0].isActive[0]


                        if (plan == "Basic") {
                            if (action == "INSERT") {
                                message = "Liked"
                            } else {
                                message = "Upgrade plan to unlike"
                            }
                        }

                        // if (plan == "Gold" || plan == "Platinum") {
                        if (plan != "Basic") {
                            if (action == "INSERT") {
                                message = "Liked"
                            } else {
                                message = status == 1 ? "Liked" : "Unliked"
                            }
                        }

                        console.log(message);
                        return res.json({
                            success: true,
                            message: message,
                            data: result.recordsets[1][0]['result']
                        })
                    }).catch(error => {
                        console.log(error);
                        return res.json({
                            success: false,
                            message: error,
                            data: []
                        })
                    })
            })

        })



    } catch (error) {

        console.log(error);

        return res.send({
            success: false,
            message: "Error while liking",
            data: error
        })
    }
});

// Created by Vivek on 10-07-2022
// This api is used to get liked trainers/users functionality
// Reworked on 12-08-2022
router.get('/getLikedProfiles', verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);
        let user_id = req.payload
        console.log("user", user_id);
        const plan = await pool.query(`select membership from tb_usermaster where id = ${user_id}`)
        console.log("plan", plan.recordset[0].membership);

        let result;
        if (plan.recordset[0].membership == 'Basic') {
            result = await pool.query(`select likedUserId as id
            from tb_like
            where userId = ${user_id}`)
        } else {
            result = await pool.query(`select userId as id from tb_like where likedUserId = ${user_id}
            union 
            select likedUserId from tb_like where userId = ${user_id}
            order by userId asc`)
        }
        console.log("result.recordset", result.recordset);
        // let userId;
        // for (let i = 0; i < result.recordset.length; i++) {

        //     userId = result.recordset[i].likedUserId

        //     let userdata = await pool.query(`select tu.id, tu.fullname, tu.profile,  case when tu.Lgn_type = 'U' then 'User'
        //     when tu.Lgn_type = 'T' then 'Trainer' end as role
        //     from tb_usermaster tu where id=${userId} and isActive=1`)

        //     let goals = await pool.query(`select tac.goals, tac.isPrimary from tb_usermaster ta
        //     join tb_goals tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     let location = await pool.query(`select tac.location, tac.isPrimary from tb_usermaster ta
        //     join tb_training_location tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     result.recordset[i].userdata = userdata.recordset
        //     // result.recordset[i].primarylocation = primarylocation.recordset.length > 0 ? primarylocation.recordset[0].primaryLocation : null
        //     result.recordset[i].goals = goals.recordset
        //     result.recordset[i].location = location.recordset
        // }

        let data = await Promise.all(result.recordset.map(async item => {

            let userdata = await pool.query(`select tu.id, tu.fullname, tu.profile,  case when tu.Lgn_type = 'U' then 'User'
            when tu.Lgn_type = 'T' then 'Trainer' end as role
            from tb_usermaster tu where id=${item.id} and isActive=1`)

            let goals = await pool.query(`select tac.goals, tac.isPrimary from tb_usermaster ta
            join tb_goals tac on tac.userId = ta.id
            where ta.isActive = 1 and ta.id = ${item.id}`)

            let location = await pool.query(`select tac.location, tac.isPrimary from tb_usermaster ta
            join tb_training_location tac on tac.userId = ta.id
            where ta.isActive = 1 and ta.id = ${item.id}`)

            return {
                ...item,
                userdata: userdata.recordset,
                goals: goals.recordset,
                location: location.recordset
            }
        }))

        return res.send({
            success: true,
            message: "Fetched Likes profiles",
            data: data
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
