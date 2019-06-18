var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');

//Rutas
var userRouter = require('./routes/user');
var loginRouter = require('./routes/login');
var competitionRouter = require('./routes/competition');
var registerRouter = require('./routes/register');
var videogameRouter = require('./routes/videogame');
var friendsRouter = require('./routes/friends');
var messagesRouter = require('./routes/messages');
var teamRouter = require('./routes/team');
var ownCompetitionRouter = require('./routes/owncompetition');
var testRouter = require('./routes/test');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Implementación de bodyparser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Enlazarla petición del cliente con su ruta
app.use('/user', userRouter);
app.use('/login',loginRouter);
app.use('/competition',competitionRouter);
app.use('/register',registerRouter);
app.use('/videogames',videogameRouter);
app.use('/friends',friendsRouter);
app.use('/messages',messagesRouter);
app.use('/team',teamRouter);
app.use('/owncompetition',ownCompetitionRouter);
app.use('/',testRouter);

//Jobs
var competitionExpired = require("./jobs/competitionExpired");
competitionExpired.start();


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
