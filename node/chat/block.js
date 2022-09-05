const sql = require("mssql");
const sqlConfig = require("../setup/db/config");
const router = require('express').Router()
const { verifyTokenchecking } = require("../setup/token");
const returnObj = require("../helpers/return-function");

router.get('/:blockid', verifyTokenchecking, async (req, res) => {

    let message;
    await sql.connect(sqlConfig).then((pool) => {
        pool.request()
            .input('user_id', sql.Int, req.payload)
            .input('block_id', sql.Int, req.params.blockid)
            .execute(`sp_block_unblock`).then((result) => {

                console.log("result.recordsets[0][0]", result.recordsets[0][0]);
                let action = result.recordsets[0][0].isActive[0]

                message = action == 0 ? "Unblocked" : "Blocked"

                console.log(message);
                returnObj(true, message, [], res)

            }).catch(error => {
                console.log(error);
                returnObj(false, error.error, [], res)
            })
    }).catch(error => {
        console.log(error);
        return
    })
})

module.exports = router