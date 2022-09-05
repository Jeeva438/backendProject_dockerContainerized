const sql = require('mssql')
const express = require('express')
const router = express.Router()
const moment = require('moment');
const multer = require('multer')
const { body, param, validationResult } = require('express-validator');
const { hashGenerate, hashValidate } = require('../helpers/hashing') // requiring hash function
let { generateToken, verifyTokenchecking } = require('../setup/token');

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

// Created by Vivek on 08-07-2022
// This api is to create an admin
router.post('/adminRegister', async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    // assign request body
    try {
        let { email, pass } = req.body

        if (!email || !pass) {
            return res.json({
                success: false,
                message: "Expected Params!",
                data: []
            })
        }
        let pool = await sql.connect(sqlConfig);

        console.log("email: ", email);
        // Check existing email
        const existingUser = await pool.query(`select * from tb_usermaster where email = '${email}'`)
        console.log(existingUser);
        if (existingUser.recordset.length > 0) {
            return res.json({
                success: false,
                message: "email already exists, Please register with another email",
                data: []
            })
        } else {
            // generate and store hashed password into a const
            const hasedpass = await hashGenerate(pass)

            let createdDate = moment().format('YYYY-MM-DD HH:mm:ss');
            let modifiedDate = moment().format('YYYY-MM-DD HH:mm:ss');

            // insert into schema
            const create = await pool.query(`
            insert into tb_usermaster (email, password, Lgn_type, createdDate, modifiedDate, isActive) values ('${email}', '${hasedpass}', 'A', '${createdDate}', '${modifiedDate}',1)
            `)

            // log
            console.log(create)

            // return json response in an object
            return res.json({
                success: true,
                message: `Admin Created Successfully !`,
                data: []
            })
        }
    } catch (error) {
        console.log("error" + error)

        // return json response in an object
        return res.json({
            success: false,
            message: "Failed to create user" + error,
            data: []
        })
    }
})

// Created by Vivek on 08-07-2022
// This api is to login an admin- Verify email and password
router.post('/adminLogin', async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // request body
        let { email, pass } = req.body

        let pool = await sql.connect(sqlConfig)
        const existingUser = await pool.query(`select * from tb_usermaster where email = '${email}'`)
        console.log("existingUser::", existingUser);

        if (existingUser.recordset.length == 0) {
            return res.json({
                success: false,
                message: "This email is not registered!",
                data: []
            })
        } else {
            console.log("pass: ", existingUser.recordset[0].password);
            let validatePass = await hashValidate(pass, existingUser.recordset[0].password)

            console.log("Validate Password: " + validatePass)
            if (!validatePass) {
                return res.json({
                    success: false,
                    message: "Password is wrong",
                    data: []
                })
            } else {
                const user_id = existingUser.recordset[0].id;
                // console.log("user_id: ", user_id);
                // console.log("user_id_2: ", existingUser.recordset[0].id);
                let { accessToken, refreshToken } = await generateToken(user_id)

                let result;

                let userdetails = `select id,
                    fullname,
                    email,
                    phone,
                    profile, Lgn_type from tb_usermaster where id = ${user_id} and isActive=1`
                result = await pool.query(userdetails);
                console.log("result::", result);
                // let Lgn_type = result.recordset[0].Lgn_type;

                return res.send({
                    success: true,
                    message: "successful",
                    accessToken, refreshToken, userInfo: result.recordset[0]
                })
            }
        }
    } catch (error) {
        console.log(error);
        return res.json({
            success: false,
            message: "Catch failure" + JSON.stringify(error),
            data: error
        })
    }
})

// Created by Vivek on 07-07-2022
// This api is used to update an user
router.post('/updateAdmin', verifyTokenchecking, async (req, res) => {

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

        let {
            phone, fullname, password, profile
        } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Expected params not sent!"
            })
        }

        let createdDate = moment().format('YYYY-MM-DD HH:mm:ss');
        let modifiedDate = moment().format('YYYY-MM-DD HH:mm:ss');

        if (!password) {
            const result = await pool.query
                (`update tb_usermaster set fullname='${fullname}', phone = '${phone}', profile = '${profile}', modifiedBy= '${userId}', modifiedDate = '${modifiedDate}' 
                where id= ${userId};`);
        } else if (password != null) {

            // generate and store hashed password into a const
            const hasedpass = await hashGenerate(password)

            const result = await pool.query
                (`update tb_usermaster set fullname='${fullname}', phone = '${phone}', password='${hasedpass}', profile = '${profile}', modifiedBy= '${userId}', modifiedDate = '${modifiedDate}' 
                where id= ${userId};`);
        }

        let result;

        let userdetails = `select id,
                    fullname,
                    email,
                    phone,
                    profile, Lgn_type from tb_usermaster where id = ${userId} and isActive=1`
        result = await pool.query(userdetails);
        console.log("result::", result);

        return res.send({
            success: true,
            message: `Profile Updated successfully`,
            userInfo: result.recordset[0]
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