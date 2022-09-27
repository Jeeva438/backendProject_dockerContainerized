const sql = require('mssql')
const sqlConfig = require('../setup/db/config')
const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
const utils = require('../helpers/format-number');
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;
const moment = require('moment')

router.get("/getAllSubscriptions", verifyTokenChecking, async (req, res) => {
    const prices = await stripe.prices.list({
        apiKey: process.env.STRIPE_SECRET_KEY,
    });

    return res.json({
        success: true,
        message: "Plans fetched!",
        data: prices.data
    });
});

router.post('/session', verifyTokenChecking, async (req, res) => {

    let { priceId, stripeCustomerId } = req.body

    try {

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            success_url: "http://fitconnectl.herokuapp.com/payment/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url: "http://fitconnectl.herokuapp.com/payment/fail",
            customer: stripeCustomerId
        })

        console.log("session.data.customer", session);

        let pool = await sql.connect(sqlConfig)
        let insertquery = pool.query(`insert into tb_paymentinfo ( stripeCustomerId, subscription_type, unpaiddate, amount_total, status, createdDate, isActive)
            values ('${session.customer}', '${session.mode}', convert(datetime, getDate(), 102), ${session.amount_total / 100}, '${session.payment_status}', convert(datetime, getDate(), 102), 1 )
             `)

        console.log(insertquery);


        return res.json({
            success: true,
            message: "session created",
            data: session
        });
    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: err,
            data: []
        });
    }
})


router.get("/success", async (req, res) => {

    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    // console.log("session", session);

    const plan_name = await stripe.checkout.sessions.listLineItems(req.query.session_id)
    // const plan_name = await stripe.subscriptions.retrieve()

    await sql.connect(sqlConfig).then(async (pool) => {

        await pool.query(`update tb_paymentinfo set status = '${session.payment_status}', paiddate = convert(datetime, getDate(), 102) where stripeCustomerId = '${session.customer}'
        update tb_usermaster set membership = '${plan_name.data[0].price.nickname}' where stripeCustomerId = '${session.customer}'
        `)
    })

    let createddate = new Date(Date.now(plan_name.data[0].price.created)).toLocaleDateString('en-CA')

    let expiredate = new Date(createddate);
    expiredate.setMonth(expiredate.getMonth() + 1)
    let expiredDate = expiredate.toLocaleDateString('en-CA')

    // console.log(date);
    console.log(createddate, " - ", expiredDate);

    await sql.connect(sqlConfig).then(async (pool) => {
        pool.query(`insert into tb_subscriptionlist (subscription_type, startingDate, endingDate, status, createdDate, isActive, stripeCustomerId) 
        values ( '${plan_name.data[0].price.nickname}', '${createddate}', '${expiredDate}', '${plan_name.data[0].price.active}', convert(datetime, getDate(), 102), 1, '${session.customer}' )
        `)
    })


    return res.redirect(`fitconnect://payment?plan=${plan_name.data[0].price.nickname}`)
    // res.send({
    //     plan_name
    // })

});

router.get("/fail", async (req, res) => {

    return res.redirect(`fitconnect://payment`)

});

router.get("/getPlanType", verifyTokenChecking, async (req, res) => {

    let userid = req.payload

    const user = await sql.connect(sqlConfig).then(async (pool) => {
        const result = await pool.query(`select top 1 stripeCustomerId from tb_usermaster where id = ${userid} and isActive = 1 `);
        return result.recordset[0].stripeCustomerId;
    })

    console.log(user);

    const subscriptions = await stripe.subscriptions.list(
        {
            customer: user.stripeCustomerId,
            status: "all",
            expand: ["data.default_payment_method"],
        },
        {
            apiKey: process.env.STRIPE_SECRET_KEY,
        }
    );

    const plan = subscriptions.data.length > 0 ? subscriptions.data[0].plan.nickname : "Basic"

    return res.json({
        success: true,
        message: "Plan retrived",
        data: plan
    });
});
// router.post('/pay', async (req, res) => {
//     const { email, amount, currency } = req.body;

//     const paymentIntent = await stripe.paymentIntents.create({
//         amount: amount,
//         currency: currency,
//         // Verify your integration in this guide by including this parameter
//         metadata: { integration_check: 'accept_a_payment' },
//         receipt_email: email,
//     });

//     res.json({ 'client_secret': paymentIntent['client_secret'] })
// })

// router.post('/sub', async (req, res) => {
//     const { email, payment_method, planid } = req.body;

//     const customer = await stripe.customers.create({
//         payment_method: payment_method,
//         email: email,
//         invoice_settings: {
//             default_payment_method: payment_method,
//         },
//     });

//     const subscription = await stripe.subscriptions.create({
//         customer: customer.id,
//         items: [{ plan: planid }],
//         expand: ['latest_invoice.payment_intent']
//     });

//     const status = subscription['latest_invoice']['payment_intent']['status']
//     const client_secret = subscription['latest_invoice']['payment_intent']['client_secret']

//     res.json({ 'client_secret': client_secret, 'status': status });
// })

module.exports = router 