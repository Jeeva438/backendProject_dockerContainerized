const sql = require('mssql');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
// const user = require('../model/user');
const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecreT = process.env.GOOGLE_CLIENT_SECRET

module.exports = async function (passport) {

    const sqlConfig = require('../setup/db/config')
    let pool = await sql.connect(sqlConfig)

    passport.use(new GoogleStrategy({
        clientID: clientId,
        clientSecret: clientSecreT,
        // callbackURL: "https://fitconnectl.herokuapp.com/google/callback"
        callbackURL: "http://13.235.50.5:5002/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {

        console.log("profile", profile);
        console.log(profile.emails[0].value);

        let user_query;
        user_query = await pool.query(`select top 1 email from tb_usermaster where email = '${profile.emails[0].value}'`)
        if (user_query.recordset.length > 0) {
            console.log("if hitting ***");
            // user exists
            // update data
            user_query = await pool.query(`update tb_usermaster set googleIsExist = 1 where email = '${profile.emails[0].value}' 
            select top 1 * from tb_usermaster where email = '${profile.emails[0].value}' `)
            return done(null, user_query.recordset[0]);
        } else {
            console.log("else hitting ***");

            try {
                user_query = await pool.query(`insert into tb_usermaster (fullname, email, profile,  oauthId, password, provider, isVerified, createdDate, modifiedDate, isActive, googleIsExist) 
                values ('${profile.displayName}', '${profile.emails[0].value}', '${profile.photos[0].value}' ,${profile.id}, null, 'google', '${profile.emails[0].verified}',  convert(datetime, getdate(), 102), convert(datetime, getdate(), 102), 1, 0 ) 
                SELECT TOP (1) id
                ,fullname
                ,email
                ,phone
                ,gender
                ,profile
                ,Lgn_type
                ,session
                ,facebook
                ,instagram
                ,twitter
                ,website
                ,dob
                ,oauthId
                ,provider
                ,isVerified
                ,googleIsExist
                ,fbIsExist
                FROM tb_usermaster where id = SCOPE_IDENTITY()`)

                console.log("user_query", user_query);
                if (user_query.rowsAffected.length > 0) {
                    return done(null, user_query.recordset[0]);
                }
            } catch (error) {
                console.log(error);
                return error.error
            }
        }
    }
    ));

    passport.serializeUser(function (user, done) {
        console.log(user.id);
        done(null, user.id);
    });

    passport.deserializeUser(async function (id, done) {
        await pool.query(`select * from tb_usermaster where id = ${id}`, function (err, user) {
            done(err, user);
        })
    });

}