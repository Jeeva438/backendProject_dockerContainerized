const newUser = async (result, pool) => {
    await Promise.all(result.map(async item => {

        const sender = await pool.query(`select id, fullname, profile from tb_usermaster where id = ${item.senderId}`)
        const receiver = await pool.query(`select id, fullname, profile from tb_usermaster where id = ${item.receiverId}`)

        return {
            ...item,
            members: [sender.recordset[0], receiver.recordset[0]]
        }
    }))
    return
}

module.exports = { newUser }