const router = require('express').Router();
const passport = require('passport');
require('./googleAuth')(passport);
require('./facebookAuth')(passport);
let { generateToken, generateaccessToken } = require('../setup/token');
const sql = require('mssql');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

router.get(`/google`, (req, res, next) => {

    const role = req.query.role
    const state = role
    // console.log("state: ", state);
    const authenticator = passport.authenticate('google', { scope: ['profile', 'email'], state })
    authenticator(req, res, next)

})
router.get(`/google/callback`, passport.authenticate('google', { failureRedirect: 'fitconnect://fitconnect.com' }),
    async (req, res) => {
        const sqlConfig = require('../setup/db/config')
        try {
            let pool = await sql.connect(sqlConfig)
            console.log("req", req);
            const { state } = req.query
            const role = state
            const customer = role == 'T' ? await stripe.customers.create(
                {
                    email,
                },
                {
                    apiKey: process.env.STRIPE_SECRET_KEY,
                }
            ) : { id: "" }
            const insertRole = await pool.query(`update tb_usermaster set Lgn_type = '${role}', stripeCustomerId = '${customer.id}' where id = ${req.user.id} AND (Lgn_type IS NULL OR Lgn_type = '')`);

            let { refreshToken } = await generateToken(req.user.id)
            res.redirect(`fitconnect://fitconnect.com?token=${refreshToken}&exist=${req.user.googleIsExist}`);
            // res.redirect(`http://localhost:5000/usr/checkdb?token=${refreshToken}&exist=${req.user.loginorsignup}`);
        } catch (err) {
            console.log(err);
            // just redirect normally below
            res.redirect('fitconnect://fitconnect.com')
        }
    }
)

router.get(`/facebook`, (req, res, next) => {

    const role = req.query.role
    const state = role
    // console.log("state: ", state);
    const authenticator = passport.authenticate('facebook', { scope: ['public_profile', 'email'], state })
    authenticator(req, res, next)

})
router.get(`/facebook/callback`, passport.authenticate('facebook', { failureRedirect: 'fitconnect://fitconnect.com' }),
    async (req, res) => {
        const sqlConfig = require('../setup/db/config')
        try {
            let pool = await sql.connect(sqlConfig)
            // console.log("req", req);
            const { state } = req.query
            const role = state
            const customer = role == 'T' ? await stripe.customers.create(
                {
                    email,
                },
                {
                    apiKey: process.env.STRIPE_SECRET_KEY,
                }
            ) : { id: "" }
            const insertRole = await pool.query(`update tb_usermaster set Lgn_type = '${role}', stripeCustomerId = '${customer.id}' where id = ${req.user.id} AND (Lgn_type IS NULL OR Lgn_type = '')`);

            let { refreshToken } = await generateToken(req.user.id)
            res.redirect(`fitconnect://fitconnect.com?token=${refreshToken}&exist=${req.user.fbIsExist}`);
            // res.redirect(`https://fitconnectl.herokuapp.com/usr/checkdb?token=${refreshToken}&exist=${req.user.fbIsExist}`);
            // res.redirect(`http://localhost:5000/usr/checkdb?token=${refreshToken}&exist=${req.user.fbIsExist}`);
        } catch (err) {
            console.log(err);
            // just redirect normally below
            res.redirect('fitconnect://fitconnect.com')
        }
    }
)

module.exports = router