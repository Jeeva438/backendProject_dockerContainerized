// Production
const sql = require('mssql')
const sqlConfig = {
    user: process.env.USER_DB,
    password: process.env.PASSWORD_DB,
    database: process.env.DATABASENAME,
    server: process.env.SERVER_DB,
    // port: parseInt(process.env.PORT_DB, 10),
    pool: {
        max: 100,
        min: 10,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // for azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    }
};

// let pool = sql.connect(sqlConfig).then((pool) => pool.query(`select 1 + 1 as success`)).then(res => console.log(res)).catch(err => console.log(err))


// const pool = sql.connect(sqlConfig)
//     .then(pool => {
//         console.log('Connected to MSSQL')
//         return pool
//     })
//     .catch(err => console.log('Database Connection Failed! Bad Config: ', err))

// const pool = sql.connect(sqlConfig).then(async (pool) => {

//     return pool
// }).catch(err => console.log('Database Connection Failed! Bad Config: ', err))

// console.log("user", pool);

// module.exports = pool
module.exports = sqlConfig