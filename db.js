var mysql = require('mysql');
const config = require('./config');

//local mysql db connection
var connection = mysql.createConnection(config.mysqlConnection);

connection.connect(function(err) {
    if (err)
        throw err;
});

module.exports = connection;