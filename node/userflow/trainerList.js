const sql = require('mssql');
const router = require('express').Router();
const moment = require('moment');
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;
let sqlConfig = require('../setup/db/config');


// Created by Vivek on 10-07-2022
// This api is used to pick user's matching trainer
// Modified by Vivek on 14-07-2022 - Applied Filter
// Modified by Vivek on 05-08-2022 - Speed up response
router.post('/getAllTrainers', verifyTokenChecking, async (req, res) => {


    try {
        // connect db
        // let pool = await sql.connect(sqlConfig);
        let userId = req.payload;

        let { location, gender,
            rating,
            time,
            goals,
            session, age1, age2, search
        } = req.body;

        const t0 = performance.now();

        const sp = await sql.connect(sqlConfig).then((pool) => pool
            .request()
            .input("userId", sql.Int, userId)
            .input("location", sql.VarChar(500), location || '')
            .input("gender", sql.VarChar(500), gender || '')
            .input("rating", sql.Int, rating || 0)
            .input("time", sql.VarChar(500), time || '')
            .input("goals", sql.VarChar(500), goals || '')
            .input("session", sql.VarChar(500), session || '')
            .input('search', sql.VarChar(500), search || '')
            .input("age1", sql.Numeric(18, 0), age1 || 0)
            .input("age2", sql.Numeric(18, 0), age2 || 0)
            .execute(`sp_gettrainers_filter`)).then(async (result) => {

                // const t4 = performance.now();

                // for (let i = 0; i < result.recordset.length; i++) {
                //     await sql.connect(sqlConfig).then((pool) => pool.query(`select ta.id, tac.goals from tb_usermaster ta
                //     join tb_goals tac on tac.userId = ta.id
                //     where ta.isActive = 1 and ta.id = ${result.recordset[i].id}`)).then((ress) => {

                //         result.recordset[i].goals = ress.recordset

                //     })

                // }
                // const t5 = performance.now();
                // console.log(`For loop took ${t4 - t5} milliseconds.`);

                const t2 = performance.now();

                let data = await Promise.all(result.recordset.map(async item => {
                    const goals = await sql.connect(sqlConfig).then((pool) => pool.query(`select ta.id, tac.goals from tb_usermaster ta
                    join tb_goals tac on tac.userId = ta.id
                    where ta.isActive = 1 and ta.id = ${item.id}`))

                    return {
                        ...item,
                        goals: goals.recordset
                    }
                }))
                const t3 = performance.now();
                console.log(`Map took ${t2 - t3} milliseconds.`);

                return res.send({
                    success: true,
                    message: "Successfully Fetched",
                    data: data
                });
            })
        const t1 = performance.now();
        console.log(`api took ${t0 - t1} milliseconds.`);



    } catch (error) {

        console.log(error);

        return res.send({
            success: false,
            message: "Error while fetching trainers",
            data: error
        })
    }
});


// Created by Vivek on 10-07-2022
// This api is used to pick trainers all details
router.get('/getTrainerbyId/:Id', verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);
        let userId = req.params.Id;

        let getTrainers = `select tu.id, tu.fullname, tu.email, tu.phone, tu.gender, tu.profile, tu.session, tu.dob,(0 + Convert(Char(8),GETDATE(),112) - Convert(Char(8),tu.dob,112)) / 10000 as age,
		case when tu.Lgn_type = 'U' then 'User'
        when tu.Lgn_type = 'T' then 'Trainer' end as role, tu.facebook, tu.instagram, tu.twitter, tu.website, tu.isActive
        from tb_usermaster tu where id = ${userId} and Lgn_type = 'T'`;

        const result = await pool.query(getTrainers);

        console.log(result.recordset);
        // let user_id;
        // for (let i = 0; i < result.recordset.length; i++) {

        //     user_id = result.recordset[i].id

        //     let goals = await pool.query(`select tac.goals as goals, tac.isPrimary from tb_usermaster ta
        //     join tb_goals tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     let hobby = await pool.query(`select tac.hobby as hobby from tb_usermaster ta
        //     join tb_hobby tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     let challenges = await pool.query(`select tac.challenges as challenges from tb_usermaster ta
        //     join tb_challenges tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     let location = await pool.query(`select tac.location as location, tac.isPrimary from tb_usermaster ta
        //     join tb_training_location tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     let primarylocation = await pool.query(`select ttl.location as primaryLocation from tb_usermaster ta
        //     join tb_training_location ttl on ttl.userId = ta.id and ttl.isPrimary = 1
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     let time = await pool.query(`select tac.time as time from tb_usermaster ta
        //     join tb_training_time tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     let training_days = await pool.query(`select tac.days as days from tb_usermaster ta
        //     join tb_training_days tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     let trainer_media = await pool.query(`select tac.media_url as media_url, tac.type as type from tb_usermaster ta
        //     join tb_trainer_gallery tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     let trainer_desc = await pool.query(`select tac.personal_quote as personal_quote, tac.about as about from tb_usermaster ta
        //     join tb_trainer_desc tac on tac.userId = ta.id
        //     where ta.isActive = 1 and ta.id = ${userId}`)

        //     let review = await pool.query(`select tu.id, tu.fullname, tu.profile, tr.rating, tr.review 
        //     from tb_usermaster tu
        //     inner join tb_rating tr on tr.userId = tu.id
        //     where tr.rated_id = ${userId}`)

        //     result.recordset[i].goals = goals.recordset
        //     result.recordset[i].challenges = challenges.recordset
        //     result.recordset[i].hobby = hobby.recordset
        //     result.recordset[i].location = location.recordset
        //     result.recordset[i].primarylocation = primarylocation.recordset
        //     result.recordset[i].time = time.recordset
        //     result.recordset[i].training_days = training_days.recordset
        //     result.recordset[i].trainer_media = trainer_media.recordset
        //     result.recordset[i].trainer_desc = trainer_desc.recordset
        //     result.recordset[i].review = review.recordset

        // }
        let data = await Promise.all(result.recordset.map(async item => {

            let goals = await pool.query(`select tac.goals as goals, tac.isPrimary from tb_usermaster ta
            join tb_goals tac on tac.userId = ta.id
            where ta.isActive = 1 and ta.id = ${item.id}`)

            let hobby = await pool.query(`select tac.hobby as hobby from tb_usermaster ta
            join tb_hobby tac on tac.userId = ta.id
            where ta.isActive = 1 and ta.id = ${item.id}`)

            let challenges = await pool.query(`select tac.challenges as challenges from tb_usermaster ta
            join tb_challenges tac on tac.userId = ta.id
            where ta.isActive = 1 and ta.id = ${item.id}`)

            let location = await pool.query(`select tac.location as location, tac.isPrimary from tb_usermaster ta
            join tb_training_location tac on tac.userId = ta.id
            where ta.isActive = 1 and ta.id = ${item.id}`)

            let time = await pool.query(`select tac.time as time from tb_usermaster ta
            join tb_training_time tac on tac.userId = ta.id
            where ta.isActive = 1 and ta.id = ${item.id}`)

            let training_days = await pool.query(`select tac.days as days from tb_usermaster ta
            join tb_training_days tac on tac.userId = ta.id
            where ta.isActive = 1 and ta.id = ${item.id}`)

            let trainer_media = await pool.query(`select tac.media_url as media_url, tac.type as type from tb_usermaster ta
            join tb_trainer_gallery tac on tac.userId = ta.id
            where ta.isActive = 1 and ta.id = ${item.id}`)

            let trainer_desc = await pool.query(`select tac.personal_quote as personal_quote, tac.about as about from tb_usermaster ta
            join tb_trainer_desc tac on tac.userId = ta.id
            where ta.isActive = 1 and ta.id = ${item.id}`)

            let review = await pool.query(`select tu.id, tu.fullname, tu.profile, tr.rating, tr.review 
            from tb_usermaster tu
            inner join tb_rating tr on tr.userId = tu.id
            where tr.rated_id = ${item.id}`)

            return {
                ...item,
                goals: goals.recordset,
                hobby: hobby.recordset,
                challenges: challenges.recordset,
                location: location.recordset,
                time: time.recordset,
                training_days: training_days.recordset,
                trainer_media: trainer_media.recordset,
                trainer_desc: trainer_desc.recordset,
                review: review.recordset
            }
        }))

        return res.send({
            success: true,
            message: "successfully fetched",
            data: data
        });
    } catch (error) {

        console.log(error);

        return res.send({
            success: false,
            message: "Error while fetching trainers",
            data: error
        })
    }
});

module.exports = router
