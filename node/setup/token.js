const sql = require('mssql')
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_API_KEY);


async function generateToken(userid) {

  console.log(userid, process.env.ACCESS_TOKEN_SECRET)

  //create the access token with the shorter lifespan
  let accessToken = jwt.sign({ id: userid }, process.env.ACCESS_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.ACCESS_TOKEN_LIFE
  });

  console.log(accessToken)
  //create the refresh token with the longer lifespan
  let refreshToken = jwt.sign({ id: userid }, process.env.REFRESH_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.REFRESH_TOKEN_LIFE
  });

  return { accessToken, refreshToken };

};

function verifyTokenchecking(req, res, next) {

  let bearHeader = req.headers['authorization'];

  if (!bearHeader) {
    return res.send({
      success: false,
      message: "need token"
    })
  }

  const bearer = bearHeader.split(' ');

  const accessToken = bearer[1];

  console.log(accessToken, '**accesstoken')

  //if there is no token stored in cookies, the request is unauthorized
  if (!accessToken) {
    return res.send({
      success: false,
      message: e.message
    })
  }

  let payloaddata
  try {
    //use the jwt.verify method to verify the access token
    //throws an error if the token has expired or has a invalid signature
    payloaddata = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    req.payload = payloaddata.id;

    next()
  }
  catch (e) {
    //if an error occured return request unauthorized error
    return res.send({
      success: false,
      message: e.message
    })
  }
};

async function generateaccessToken(req, res, next) {

  let sqlConfig = require('./db/config');
  let pool = await sql.connect(sqlConfig);

  let bearHeader = req.headers['authorization'];

  if (!bearHeader) {
    return res.send({
      success: false,
      message: "need token"
    })
  }

  const bearer = bearHeader.split(' ');

  const refreshToken = bearer[1];

  console.log(refreshToken, '**refreshToken')

  if (!refreshToken) {
    return res.send({
      success: false,
      message: e.message
    })
  }

  let payload;
  try {

    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    payload = payload.id;
  }
  catch (e) {
    //if an error occured return request unauthorized error
    return res.send({
      success: false,
      message: e.message == "jwt expired" ? 'session expired' : e.message
    })
  }

  let newaccessToken = jwt.sign({ id: payload }, process.env.ACCESS_TOKEN_SECRET,
    {
      algorithm: "HS256",
      expiresIn: process.env.ACCESS_TOKEN_LIFE
    })

  let getTrainers = `select tu.*, case when tu.Lgn_type = 'U' then 'User'
    when tu.Lgn_type = 'T' then 'Trainer' end as role
    from tb_usermaster tu where id=${payload} and isActive=1`;

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
        where ta.isActive = 1 and ta.id = ${payload}`)

    let hobby = await pool.query(`select tac.hobby as hobby from tb_usermaster ta
        join tb_hobby tac on tac.userId = ta.id
        where ta.isActive = 1 and ta.id = ${payload}`)

    let challenges = await pool.query(`select tac.challenges as challenges from tb_usermaster ta
        join tb_challenges tac on tac.userId = ta.id
        where ta.isActive = 1 and ta.id = ${payload}`)

    let location = await pool.query(`select tac.location as location from tb_usermaster ta
        join tb_training_location tac on tac.userId = ta.id
        where ta.isActive = 1 and ta.id = ${payload}`)

    let time = await pool.query(`select tac.time as time from tb_usermaster ta
        join tb_training_time tac on tac.userId = ta.id
        where ta.isActive = 1 and ta.id = ${payload}`)

    let training_days = await pool.query(`select tac.days as days from tb_usermaster ta
        join tb_training_days tac on tac.userId = ta.id
        where ta.isActive = 1 and ta.id = ${payload}`)

    let trainer_desc = await pool.query(`select tac.personal_quote, tac.about from tb_usermaster ta
        join tb_trainer_desc tac on tac.userId = ta.id
        where ta.isActive = 1 and ta.id = ${payload}`)

    let trainer_media = await pool.query(`select tac.media_url, tac.type from tb_usermaster ta
        join tb_trainer_gallery tac on tac.userId = ta.id
        where ta.isActive = 1 and ta.id = ${payload}`)

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
    message: "Success",
    newaccessToken, userInfo: result.recordset
  })

};

// error message:
// invalid signature
// jwt expired 
// invalid token 
module.exports = { generateToken, verifyTokenchecking, generateaccessToken };