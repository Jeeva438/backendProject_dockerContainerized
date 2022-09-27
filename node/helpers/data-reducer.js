const sql = require('mssql');
const sqlConfig = require('../setup/db/config');
const router = require('express').Router();

router.get('/practice/jsonreducer', async (req, res) => {

    let data = await sql.connect(sqlConfig).then((p) => {
        return p.query(`
        select tu.id, tu.fullname, tu.profile, case when tu.Lgn_type = 'U' then 'User'
        when tu.Lgn_type = 'T' then 'Trainer' end as role, tac.goals, tac.isPrimary
        from tb_usermaster tu 
		inner join tb_goals tac on  tac.userId = tu.id
		where tu.id in (select userId from tb_like where likedUserId = 3
		union 
		select likedUserId from tb_like where userId = 3) and tu.isActive=1
        `).then((result) => {
            // console.log("result: ", result.recordset);

            return result.recordset
        })
    })
    // console.log("data", data);

    // let filtered = data.filter(obj => !uniqIds[obj.id] && (uniqIds[obj.id] = true));
    // console.log("filtered:", filtered)

    // let arr = []
    // let uniqIds = {};
    // let new_data = Promise.all(data.map(async item => {
    //     let arr = item.filter(obj => !uniqIds[obj.id] && (uniqIds[obj.id] = true));
    //     return {
    //         ...item,

    //     }
    // }))

    const uniqueData = [...data.reduce((map, obj) => map.set(obj.id, obj), new Map()).values()];
    console.log(uniqueData);
    res.send(uniqueData)
})

module.exports = router