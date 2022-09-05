const sql = require('mssql')
const express = require('express')
const router = express.Router()
let { verifyTokenchecking } = require('../setup/token');
const sqlConfig = require('../setup/db/config');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);


// Created by Vivek on 08-07-2022
// This api is used to get the dashboard details. User, Trainer counts, etc
router.get('/adminDashboard', verifyTokenchecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        let pool = await sql.connect(sqlConfig);

        const user_query = await pool.query(`select count(*) as totalUsers from tb_usermaster where Lgn_type = 'U'`);

        const trainer_query = await pool.query(`select count(*) as totalTrainers from tb_usermaster where Lgn_type = 'T'`);

        const Active_user_query = await pool.query(`select count(*) as activeUsers from tb_usermaster where Lgn_type = 'U' and isActive = 1`);

        const Active_trainer_query = await pool.query(`select count(*) as activeTrainers from tb_usermaster where Lgn_type = 'T' and isActive = 1`);

        const newuserCount_query = await pool.query(`SELECT count(*) as newUsersCount FROM tb_usermaster 
        WHERE MONTH(createdDate)  = month(GETDATE()) and Lgn_type = 'U'`);

        const newtrainerCount_query = await pool.query(`SELECT count(*) as newTrainersCount FROM tb_usermaster
        WHERE MONTH(createdDate)  = month(GETDATE()) and Lgn_type = 'T'`);

        // const newusers_query = await pool.query(`SELECT * FROM tb_usermaster 
        // WHERE MONTH(createdDate)  = month(GETDATE()) and Lgn_type = 'U'`);

        // const newtrainers_query = await pool.query(`SELECT * FROM tb_usermaster
        // WHERE MONTH(createdDate)  = month(GETDATE()) and Lgn_type = 'T'`);

        const newusers_query = await pool.query(`select top 5 id, profile, fullname from tb_usermaster where Lgn_type = 'U' order by id desc`);

        const newtrainers_query = await pool.query(`select top 5 id, profile, fullname from tb_usermaster where Lgn_type = 'T' order by id desc`);

        const subscriptions_count = await pool.query(`select COUNT(id) as subCount from tb_subscriptionlist`);

        const new_subscriptions_count = await pool.query(`select count(*) as newSubsCount from tb_subscriptionlist where  MONTH(createdDate) = MONTH(getdate()) `);

        const noOfMatches = await pool.query(`select count(1) as mutual_match FROM tb_like p INNER JOIN tb_like p2 ON p.userId=p2.likedUserId AND 
                                              p.likedUserId=p2.userId AND p.userId < p2.userId`);

        console.log("noOfMatches", noOfMatches);

        return res.json({
            success: true,
            message: "success",
            totalUsers: user_query.recordset[0].totalUsers,
            totalTrainers: trainer_query.recordset[0].totalTrainers,
            activeUsers: Active_user_query.recordset[0].activeUsers,
            activeTrainers: Active_trainer_query.recordset[0].activeTrainers,
            totalnewUsers: newuserCount_query.recordset[0].newUsersCount,
            totalnewTrainers: newtrainerCount_query.recordset[0].newTrainersCount,
            newUsers: newusers_query.recordset,
            newTrainers: newtrainers_query.recordset,
            subscriptions_count: subscriptions_count.recordset[0].subCount,
            new_subscriptions_count: new_subscriptions_count.recordset[0].newSubsCount,
            noOfMatches: noOfMatches.recordset[0].mutual_match
        })
    } catch (error) {
        console.log(error);
    }

})


// Created by Vivek on 08-07-2022
// This api is to get all the users/ trainers list with pagination
// Modified api on 09-07-22 - Added total users count
// Reworked api for Filter functionality on 21-07-22
router.post('/manageUser', verifyTokenchecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        let pool = await sql.connect(sqlConfig);

        let { page, size, location, gender, time, goals, hobby, search, age1, age2 } = req.body;
        // console.log(page, size, location, gender, time, goals, hobby, age1, age2);
        const sp = await pool
            .request()
            .input("page", sql.Int, page || 1)
            .input("size", sql.Int, size)
            .input("location", sql.VarChar(500), location || " ")
            .input("gender", sql.VarChar(500), gender || " ")
            .input("time", sql.VarChar(500), time || " ")
            .input("goals", sql.VarChar(500), goals || " ")
            .input("hobby", sql.VarChar(500), hobby || " ")
            .input('search', sql.VarChar(500), search || '')
            .input("age1", sql.Numeric(18, 0), age1 || 0)
            .input("age2", sql.Numeric(18, 0), age2 || 0)
            .execute(`sp_manageusers_filter`);

        // for (let i = 0; i < sp.recordset.length; i++) {

        //     // user_id = sp.recordset[i].id

        //     let res = await pool.query(`select ta.id, tac.goals as goals, tac.isPrimary from tb_usermaster ta
        //     join tb_goals tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${sp.recordset[i].id}`)

        //     // console.log(res)
        //     sp.recordset[i].goals = res.recordset;
        // }

        // console.log("return respose", sp.recordsets[1][0].totalUsers)
        let data = await Promise.all(sp.recordset.map(async (item) => {

            let res_goal = await pool.query(`select ta.id, tac.goals as goals, tac.isPrimary from tb_usermaster ta
                join tb_goals tac on tac.userId = ta.id
                where ta.isActive = 1 and ta.id = ${item.id}`)

            return {
                ...item,
                goals: res_goal.recordset
            }

        }))
        // console.log("data: ", data);
        let totalUsers;
        if (!!location || !!gender || !!time || !!goals || !!hobby || !!search || !!age1 || !!age2) {
            totalUsers = sp.recordset[0]?.filteredCount || 0
        } else {
            totalUsers = sp.recordsets[1][0].totalUsers
        }

        return res.send({
            success: true,
            message: "Successfully Fetched",
            data: {
                manageUser: data,
                totalUsers
            }
        });

    } catch (error) {
        console.log(error);
        return res.send({
            success: false,
            message: "Error while fetching: " + error.error,
            data: []
        });
    }
})

// Created by Vivek on 08-07-2022
// This api is to get all the users/ trainers list with pagination
// Modified api on 09-07-22 - Added total users count
// Reworked api for Filter functionality on 21-07-22
router.post('/manageTrainer', verifyTokenchecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        let pool = await sql.connect(sqlConfig);

        let { page, size, location, gender, time, goals, hobby, search, age1, age2 } = req.body;
        console.log(page, size, location, gender, time, goals, search, hobby, age1, age2);
        const sp = await pool
            .request()
            .input("page", sql.Int, page || 1)
            .input("size", sql.Int, size)
            .input("location", sql.VarChar(500), location || " ")
            .input("gender", sql.VarChar(500), gender || " ")
            .input("time", sql.VarChar(500), time || " ")
            .input("goals", sql.VarChar(500), goals || " ")
            .input("hobby", sql.VarChar(500), hobby || " ")
            .input('search', sql.VarChar(500), search || '')
            .input("age1", sql.Numeric(18, 0), age1 || 0)
            .input("age2", sql.Numeric(18, 0), age2 || 0)
            .execute(`sp_managetrainers_filter`);

        console.log("ress: ", sp);

        // for (let i = 0; i < sp.recordset.length; i++) {

        //     // user_id = sp.recordset[i].id

        //     let res = await pool.query(`select ta.id, tac.goals as goals, tac.isPrimary from tb_usermaster ta
        //     join tb_goals tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${sp.recordset[i].id}`)

        //     console.log(res)
        //     sp.recordset[i].goals = res.recordset;
        // }
        let data = await Promise.all(sp.recordset.map(async (item) => {

            let res_goal = await pool.query(`select ta.id, tac.goals as goals, tac.isPrimary from tb_usermaster ta
                join tb_goals tac on tac.userId = ta.id
                where ta.isActive = 1 and ta.id = ${item.id}`)

            return {
                ...item,
                goals: res_goal.recordset
            }

        }))
        let totalTrainers;
        if (!!location || !!gender || !!time || !!goals || !!hobby || !!search || !!age1 || !!age2) {
            totalTrainers = sp.recordset[0]?.filteredCount || 0
        } else {
            totalTrainers = sp.recordsets[1][0].totalTrainers
        }
        return res.send({
            success: true,
            message: "Successfully Fetched",
            data: {
                manageTrainer: data,
                totalTrainers
            }
        });

    } catch (error) {
        console.log(error);
        return res.send({
            success: false,
            message: "Error while fetching: " + error.error,
            data: []
        });
    }
})

router.get('/suspend/:id', verifyTokenchecking, async (req, res) => {
    let pool = sql.connect(sqlConfig).then(async (pool) => {
        await pool.query(`update tb_usermaster set isActive = 0 where id = ${req.params.id}`).then(result => {
            return res.json({
                success: result.rowsAffected.length > 0 ? true : false,
                message: result.rowsAffected.length > 0 ? "Suspended" : "Cannot suspend",
                data: []
            })
        }).catch(error => {
            console.log(error);
            return res.json({
                success: false,
                message: error.error,
                data: []
            })
        })
    })
})

router.get('/active/:id', verifyTokenchecking, async (req, res) => {
    let pool = sql.connect(sqlConfig).then(async (pool) => {
        await pool.query(`update tb_usermaster set isActive = 1 where id = ${req.params.id}`).then(result => {
            return res.json({
                success: result.rowsAffected.length > 0 ? true : false,
                message: result.rowsAffected.length > 0 ? "Activated" : "Cannot Activate",
                data: []
            })
        }).catch(error => {
            console.log(error);
            return res.json({
                success: false,
                message: error.error,
                data: []
            })
        })
    })
})
module.exports = router;