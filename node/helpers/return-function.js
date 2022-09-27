const returnObj = (success, message, data, res) => {
    return res.json({
        success: success,
        message: message,
        data: data
    })
}

module.exports = returnObj