const sql = require('mssql');
const router = require('express').Router();
let verifyTokenChecking = require('./token').verifyTokenchecking;
const findusername = require('./findusername');
let moment = require('moment');

router.post('/addmasterdata', verifyTokenChecking,

    async (req, res) => {

        let sqlConfig = require('./db/config');
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.send({
                status: 0,
                message: "UnExpected Params!",
                data: errors.array()
            });
        }
        try {
            // connect db
            let pool = await sql.connect(sqlConfig);
            let userid = req.payload;

            let data = await findusername(userid, pool);

            console.log(data, userid)

            let createdby;

            if (data.length > 0) {

                createdby = data[0].fullname;

            } else {
                return res.send({
                    status: 0,
                    message: "unauthorized"
                })
            }

            let { configValue, configDescription, metaDatatype, isparent, metadataId } = req.body

            if (!metadataId) {

                return res.send({
                    status: 0,
                    message: "expected params not sent"
                });
            }

            let created = moment().format('YYYY-MM-DD HH:mm:ss');

            const result = await pool.query
                (`Insert into tb_appconfig (
                    configValue,configDescription,metaDatatype,isparent,parentPrimaryID,    
                created,createdby,modified,modifiedby,isactive
                ) values(
                '${configValue}','${configDescription}','${metaDatatype}',
                 '${isparent}', '${metadataId}', 
                '${created}','${createdby}','${created}','${createdby}',1
                ) select SCOPE_IDENTITY() as id`);

            console.log(result);

            if (result.rowsAffected.length > 0) {

                return res.send({
                    status: 1,
                    message: "success",
                    data: []
                });
            } else {
                return res.send({
                    status: 0,
                    message: "failure",
                    data: []
                });
            }

        } catch (error) {

            return res.send({
                status: 0,
                message: "failure",
                data: error
            });
        }
    });

// created by vivek on 07-07-2022 - this api is used to update master data
router.post('/updatemasterdata', verifyTokenChecking,
    async (req, res) => {

        let sqlConfig = require('./db/config');
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
            let userid = req.payload;

            let data = await findusername(userid, pool);

            console.log(data, userid)

            let createdby;

            if (data.length > 0) {

                createdby = data[0].fullname;

            } else {
                return res.send({
                    status: 0,
                    message: "unauthorized"
                })
            }

            let { configValue, configDescription, metaDatatype, isparent, metadataId, id } = req.body

            console.log(req.body)
            if (!id) {
                return res.send({
                    status: 0,
                    message: "expected params not sent"
                });
            }

            let created = moment().format('YYYY-MM-DD HH:mm:ss');

            const result = await pool.query
                (`update tb_appconfig set configValue='${configValue}',configDescription='${configDescription}',
                metaDatatype='${metaDatatype}',isparent='${isparent}',parentPrimaryID='${metadataId}',
                modifiedby='${createdby}',modified='${created}' where id=${id}`);

            console.log(result);

            if (result.rowsAffected > 0) {
                return res.send({
                    status: 1,
                    message: "success",
                    data: []
                });
            } else {
                return res.send({
                    status: 0,
                    message: "failure",
                    data: []
                });
            }

        } catch (error) {

            return res.send({
                status: 0,
                message: "failure",
                data: error
            });

        }

    });

// created by vivek on 07-07-2022 - this api is used to delete master data
router.post('/deletemasterdata', verifyTokenChecking,
    async (req, res) => {

        let sqlConfig = require('./db/config');
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.send({
                status: 0,
                message: "UnExpected Params!",
                data: errors.array()
            });
        }
        try {
            // connect db
            let pool = await sql.connect(sqlConfig);
            let userid = req.payload;

            let data = await findusername(userid, pool);

            console.log(data, userid)

            let createdby;

            if (data.length > 0) {

                createdby = data[0].fullname;

            } else {
                return res.send({
                    status: 0,
                    message: "unauthorized"
                })
            }

            let { id } = req.body;

            console.log(req.body)

            if (!id) {
                return res.send({
                    status: 0,
                    message: "expected params not sent"
                });
            }

            let created = moment().format('YYYY-MM-DD HH:mm:ss');

            const result = await pool.query
                (`update tb_appconfig set isactive=0,
                modified='${created}',modifiedby='${createdby}'
                where isactive=1 and id=${id} `);

            console.log(result);

            if (result.rowsAffected > 0) {

                return res.send({
                    status: 1,
                    message: "success",
                    data: []
                });
            } else {
                return res.send({
                    status: 0,
                    message: "failure",
                    data: []
                });
            }

        } catch (error) {

            return res.send({
                status: 0,
                message: "failure",
                data: error
            });

        }

    });

// created by vivek on 07-07-2022 - this api is used to view particular master data
router.get('/viewmasterdatadetails/:id', verifyTokenChecking,
    async (req, res) => {

        let sqlConfig = require('./db/config');
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.send({
                status: 0,
                message: "UnExpected Params!",
                data: errors.array()
            });
        }
        let id = req.params.id;

        try {
            // connect db
            let pool = await sql.connect(sqlConfig);

            const result = await pool.query(`select id,configValue,configDescription,metaDatatype,isparent,
            parentPrimaryID as metadataId from tb_appconfig where isactive=1 and id='${id}'`);

            console.log(result);

            return res.send({
                status: 1,
                message: "success",
                data: result.recordset
            });

        } catch (error) {

            return res.send({
                status: 0,
                message: "failure",
                data: error
            });

        }


    }); 