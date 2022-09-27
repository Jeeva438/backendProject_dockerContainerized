const sql = require('mssql');
const router = require('express').Router();
const moment = require('moment')
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;

//add
router.post("/", verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    let { conversationId, senderId, message } = req.body;

    if (!conversationId || !senderId || !message) {
        return res.json({
            success: false,
            message: "Expected params not found !"
        })
    }

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);

        // const isBlocked = await pool.query(`select tb.*
        // from tb_block tb
        // where (user_id = ${req.payload} and block_id = ${senderId} and isActive = 1) OR (user_id = ${senderId} and block_id = ${req.payload} and isActive = 1)`)

        // const status = isBlocked.recordset[0].status
        // console.log("isBlocked length", isBlocked.recordset.length);
        // if (isBlocked.recordset.length == 0) {
        const savedMessage = await pool
            .request()
            .input("conversationId", sql.Int, conversationId)
            .input("senderId", sql.Int, senderId)
            .input("message", sql.VarChar(600), message)
            // .input("createdDate ", sql.DateTime, createdDate)
            // .input("modifiedDate", sql.DateTime, modifiedDate)
            .execute(`sp_insert_message`)

        return res.status(200).json({
            success: true,
            message: "Message saved",
            data: savedMessage.recordset
        });
        // } else {
        //     const blocked_data = await Promise.all(isBlocked.recordset.map(async item => {

        //         const blocker = await pool.query(`select id, fullname, profile from tb_usermaster where id = ${item.user_id}`)
        //         const blockee = await pool.query(`select id, fullname, profile from tb_usermaster where id = ${item.block_id}`)

        //         return {
        //             ...item,
        //             members: [blocker.recordset[0], blockee.recordset[0]]
        //         }
        //     }))
        //     return res.status(200).json({
        //         success: true,
        //         message: "Blocked",
        //         data: blocked_data
        //     });
        // }

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            message: "Cannot save message",
            data: err
        });
    }
});

//get
router.get("/:conversationId/:receiverId", verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    let conversationId = req.params.conversationId;
    try {
        // connect db
        let pool = await sql.connect(sqlConfig);

        const isBlocked = await pool.query(`select tb.*
        from tb_block tb
        where (user_id = ${req.payload} and block_id = ${req.params.receiverId} and isActive = 1) OR (user_id = ${req.params.receiverId} and block_id = ${req.payload} and isActive = 1)`)

        console.log("isBlocked", isBlocked);

        const message = await pool.query(`select * from tb_messages where conversationId = ${conversationId}`)

        console.log("message", message);
        return res.status(200).json({
            success: true,
            messages: "Messages retrived",
            data: message.recordset,
            isBlocked: isBlocked.recordset.length == 0 ? false : true
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: err.error
        });
    }
});

module.exports = router;
