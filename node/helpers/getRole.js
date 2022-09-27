const sql = require('mssql');
const sqlConfig = require('../setup/db/config')
let pool = await sql.connect(sqlConfig)

const result = await pool.query(`insert into tb_usermaster (fullname, email, profile, googleId, password, provider, isVerified) 
values ('${profile.displayName}', '${profile.emails[0].value}', '${profile.photos[0].value}' ,${profile.id}, null, 'google', '${profile.emails[0].verified}') select * from tb_usermaster where id = SCOPE_IDENTITY()`)
