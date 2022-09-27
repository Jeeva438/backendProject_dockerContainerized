const sql = require('mssql');
const router = require('express').Router();
let verifyTokenChecking = require('../setup/token').verifyTokenchecking;

// Created by Vivek on 09-07-2022
// This api is used to pick user's matching trainer
// Modified on 11-07-2022 - Fixed login
router.get('/matchingUser', verifyTokenChecking, async (req, res) => {

    let sqlConfig = require('../setup/db/config');

    try {
        // connect db
        let pool = await sql.connect(sqlConfig);
        const userId = req.payload;
        console.log(userId);
        const getMatching = await pool.query(`select tu.id, tu.fullname, tu.profile
        from tb_usermaster tu
        left outer join tb_goals tg on tu.id = tg.userId 
        left outer join tb_training_location ttl on tu.id = ttl.userId 
		left outer join tb_training_time ttt on tu.id = ttt.userId
		left outer join tb_training_days ttd on tu.id = ttd.userId
		left outer join tb_hobby th on tu.id = th.userId
        where tu.Lgn_type = 'T' and tu.isActive = 1 
        AND 1 = case when  tg.goals in (select goals from tb_goals where userId = ${userId}) then 1 else 0 end
        AND 1 = case when  ttl.location in (select location from tb_training_location where userId = ${userId}) then 1 else 0 end
		AND 1 = case when  ttt.time in (select time from tb_training_time where userId = ${userId}) then 1 else 0 end
		AND 1 = case when  ttd.days in (select days from tb_training_days where userId = ${userId}) then 1 else 0 end
		AND 1 = case when  th.hobby in (select hobby from tb_hobby where userId = ${userId}) then 1 else 0 end
        group by tu.id, tu.fullname, tu.profile`)

        // let id;
        // for (let i = 0; i < getMatching.recordset.length; i++) {

        //     id = getMatching.recordset[i].id

        //     let goals = await pool.query(`select tg.userId, tg.goals, tg.isPrimary
        //     from tb_goals tg where userId = ${id}`)

        //     let location = await pool.query(`select tl.userId, tl.location, tl.isPrimary 
        //     from tb_training_location tl where userId = ${id}`)

        //     getMatching.recordset[i].goals = goals.recordset
        //     getMatching.recordset[i].location = location.recordset

        // }
        // console.log(getMatching.recordset);
        let data = await Promise.all(getMatching.recordset.map(async (item) => {

            let goals = await pool.query(`select tg.userId, tg.goals, tg.isPrimary
                    from tb_goals tg where userId = ${item.id}`)

            let location = await pool.query(`select tl.userId, tl.location, tl.isPrimary 
                    from tb_training_location tl where userId = ${item.id}`)

            return {
                ...item,
                goals: goals.recordset,
                location: location.recordset
            }
        }))

        // if (data[0]?.goals.length > 0) {
        // if (getMatching.recordset[0]?.goals.length > 0) {
        return res.send({
            success: true,
            message: "Matching Users fetched successfully",
            // data: data
            data: data
        })
        // } else {
        //     return res.send({
        //         success: true,
        //         message: "No Users Matched",
        //         data: []
        //     })
        // }
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