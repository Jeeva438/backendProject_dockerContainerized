const sql = require('mssql');
const router = require('express').Router();
const otpGenerator = require('otp-generator');
// var moment = require('moment');
let unirest = require('unirest');
let { body, validationResult } = require('express-validator')
let { generateToken, generateaccessToken } = require('./token');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);


// let client = require('./redisconfig').client;

// (async () => {
//     await client.connect()
// })()

// Generate OTP Function
// function generateOtp() {

//     return new Promise((resolve, reject) => {

//         var otp = otpGenerator.generate(4, { specialChars: false, lowerCaseAlphabets: false, upperCaseAlphabets: false });

//         console.log("otp1:" + otp);

//         resolve(otp);
//     });
// }

// Send OTP Function
// function SendOtp(comm_phone, otp) {

//     // var req = unirest("GET", "https://www.fast2sms.com/dev/bulkV2");

//     // req.query({
//     //     "authorization": process.env.SMS_AUTHORIZATION,
//     //     "sender_id": "PHANTM",
//     //     "route": "dlt",
//     //     "numbers": comm_phone,
//     //     "message": "134437",
//     //     "variables_values": otp
//     // });

//     // req.headers({
//     //     "cache-control": "no-cache"
//     // });

//     // req.end(function (res) {
//     //     if (res.error) throw new Error(res.error);

//     //     console.log(res.body);
//     // });
// }

// modifiy api in redis
// login api
router.post('/loginuser', body('comm_phone').not().isEmpty().escape().isInt(), async (req, res) => {

    let sqlConfig = require('./db/config');

    // console.log(sqlConfig, 'sqlconfig');

    try {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            return res.send({
                status: 0,
                success: false,
                message: "UnExpected Params!",
                errors: errors.array()
            });
        }
        // connect db

        console.time();

        let pool = await sql.connect(sqlConfig);

        console.timeEnd()

        let comm_phone = req.body.comm_phone;
        let role = req.body.role;

        if (!comm_phone) {

            return res.send({
                success: false,
                message: "expected params not sent"
            });
        }

        const result = await pool.query(`select * from tb_usermaster where phone='${comm_phone}'`);
        console.log("result.recordset[0].isActive", result.recordset[0].isActive);
        if (result.recordset.length == 0) {

            return res.send({
                success: false,
                message: "Mobile number doesn't exists. Please register"
            });

        } else if (result.recordset[0].isActive == 0) {

            return res.send({
                success: false,
                message: `${result.recordset[0].Lgn_type == 'U' ? "User" : "Trainer"} Suspended. Please contact support`
            });
        }
        else {

            console.log(`Existing User...`);

            if (role != result.recordset[0].Lgn_type) {
                return res.json({
                    success: false,
                    message: "Sorry! cannot login as different role"
                })
            }

            let User_id = result.recordset[0].id;

            // const otp = await generateOtp();
            const otp = 1234

            console.log(`Otp2:${otp}`);

            // let setkey = 'userID_' + User_id;

            // console.log(setkey, 'setkey')

            // client.setEx(setkey, 600, otp);

            // SendOtp(comm_phone, otp);

            return res.send({
                success: true,
                message: "OTP sent to the user",
                data:
                {
                    otp,
                    User_id
                }
            });

        }

    }
    catch (error) {
        console.log("error: ", error);
        return res.send({
            success: false,
            message: "failure",
            data: error
        })

    }

});

//verify otp
router.post('/verifyotp',
    body('User_id').not().isEmpty().escape().isInt(),
    body('otp').not().isEmpty().escape().isInt(), async (req, res) => {

        try {
            console.log('api hitting***')
            let sqlConfig = require('./db/config');

            let pool = await sql.connect(sqlConfig);

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.send({
                    status: 0,
                    message: "UnExpected Params!",
                    success: false,
                    errors: errors.array()
                });

            }

            const userId = req.body.User_id;
            const OTP_user = req.body.otp;

            // let setkey = 'userID_' + userID;

            // console.log(setkey, 'setkey')

            // let getOTP = await client.get(setkey);
            let getOTP = 1234

            console.log(getOTP, 'getOTP**')
            let result;

            if (getOTP) {

                if (getOTP == OTP_user) {

                    let { accessToken, refreshToken } = await generateToken(userId)

                    let getTrainers = `select tu.*, case when tu.Lgn_type = 'U' then 'User'
                    when tu.Lgn_type = 'T' then 'Trainer' end as role
                    from tb_usermaster tu where id=${userId} and isActive=1`;

                    const result = await pool.query(getTrainers);

                    // console.log(result.recordset);
                    let user_id;
                    let stripe_id;
                    let plan;
                    for (let i = 0; i < result.recordset.length; i++) {

                        user_id = result.recordset[i].id
                        stripe_id = result.recordset[i].stripeCustomerId

                        let goals = await pool.query(`select tac.goals as goals from tb_usermaster ta
                        join tb_goals tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${userId}`)

                        let hobby = await pool.query(`select tac.hobby as hobby from tb_usermaster ta
                        join tb_hobby tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${userId}`)

                        let challenges = await pool.query(`select tac.challenges as challenges from tb_usermaster ta
                        join tb_challenges tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${userId}`)

                        let location = await pool.query(`select tac.location as location from tb_usermaster ta
                        join tb_training_location tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${userId}`)

                        let time = await pool.query(`select tac.time as time from tb_usermaster ta
                        join tb_training_time tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${userId}`)

                        let training_days = await pool.query(`select tac.days as days from tb_usermaster ta
                        join tb_training_days tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${userId}`)

                        let trainer_desc = await pool.query(`select tac.personal_quote, tac.about from tb_usermaster ta
                        join tb_trainer_desc tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${userId}`)

                        let trainer_media = await pool.query(`select tac.media_url, tac.type from tb_usermaster ta
                        join tb_trainer_gallery tac on tac.userId = ta.id
                        where ta.isActive = 1 and ta.id = ${userId}`)

                        result.recordset[i].goals = goals.recordset
                        result.recordset[i].challenges = challenges.recordset
                        result.recordset[i].hobby = hobby.recordset
                        result.recordset[i].location = location.recordset
                        result.recordset[i].time = time.recordset
                        result.recordset[i].training_days = training_days.recordset
                        result.recordset[i].trainer_desc = trainer_desc.recordset
                        result.recordset[i].trainer_media = trainer_media.recordset

                        if (stripe_id) {
                            const subscriptions = await stripe.subscriptions.list(
                                {
                                    customer: stripe_id,
                                    status: "all",
                                    expand: ["data.default_payment_method"],
                                },
                                {
                                    apiKey: process.env.STRIPE_SECRET_KEY,
                                }
                            );

                            plan = subscriptions.data.length > 0 ? subscriptions.data[0].plan.nickname : "Basic"

                        }
                        result.recordset[i].plan = plan || "Basic"
                    }
                    return res.send({
                        success: true,
                        message: "successful",
                        accessToken, refreshToken, userInfo: result.recordset
                    })
                } else {

                    return res.send({
                        success: false,
                        message: "OTP Not Matched"
                    })

                }

            } else {

                return res.send({
                    success: false,
                    message: "OTP Timeout. Try again."
                })

            }
        }
        catch (error) {
            return res.send({
                success: false,
                message: error.message,
                data: error
            })
        }
    });


router.post('/generateaccesstoken', generateaccessToken, (req, res) => { })

module.exports = router