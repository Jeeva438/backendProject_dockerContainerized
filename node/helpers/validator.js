const { check } = require('express-validator');

exports.trainerdesc = [check('trainer_desc.personal_quote').not().isEmpty().escape(),
check('trainer_desc.about').not().isEmpty().escape()]