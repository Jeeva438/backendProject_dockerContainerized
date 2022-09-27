const sql = require('mssql');
const router = require('express').Router();
const moment = require('moment');
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;


// Created by Vivek on 10-07-2022
// This api is used to reject functionality
router.get('/reject/:Id', verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);
        let userId = req.payload
        let rejectedId = req.params.Id

        let createdDate = moment().format('YYYY-MM-DD HH:mm:ss')
        let modifiedDate = moment().format('YYYY-MM-DD HH:mm:ss')

        let reject_query = `insert into tb_reject (userId, rejectedUserId, createdBy, createdDate, modifiedBy, modifiedDate, isActive)
        values (${userId}, ${rejectedId}, ${userId}, '${createdDate}', ${userId}, '${modifiedDate}', 1 )`;

        const result = await pool.query(reject_query);

        console.log(result);

        if (result.rowsAffected > 0) {
            return res.send({
                success: true,
                message: "Rejected",
                data: []
            })
        } else {
            return res.send({
                success: false,
                message: "Cannot Reject",
                data: []
            })
        }
    } catch (error) {

        console.log(error);

        return res.send({
            success: false,
            message: "Error while rejecting",
            data: error
        })
    }
});


module.exports = router
