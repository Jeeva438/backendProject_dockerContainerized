const sql = require('mssql');
const router = require('express').Router();
const moment = require('moment')
let { body, validationResult } = require('express-validator')
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;
let newUser = require('../helpers/newUser').newUser

//created by vivek on 20-07-2022
//new conv
router.post("/",
  body("senderId").not().isEmpty().escape(),
  body("receiverId").not().isEmpty().escape(),
  verifyTokenChecking,
  async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({
        success: false,
        message: "Expected params not sent!",
        errors: errors.array()
      })
    }

    try {
      /*
      senderId = userId
      receiverId = likedId
      */
      let { senderId,
        receiverId } = req.body;

      // connect db
      let pool = await sql.connect(sqlConfig);

      let createdDate = moment().format('YYYY-MM-DD HH:mm:ss');
      let modifiedDate = moment().format('YYYY-MM-DD HH:mm:ss');

      const checkIsMutual = await pool.query(`
      IF exists(SELECT likedUserId from tb_like where userId = ${receiverId} and likedUserId = ${senderId} and isActive = 1)            
        BEGIN  
          select 'success' as result
          select Lgn_type from tb_usermaster where id = ${senderId}
        END
      ELSE
        BEGIN
       select 'fail' as result
       select Lgn_type from tb_usermaster where id = ${senderId}
        end`);

      console.log(checkIsMutual, checkIsMutual.recordsets[1][0].Lgn_type);

      if (checkIsMutual.recordsets[1][0].Lgn_type == "T") {
        if (checkIsMutual.recordset[0].result == "fail") {
          return res.send({
            success: false,
            message: "Not mutually liked",
            data: []
          })
        }
      }


      const checkExist = await pool.query(`select * from tb_conversation where senderId = ${senderId} AND receiverId = ${receiverId}`)
      console.log(checkExist);


      if (checkExist.recordset.length > 0) {
        let newUser_r = await Promise.all(checkExist.recordset.map(async item => {

          const sender = await pool.query(`select id, fullname, profile from tb_usermaster where id = ${item.senderId}`)
          const receiver = await pool.query(`select id, fullname, profile from tb_usermaster where id = ${item.receiverId}`)

          return {
            ...item,
            members: [sender.recordset[0], receiver.recordset[0]]
          }
        }))
        return res.status(200).json({
          success: true,
          message: "Conversation already exists",
          data: newUser_r[0]
        });
      }
      const savedConversation = await pool.query(`insert into tb_conversation (senderId, receiverId, createdDate, modifiedDate, isActive) 
        values (${senderId}, ${receiverId}, '${createdDate}', '${modifiedDate}', 1) 
        
        select conversationId, senderId, receiverId
        from tb_conversation
        where conversationId = SCOPE_IDENTITY()
      `);

      const newUser = await Promise.all(savedConversation.recordset.map(async item => {

        const sender = await pool.query(`select id, fullname, profile from tb_usermaster where id = ${item.senderId}`)
        const receiver = await pool.query(`select id, fullname, profile from tb_usermaster where id = ${item.receiverId}`)

        return {
          ...item,
          members: [sender.recordset[0], receiver.recordset[0]]
        }
      }))

      return res.status(200).json({
        success: true,
        message: "Successfully Created",
        data: newUser[0]
      });

    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Error while creating",
        data: err
      });
    }
  });

//created by vivek on 20-07-2022
//get conv of a user
router.get("/:userId", verifyTokenChecking, async (req, res) => {

  let sqlConfig = require('../setup/db/config');

  let userId = req.params.userId
  try {
    console.log(userId);
    //connect db
    let pool = await sql.connect(sqlConfig)

    const conversation = await pool.query(`select tc.*  
      from tb_conversation tc
      where exists (select conversationId from tb_messages where conversationId = tc.conversationId)
      and (tc.senderId = ${userId} OR tc.receiverId = ${userId})`)

    console.log(conversation);

    const newUser = await Promise.all(conversation.recordset.map(async item => {

      console.log("item: ", item);

      const sender = await pool.query(`select id, fullname, profile from tb_usermaster where id = ${item.senderId}`)
      const receiver = await pool.query(`select id, fullname, profile from tb_usermaster where id = ${item.receiverId}`)
      const message = await pool.query(`select top 1 message from tb_messages where conversationId = ${item.conversationId} order by id desc`)

      return {
        ...item,
        members: [sender.recordset[0], receiver.recordset[0]],
        lastMessage: message.recordset[0].message
      }
    }))

    return res.status(200).json({
      success: true,
      message: "Successfully Fetched",
      data: newUser
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Error while fetching",
      data: err
    });
  }
});

//created by vivek on 20-07-2022
// get conv includes two userId
router.get("/find/:UserId/:secondUserId", async (req, res) => {

  let sqlConfig = require('../setup/db/config');

  try {

    let pool = await sql.connect(sqlConfig)

    let UserId = req.params.UserId;
    let secondUserId = req.params.secondUserId;

    const conversation = await pool.query(`select * from tb_conversation where senderId = ${UserId} and receiverId = ${secondUserId} `)

    if (conversation.recordset.length == 0) {
      return res.status(200).json({
        success: false,
        message: "No Conversation yet"
      })
    }
    return res.status(200).json({
      success: true,
      message: "Successfully fetched",
      data: conversation.recordset
    })
  } catch (err) {

    return res.status(500).json({
      success: false,
      message: "Error while fetching",
      data: err
    });
  }
});

module.exports = router