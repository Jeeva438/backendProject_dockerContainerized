const sql = require('mssql');
const router = require('express').Router();
const moment = require('moment');
const multer = require('multer');
const { body, param, validationResult } = require('express-validator');
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;
let { generateToken, generateaccessToken } = require('../setup/token');
let validator = require('../helpers/validator')
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

// multer middleware
//middleware
const FileStorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/profile')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '--' + file.originalname)
    }
})

const upload = multer({
    storage: FileStorageEngine
})

// sample api as DB Checking
router.get('/checkDb', async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);

        const result = await pool
            .request()
            .query(`select 'db connected'`)

        console.log(result);

        return res.json({
            success: true,
            message: 'success',
            data: result.recordsets[0]
        });
    } catch (err) {

        return res.json({
            success: false,
            message: "failure",
            data: err
        });

    }
});

// Created by Vivek on 07-07-2022
// This api is used to create an user
router.post('/createUser', async (req, res) => {

    let sqlConfig = require('../setup/db/config');
    // let { encryptData } = require('../../config/encrypt_decrypt')

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);

        let { fullname,
            email,
            phone,
            Lgn_type
        } = req.body;


        if (!fullname ||
            !email ||
            !phone ||
            !Lgn_type) {
            return res.send({
                success: false,
                message: "expected params not sent"
            })
        }
        let createdDate = moment().format('YYYY-MM-DD HH:mm:ss');
        let modifiedDate = moment().format('YYYY-MM-DD HH:mm:ss');

        // if (!User_name || !perm_phone || !comm_phone) {

        //     return res.send({
        //         success: false,
        //         message: "expected params not sent"
        //     })
        // }

        // encrypt data-


        console.log("User_code Id:");

        // console.log(User_code);

        const results = await pool.query(`select * from tb_usermaster where ( phone='${phone}' OR email = '${email}') and isActive=1`);

        if (results.recordset.length > 0) {

            return res.send({
                success: false,
                message: "User already exists",
                data: []
            });

        } else {

            const customer = Lgn_type == 'T' ? await stripe.customers.create(
                {
                    email,
                },
                {
                    apiKey: process.env.STRIPE_SECRET_KEY,
                }
            ) : { id: "" }
            console.log(customer.id);
            const result = await pool.query
                (`Insert into tb_usermaster (fullname,
                        email, phone, Lgn_type, createdDate, modifiedDate, isActive, membership, stripeCustomerId
                  ) values(
                    '${fullname}','${email}','${phone}', '${Lgn_type}',
                    '${createdDate}', '${modifiedDate}',1, 'Basic', '${customer.id}'
                 ) select SCOPE_IDENTITY() as id;`);

            console.log(result);


            const userID = result.recordset[0].id
            console.log("userID: ", userID);

            let { accessToken, refreshToken } = await generateToken(userID)

            let getTrainers = `select tu.*, case when tu.Lgn_type = 'U' then 'User'
                    when tu.Lgn_type = 'T' then 'Trainer' end as role
                    from tb_usermaster tu where id=${userID} and isActive=1`;

            const result_get = await pool.query(getTrainers);

            // console.log(result_get.recordset);

            // let user_id;
            // let stripe_id;
            // for (let i = 0; i < result_get.recordset.length; i++) {

            //     user_id = result_get.recordset[i].id
            //     stripe_id = result_get.recordset[i].stripeCustomerId
            //     console.log(stripe_id);

            //     let goals = await pool.query(`select tac.goals as goals from tb_usermaster ta
            //             join tb_goals tac on tac.userId = ta.id
            //             where ta.isActive = 1 and ta.id = ${userID}`)

            //     let hobby = await pool.query(`select tac.hobby as hobby from tb_usermaster ta
            //             join tb_hobby tac on tac.userId = ta.id
            //             where ta.isActive = 1 and ta.id = ${userID}`)

            //     let challenges = await pool.query(`select tac.challenges as challenges from tb_usermaster ta
            //             join tb_challenges tac on tac.userId = ta.id
            //             where ta.isActive = 1 and ta.id = ${userID}`)

            //     let location = await pool.query(`select tac.location as location from tb_usermaster ta
            //             join tb_training_location tac on tac.userId = ta.id
            //             where ta.isActive = 1 and ta.id = ${userID}`)

            //     let time = await pool.query(`select tac.time as time from tb_usermaster ta
            //             join tb_training_time tac on tac.userId = ta.id
            //             where ta.isActive = 1 and ta.id = ${userID}`)

            //     let training_days = await pool.query(`select tac.days as days from tb_usermaster ta
            //             join tb_training_days tac on tac.userId = ta.id
            //             where ta.isActive = 1 and ta.id = ${userID}`)

            //     result_get.recordset[i].goals = goals.recordset
            //     result_get.recordset[i].challenges = challenges.recordset
            //     result_get.recordset[i].hobby = hobby.recordset
            //     result_get.recordset[i].location = location.recordset
            //     result_get.recordset[i].time = time.recordset
            //     result_get.recordset[i].training_days = training_days.recordset

            //     if (stripe_id) {
            //         const subscriptions = await stripe.subscriptions.list(
            //             {
            //                 customer: stripe_id,
            //                 status: "all",
            //                 expand: ["data.default_payment_method"],
            //             }
            //         );

            //         plan = subscriptions.data.length > 0 ? subscriptions.data[0].plan.nickname : "Basic"
            //     }
            //     result_get.recordset[i].plan = plan || "Basic"

            // }
            let plan;
            let data = await Promise.all(result_get.recordset.map(async i => {

                let goals = await pool.query(`select tac.goals as goals from tb_usermaster ta
                        join tb_goals tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

                let hobby = await pool.query(`select tac.hobby as hobby from tb_usermaster ta
                        join tb_hobby tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

                let challenges = await pool.query(`select tac.challenges as challenges from tb_usermaster ta
                        join tb_challenges tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

                let location = await pool.query(`select tac.location as location from tb_usermaster ta
                        join tb_training_location tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

                let time = await pool.query(`select tac.time as time from tb_usermaster ta
                        join tb_training_time tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

                let training_days = await pool.query(`select tac.days as days from tb_usermaster ta
                        join tb_training_days tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

                if (i.stripeCustomerId) {
                    const subscriptions = await stripe.subscriptions.list(
                        {
                            customer: i.stripeCustomerId,
                            status: "all",
                            expand: ["data.default_payment_method"],
                        }
                    );

                    plan = subscriptions.data.length > 0 ? subscriptions.data[0].plan.nickname : "Basic"
                }
                i.plan = plan || "Basic"

                return {
                    ...i,
                    goals: goals.recordset,
                    challenges: challenges.recordset,
                    hobby: hobby.recordset,
                    location: location.recordset,
                    time: time.recordset,
                    training_days: training_days.recordset
                }
            }))

            return res.send({
                success: true,
                message: "User Created successfully",
                accessToken,
                refreshToken,
                userInfo: data

            })
        }
    } catch (error) {

        console.log(error);

        return res.send({
            success: false,
            message: "Error while creating user",
            data: error
        })
    }
});

// Created by Vivek on 07-07-2022
// This api is used to update an user
router.post('/updateUser', verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');
    // let { encryptData } = require('../../config/encrypt_decrypt')

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);
        let userId = req.payload;
        console.log(userId);

        let { role, basicinfo, goals, challenges, hobby, location, time, training_days, trainer_desc, mediaFiles } = req.body;

        console.log("basicinfo:", basicinfo)
        let createdDate = moment().format('YYYY-MM-DD HH:mm:ss');
        let modifiedDate = moment().format('YYYY-MM-DD HH:mm:ss');

        // KEY VALIDATION
        if (!role || !userId) {
            return res.status(401).json({
                success: false,
                message: "Expected params not sent!"
            })
        }

        console.log("basicinfo req.body::", basicinfo);
        if (!basicinfo) {
            console.log("basicinfo check::", basicinfo);
            basicinfo = []
            console.log("basicinfo empty array check::", basicinfo);
            basicinfo.push({
                key: 'modifiedDate',
                data: modifiedDate
            })
            console.log("basicinfo push checkz::", basicinfo);
        } else {
            basicinfo.push({
                key: 'modifiedDate',
                data: modifiedDate
            })
        }

        // UPDATE CODE

        for (let i = 0; i < basicinfo.length; i++) {
            if (basicinfo[i].data) {
                console.log("chck data[i]", basicinfo[i].data);
                const result = await pool.query(`
                declare @column_name varchar(100) = '${basicinfo[i].key}'
                declare @id int = '${userId}'
                declare @sql nvarchar (1000);
                set @sql = N'update tb_usermaster set ' + @column_name + '= ''${basicinfo[i].data}'' where id  = ${userId} ';
                
                    exec sp_executesql @sql;
                    `)
                console.log(result);
            }
        }

        console.log(!!goals, goals)
        // multiple inserts into goals
        if (goals) {
            await pool.query(`delete from tb_goals where userId = ${userId};`)
            for (i = 0; i < goals.length; i++) {
                const result_goals = await pool.query(`insert into tb_goals (userId, goals, isPrimary, createdBy, createdDate, modifiedBy, modifiedDate, isActive) values (${goals[i].id}, '${goals[i].goal}', ${goals[i].isPrimary}, ${goals[i].id}, CONVERT(datetime, getdate(), 103),${goals[i].id} ,CONVERT(datetime, getdate(), 103), 1)`)
            }
        }
        console.log(!!challenges, challenges)

        // multiple inserts into challenges
        if (challenges) {
            await pool.query(`delete from tb_challenges where userId = ${userId};`)
            for (i = 0; i < challenges.length; i++) {
                const result_challenges = await pool.query(`
                insert into tb_challenges (userId, challenges, createdBy, createdDate, modifiedBy, modifiedDate, isActive) values (${challenges[i].id}, '${challenges[i].goal}', ${challenges[i].id}, CONVERT(datetime, getdate(), 103),${challenges[i].id} ,CONVERT(datetime, getdate(), 103), 1)`)
            }
        }


        // multiple inserts into hobby
        if (hobby) {
            await pool.query(`delete from tb_hobby where userId = ${userId};`)
            if (hobby.length > 0) {
                for (i = 0; i < hobby.length; i++) {
                    const result_hobby = await pool.query(`
                    insert into tb_hobby (userId, hobby, createdBy, createdDate, modifiedBy, modifiedDate, isActive) values (${hobby[i].id}, '${hobby[i].goal}', ${hobby[i].id}, CONVERT(datetime, getdate(), 103),${hobby[i].id} ,CONVERT(datetime, getdate(), 103), 1)`)
                }
            }
        }

        // multiple inserts into location
        if (location) {
            await pool.query(`delete from tb_training_location where userId = ${userId};`)
            if (location.length > 0) {
                for (i = 0; i < location.length; i++) {
                    const result_location = await pool.query(`
                        insert into tb_training_location (userId, location, createdBy, createdDate, modifiedBy, modifiedDate, isActive, isPrimary) 
                        values (${location[i].id}, '${location[i].goal}', ${location[i].id}, CONVERT(datetime, getdate(), 103),${location[i].id} ,CONVERT(datetime, getdate(), 103), 1, ${location[i].isPrimary})`)
                }
            }
        }

        // multiple inserts into time
        if (time) {
            await pool.query(`delete from tb_training_time where userId = ${userId};`)
            if (time.length > 0) {
                for (i = 0; i < time.length; i++) {
                    const result_time = await pool.query(`
                    insert into tb_training_time (userId, time, createdBy, createdDate, modifiedBy, modifiedDate, isActive) 
                    values (${time[i].id}, '${time[i].goal}', ${time[i].id}, CONVERT(datetime, getdate(), 103),${time[i].id} ,CONVERT(datetime, getdate(), 103), 1)`)
                }
            }
        }

        // multiple inserts into days
        // if (training_days, training_days?.length > 0) {
        if (training_days) {
            await pool.query(`delete from tb_training_days where userId = ${userId} ;`)
            if (training_days.length > 0) {
                for (i = 0; i < training_days.length; i++) {
                    const result_training_days = await pool.query(`
                    insert into tb_training_days (userId, days, createdBy, createdDate, modifiedBy, modifiedDate, isActive) 
                    values (${training_days[i].id}, '${training_days[i].goal}', ${training_days[i].id}, CONVERT(datetime, getdate(), 103),${training_days[i].id} ,CONVERT(datetime, getdate(), 103), 1)`)
                }
            }
        }

        console.log("trainer_desc::", trainer_desc);

        let update_trainer;
        // multiple inserts into desc
        if (trainer_desc) {
            // const check = await pool.query(`select * from tb_trainer_desc where userId = ${trainer_desc.id}`)

            // // update query
            // if (check.recordset.length > 0) {
            //     update_trainer = await pool.query(`update tb_trainer_desc set personal_quote = '${trainer_desc.personal_quote}', about = '${trainer_desc.about}', modifiedDate= '${modifiedDate}' where userID = ${trainer_desc.id} `)
            // } else {
            //     update_trainer = await pool.query(`insert into tb_trainer_desc (userId, personal_quote, about, createdBy, createdDate, modifiedBy, modifiedDate, isActive)
            //     values (${trainer_desc.id}, '${trainer_desc.personal_quote}', '${trainer_desc.about}', ${trainer_desc.id}, '${createdDate}', ${trainer_desc.id}, '${modifiedDate}', 1 ) `)
            // }
            const sp = await pool.request()
                .input('id', sql.Int, trainer_desc.id)
                .input('quote', sql.VarChar(100), trainer_desc.personal_quote)
                .input('about', sql.VarChar(500), trainer_desc.about)
                .execute('sp_insert_trainerdesc')
        }


        // multiple inserts into mediaFiles
        let update_trainer_media;

        if (mediaFiles) {
            console.log(mediaFiles.length)
            // update query
            const check1 = await pool.query(`select * from tb_trainer_gallery where userId = ${userId}`)
            if (check1.recordset.length > 0) {
                await pool.query(`delete from tb_trainer_gallery where userId = ${userId};`)
                for (i = 0; i < mediaFiles.length; i++) {
                    console.log("media loop checking", i);
                    update_trainer_media = await pool.query(`insert into tb_trainer_gallery (userId, media_url, type, createdBy, createdDate, modifiedBy, modifiedDate, isActive) 
                  values (${mediaFiles[i].user_id}, '${mediaFiles[i].media_url}', '${mediaFiles[i].type}', ${mediaFiles[i].user_id}, '${createdDate}', ${mediaFiles[i].user_id}, '${createdDate}', 1)`)
                }
            } else {
                for (i = 0; i < mediaFiles.length; i++) {
                    update_trainer_media = await pool.query(`insert into tb_trainer_gallery (userId, media_url, type, createdBy, createdDate, modifiedBy, modifiedDate, isActive) 
                  values (${mediaFiles[i].user_id}, '${mediaFiles[i].media_url}', '${mediaFiles[i].type}', ${mediaFiles[i].user_id}, '${createdDate}', ${mediaFiles[i].user_id}, '${createdDate}', 1)`)
                }
            }
        }

        role == "U" ? role = "User" : role == "T" ? role = "Trainer" : role = "Admin";
        console.log("role: " + role);

        let getTrainers = `select tu.*, case when tu.Lgn_type = 'U' then 'User'
                    when tu.Lgn_type = 'T' then 'Trainer' end as role
                    from tb_usermaster tu where id=${userId} and isActive=1`;

        const result = await pool.query(getTrainers);

        // console.log(result.recordset);
        let plan;
        let data = await Promise.all(result.recordset.map(async i => {

            let goals = await pool.query(`select tac.goals as goals from tb_usermaster ta
                        join tb_goals tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

            let hobby = await pool.query(`select tac.hobby as hobby from tb_usermaster ta
                        join tb_hobby tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

            let challenges = await pool.query(`select tac.challenges as challenges from tb_usermaster ta
                        join tb_challenges tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

            let location = await pool.query(`select tac.location as location from tb_usermaster ta
                        join tb_training_location tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

            let time = await pool.query(`select tac.time as time from tb_usermaster ta
                        join tb_training_time tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

            let training_days = await pool.query(`select tac.days as days from tb_usermaster ta
                        join tb_training_days tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

            let training_media = await pool.query(`select tac.media_url, tac.type from tb_usermaster ta
                        join tb_trainer_gallery tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${i.id}`)

            let trainer_desc = await pool.query(`select tac.personal_quote, tac.about from tb_usermaster ta
                        join tb_trainer_desc tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${userId}`)
            if (i.stripeCustomerId) {
                const subscriptions = await stripe.subscriptions.list(
                    {
                        customer: i.stripeCustomerId,
                        status: "all",
                        expand: ["data.default_payment_method"],
                    }
                );

                plan = subscriptions.data.length > 0 ? subscriptions.data[0].plan.nickname : "Basic"
            }
            i.plan = plan || "Basic"

            return {
                ...i,
                goals: goals.recordset,
                challenges: challenges.recordset,
                hobby: hobby.recordset,
                location: location.recordset,
                time: time.recordset,
                training_days: training_days.recordset,
                trainer_media: training_media.recordset,
                trainer_desc: trainer_desc.recordset
            }
        }))
        console.log("data", data);
        return res.json({
            success: true,
            message: `${role} Profile Updated successfully`,
            userInfo: data
        })
    } catch (error) {

        console.log(error);

        return res.send({
            success: false,
            message: "Error while creating user",
            data: error
        })
    }
});

module.exports = router

