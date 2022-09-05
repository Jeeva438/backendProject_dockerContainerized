const redis = require('redis');

const redisPort = 6379
const client = redis.createClient(redisPort);

module.exports = { client };