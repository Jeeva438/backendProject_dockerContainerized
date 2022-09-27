const sql = require('mssql');
const router = require('express').Router();
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;

// Created by Vivek on 13-07-2022
// This api is used to pick user's matching trainer
router.get('/matches/:id', verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);
        const userId = req.params.id;
        console.log(userId);
        const getMatching = await pool.query(`select top 5 tu.id, tu.profile, tu.fullname 
        from tb_usermaster tu
        inner join tb_goals tg on tu.id = tg.userId
        inner join tb_training_location tl on tu.id = tl.userId
        where tu.Lgn_type = 'U' and tg.goals in (select goals from tb_goals where userId = ${userId})
		and tl.location in (select location from tb_training_location where userId = ${userId})
		group by tu.id, tu.profile, tu.fullname order by tu.id desc`)

        let id;
        for (let i = 0; i < getMatching.recordset.length; i++) {

            id = getMatching.recordset[i].id

            let goals = await pool.query(`select tg.userId, tg.goals
            from tb_goals tg where userId = ${id}`)

            let location = await pool.query(`select tl.userId, tl.location 
            from tb_training_location tl where userId = ${id}`)

            getMatching.recordset[i].goals = goals.recordset
            getMatching.recordset[i].location = location.recordset

        }
        const count = getMatching.recordset.length
        console.log(count);
        // getMatching.recordset.push({ count: count })
        console.log(getMatching.recordset);

        if (getMatching.recordset[0].goals.length > 0) {
            return res.send({
                success: true,
                message: "Matching Users fetched successfully",
                data: getMatching.recordset,
                count: count
                // count: getMatching.recordset.length
            })
        } else {
            return res.send({
                success: false,
                message: "No Users Matched",
                data: []
            })
        }
    } catch (error) {

        console.log(error);

        return res.send({
            success: false,
            message: "Error while searching users",
            data: error.error
        })
    }
});

// 
// Created by Vivek on 13-07-2022
// This api is used get trainer's likes counts
router.get('/getLikesCount/:id', verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);
        const userId = req.params.id;
        console.log(userId);

        const getCounts = await pool.query(`select count(likedUserId) as liked_by_users from tb_like where likedUserId = ${userId}
        select tl.userId, tu.fullname, tu.profile  
        from 
        tb_usermaster tu
        inner join tb_like tl on tl.userId = tu.id
        where tl.likedUserId = ${userId}
        `)
        console.log(getCounts);

        return res.send({
            success: true,
            message: "Likes counted!",
            data: {
                likeCount: getCounts.recordset[0].liked_by_users,
                likersProfiles: getCounts.recordsets[1]
            }
        })
    } catch (error) {

        console.log(error);

        return res.send({
            success: false,
            message: "Error while searching users",
            data: error.error
        })
    }
});

module.exports = router