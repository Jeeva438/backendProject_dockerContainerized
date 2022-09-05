const router = require('express').Router()
const sql = require('mssql')
const sqlConfig = require('../setup/db/config')
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;
var admin = require("firebase-admin");
var serviceAccount = require(`../helpers/fitconnect-firebase-adminsdk.json`);
// let logo = require('../helpers/fitconnect.png')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // databaseURL: "https://fitconnect-2409a-default-rtdb.asia-southeast1.firebasedatabase.app"
});

let tokens = []

const GenerateTokens = async (token) => {
    await sql.connect(sqlConfig).then((pool) => {
        pool.query(`
        BEGIN
            IF NOT EXISTS (SELECT * FROM tb_notification_tokens 
                            WHERE tokens = '${token}')
            BEGIN
                insert into tb_notification_tokens (tokens, createdDate, modifiedDate, isActive) 
                values ('${token}', convert(datetime, getdate(), 102), convert(datetime, getdate(), 102), 1)
            END
        END`)
    })
}

router.post("/register", (req, res) => {
    GenerateTokens(req.body.token);
    // tokens.push(req.body.token)
    res.status(200).json({ success: true, message: "Successfully registered FCM Token!", data: [] });
});
const addToken = (token) => {
    !tokens.some((e) => e === token) &&
        tokens.push(token);
    // console.log("addToken token ", tokens);
};
router.post("/notifications", verifyTokenChecking, async (req, res) => {
    try {
        const { title, body, imageUrl } = req.body;

        const get_token = await sql.connect(sqlConfig).then(async (pool) => {
            await pool.query(`select tokens from tb_notification_tokens`).then((output) => {
                output.recordset.forEach(element => {
                    addToken(element.tokens)
                });
            })
        })

        // console.log("get_token: ", tokens);

        // await admin.messaging().send({
        await admin.messaging().sendMulticast({
            tokens,
            notification: {
                title,
                body,
                imageUrl
            },
            webpush: {
                notification: {
                    priority: 'high',
                    icon: 'fitconnect',
                    image: imageUrl
                    // click_action: 'news_intent'
                }
            },
            topic: 'general',
            // topic: 'general'
            // tokens: ['general']
        }).then(d => console.log(d, "Notification sent through app")).catch(err => res.send(err.message))

        let pool = sql.connect(sqlConfig).then(async (pool) => {
            await pool.query(`insert into tb_notification ( title, message, image_url, createdBy, createdDate, modifiedBy, modifiedDate, isActive) 
            values ( '${title}', '${body}', '${imageUrl}', ${req.payload}, convert(datetime, getdate(), 102), ${req.payload}, convert(datetime, getdate(), 102), 1 )`).then((result) => {

                return res.status(200).json({
                    success: true,
                    message: "Successfully sent notifications!",
                    data: { title, body, imageUrl },
                    rowsAffected: result.rowsAffected.length
                })
            })
        })

        // res.status(200).json({ message: "Successfully sent notifications!" });
    } catch (err) {
        res
            .status(err.status || 500)
            .json({ message: err.message || "Something went wrong!" });
    }
});

module.exports = router