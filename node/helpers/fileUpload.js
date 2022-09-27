const express = require('express')
const router = express.Router()
const multer = require("multer");
const moment = require('moment')
let AWS = require("aws-sdk");
const sql = require('mssql');
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;
require('dotenv/config')

const spacesEndpoint = new AWS.Endpoint('ewr1.vultrobjects.com');
const s3 = new AWS.S3({
  Bucket: process.env.AWS_BUCKET_NAME,
  secretAccessKey: process.env.S3_ACCESS,
  accessKeyId: process.env.S3_SECRET,
  endpoint: spacesEndpoint
});

// MULTER MIDDLEWARE
const fileStorageEngine = multer.memoryStorage({
  destination: (req, file, cb) => {
    cb(null, '')
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${file.originalname}`)
  },

});
const upload = multer({ storage: fileStorageEngine });

// Created by Vivek on 09-07-2022
// Fileupload API
router.post('/', verifyTokenChecking, upload.array('file'), (req, res) => {
  try {
    const ResponseData = []
    const file = req.files;

    file.map((item) => {
      var params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `fitness/${Date.now()}${item.originalname}`,
        Body: item.buffer,
        ACL: 'public-read',
        ContentType: item.mimetype
      };

      s3.upload(params, async (error, data) => {
        console.log("data::", data);
        let key = data?.Key
        let url = data?.Location
        let type = item.mimetype
        let media_file = {
          fileurl: `https://ewr1.vultrobjects.com/theniexpress/${key}`,
          // file_name: key,
          type: type
        }

        if (error) {
          res.status(400).json(error)
        } else {
          ResponseData.push(media_file);
          if (ResponseData.length == file.length) {
            res.json({ "success": true, "message": "File uploaded suceesFully", media_file: ResponseData });
          }
        }
      })
    })

  } catch (err) {
    res.json({ success: false, error: err.message })
  }
})

// Created by Vivek on 09-07-2022
// This api is used to store trainer's media files
router.post('/trainersMedia', verifyTokenChecking, async (req, res) => {

  let sqlConfig = require('../setup/db/config');

  try {

    let pool = await sql.connect(sqlConfig);

    let { mediaFiles } = req.body;
    const userId = req.payload;

    console.log(mediaFiles.length);

    let createdDate = moment().format('YYYY-MM-DD HH:mm:ss');
    let modifiedDate = moment().format('YYYY-MM-DD HH:mm:ss');

    // multiple inserts into mediaFiles
    let update_trainer;

    const check = await pool.query(`select * from tb_trainer_gallery where userId = ${userId}`)
    // update query
    if (check.recordset.length > 0) {
      update_trainer = await pool.query(`delete from tb_trainer_gallery where userId = ${userId}`)
    } else {
      for (i = 0; i < mediaFiles.length; i++) {
        update_trainer = await pool.query(`insert into tb_trainer_gallery (userId, media_url, type, createdBy, createdDate, modifiedBy, modifiedDate, isActive) 
      values (${mediaFiles[i].user_id}, '${mediaFiles[i].media_url}', '${mediaFiles[i].type}', ${mediaFiles[i].user_id}, '${createdDate}', ${mediaFiles[i].user_id}, '${createdDate}', 1)`)
      }
    }

    return res.json({
      success: true,
      message: "Successfully Added!",
      data: []
    })

  } catch (error) {

    console.log(error);
    return res.json({
      success: false,
      message: "Failure" + JSON.stringify(error.error)
    })
  }
})

module.exports = router
