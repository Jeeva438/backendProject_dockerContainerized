var cluster = require('cluster');
var dotenv = require('dotenv');

if (cluster.isMaster) {
    var numWorkers = require('os').cpus().length;
    console.log(numWorkers);
    for (var i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('exit', function (worker, code, signal) {
        cluster.fork();
    });
} else {

    const express = require('express');
    const bodyParser = require('body-parser');
    const helmet = require('helmet')
    const morgan = require('morgan');
    const app = express();
    // const server = require('http').Server(app)
    const cookieParser = require('cookie-parser')
    const passport = require('passport');
    const expressSession = require('express-session');
    const MemoryStore = require('memorystore')(expressSession)

    app.use(helmet());

    // parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: false }))

    // parse application/json
    app.use(bodyParser.json())
    app.use(express.json())
    app.use(cookieParser())

    app.use(function (req, res, next) {

        // Website you wish to allow to connect
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        // Request headers you wish to allow
        // res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        res.setHeader('Access-Control-Allow-Headers', '*');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', false);

        // Pass to next layer of middleware
        next();
    });

    app.use(expressSession({
        secret: "random",
        resave: true,
        saveUninitialized: true,
        // setting the max age to longer duration
        maxAge: 24 * 60 * 60 * 1000,
        store: new MemoryStore(),
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/', (req, res) => {
        res.send('server is running...')
    })

    dotenv.config();
    app.set('port', process.env.PORT || 5002)

    require('./app')(app);

    // morgan gives us http request logging
    app.use(morgan('dev'));

    // middleware function to catch 404 error
    app.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    // global error handler
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.json({ "message": err.message });
    });

    const server = app.listen(app.get('port'), () => {
        console.log('Express server is listening on port ' + server.address().port + ' - ' + process.pid);
    })

    module.exports = server
    require('./socket')


}