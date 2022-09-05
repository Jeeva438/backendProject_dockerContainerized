const express = require('express')
const router = express.Router()
const sql = require('mssql')
const sqlConfig = require('../setup/db/config');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
let { verifyTokenchecking } = require('../setup/token');
let returnObj = require('../helpers/return-function')

router.get('/analytics-report/:period', verifyTokenchecking, async (req, res) => {

    await sql.connect(sqlConfig).then((pool) => {
        pool.request()
            .input('period', sql.VarChar(5), req.params.period || 'month')
            .execute('sp_analytics_report')
            .then(result => {
                returnObj(true, "Successfully fetched", [{
                    users: result.recordsets[0],
                    trainers: result.recordsets[1]
                }], res)
            }).catch((error) => {
                console.log(error);
                returnObj(false, error.message, [], res)
            })
    }).catch((error) => {
        console.log(error);
        returnObj(false, error.message, [], res)
    })

});

router.get('/usertrainer-analytics/:period', verifyTokenchecking, async (req, res) => {

    await sql.connect(sqlConfig).then((pool) => {
        pool.request()
            .input('period', sql.VarChar(5), req.params.period || 'month')
            .execute('sp_usertrainer_analytics')
            .then(result => {
                returnObj(true, "Successfully fetched", result.recordset, res)
            }).catch((error) => {
                console.log(error);
                returnObj(false, error.message, [], res)
            })
    }).catch((error) => {
        console.log(error);
        returnObj(false, error.message, [], res)
    })

})

router.get('/trainer-subs', verifyTokenchecking, async (req, res) => {

    await sql.connect(sqlConfig).then((pool) => {
        pool.query(`
            select (select count(*) from tb_usermaster where Lgn_type = 'T') as totalcount,
            (select count(membership) 
            from tb_usermaster where Lgn_type = 'T' and membership <> 'Basic') as subscribedCount,
            (select count(membership) as subscribedCount 
            from tb_usermaster where Lgn_type = 'T'
            group by membership having membership = 'Basic') as notSubscribedCount
            `).then(result => {
            returnObj(true, "Successfully fetched", result.recordset, res)
        }).catch((error) => {
            console.log(error);
            returnObj(false, error.message, [], res)
        })
    }).catch((error) => {
        console.log(error);
        returnObj(false, error.message, [], res)
    })

})

router.get('/countof-matches', verifyTokenchecking, async (req, res) => {

    await sql.connect(sqlConfig).then((pool) => {
        pool.query(`
            select (select count(*) from tb_usermaster where Lgn_type = 'T') as totalcount,
            (select count(membership) 
            from tb_usermaster where Lgn_type = 'T' and membership <> 'Basic') as subscribedCount,
            (select count(membership) as subscribedCount 
            from tb_usermaster where Lgn_type = 'T'
            group by membership having membership = 'Basic') as notSubscribedCount

            SELECT (select count(id) from tb_like) as total, (select count(1) FROM tb_like p
            INNER JOIN tb_like p2 ON 
            p.userId=p2.likedUserId AND 
            p.likedUserId=p2.userId 
            AND p.userId < p2.userId) as mutual_match
            `).then(result => {
            returnObj(true, "Successfully fetched", { trainer_count: result.recordsets[0], matches_count: result.recordsets[1] }, res)
        }).catch((error) => {
            console.log(error);
            returnObj(false, error.message, [], res)
        })
    }).catch((error) => {
        console.log(error);
        returnObj(false, error.message, [], res)
    })

})

router.get('/usertrainer-report', verifyTokenchecking, async (req, res) => {

    await sql.connect(sqlConfig).then((pool) => {
        pool.query(`
                SELECT datename(weekday, createdDate) as wday, COUNT(id) AS tcount
                FROM   tb_usermaster 
                WHERE isActive = 1 and Lgn_type = 'u' and createdDate between DATEADD(DAY, -7, GETDATE()) AND DATEADD(DAY, 1, GETDATE())
                GROUP BY datename(weekday, createdDate)
                order BY datename(weekday, createdDate)
                
                SELECT datename(weekday, createdDate) as wday, COUNT(id) AS tcount
                FROM   tb_usermaster 
                WHERE isActive = 1 and Lgn_type = 't' and createdDate between DATEADD(DAY, -7, GETDATE()) AND DATEADD(DAY, 1, GETDATE())
                GROUP BY datename(weekday, createdDate)
                order BY datename(weekday, createdDate)
            `).then(result => {
            returnObj(true, "Successfully fetched", [{ user: result.recordsets[0], trainer: result.recordsets[1] }], res)
        }).catch((error) => {
            console.log(error);
            returnObj(false, error.message, [], res)
        })
    }).catch((error) => {
        console.log(error);
        returnObj(false, error.message, [], res)
    })

})

module.exports = router