module.exports = function (app) {

    app.use('/fileupload', require('./helpers/fileUpload'));

    app.use('/STP', require('./setup/auth'));

    app.use('/ADM', require('./adminpanel/adminAuth'));
    app.use('/ADM', require('./adminpanel/dashboard'));
    app.use('/ADM', require('./adminpanel/trainersMatches'));
    app.use('/ADM', require('./adminpanel/analytics'));

    app.use('/USR', require('./userflow/user'));
    app.use('/USR', require('./userflow/matchingTrainer'));
    app.use('/USR', require('./userflow/trainerList'));
    app.use('/USR', require('./userflow/reject'));
    app.use('/USR', require('./userflow/like'));
    app.use('/USR', require('./userflow/rate'));
    app.use('/USR', require('./userflow/feature-review'));

    app.use('/TNR', require('./trainerflow/matchingUser'));
    app.use('/TNR', require('./trainerflow/usersList'));

    app.use('/conversations', require('./chat/conversation'));
    app.use('/messages', require('./chat/message'));
    app.use('/block', require('./chat/block'));

    app.use('/', require('./oauth/authRoute'))

    app.use('/payment', require('./payment/stripe'))
    app.use('/payment', require('./payment/customers'))

    app.use('/', require('./helpers/data-reducer'))

    app.use('/push', require('./push-notification/push-notification'))
}