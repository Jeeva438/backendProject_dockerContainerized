const bcrypt = require('bcryptjs')
const saltRounds = 10

const hashGenerate = async (pass) => {
    try {
        const salt = await bcrypt.genSalt(saltRounds)
        const hash = await bcrypt.hash(pass, salt)
        return hash
    } catch (error) {
        console.log(error)
    }
}

const hashValidate = async (userPass, existingHashedPass) => {
    try {
        const result = await bcrypt.compare(userPass, existingHashedPass)
        return result
    } catch (error) {
        console.log(error);
    }
}

module.exports = { hashGenerate, hashValidate };