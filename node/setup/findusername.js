module.exports = function (userid, db) {


    return new Promise((resolve, reject) => {

        let findname = `select fullname, Lgn_type from tb_usermaster where id=${userid} and isActive=1`;

        (async () => {

            let data = await db.query(findname);

            return resolve(data.recordset);
        })()



    })


}