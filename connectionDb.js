var mongoose = require('mongoose');
var mongoDbUrl = 'mongodb://127.0.0.1:27017';
const mysql = require('mysql');

async function initDb(dbName){
    mongoose.connect(mongoDbUrl, { useNewUrlParser: true, useUnifiedTopology: true, dbName : dbName });
    const db = mongoose.connection;
    db.on('error' , function() { 
        console.log("mongoDb connection error = " + " for dbUrl=" + mongoDbUrl  + "/" + dbName);
    });
    db.once('open', function() {
    // we're connected!
    console.log("Connected correctly to mongodb database: "  + mongoDbUrl  + "/" + dbName);
    });
    return db;
}

async function initDbMysql(){
    const db = mysql.createConnection({
        database: "transport",
        host: "127.0.0.1",
        user: "admTransport",
        password: "admin"
    });
    db.connect(function(err) {
        if (err) throw err;
        console.log("Connecté à la base de données MySQL!");
      });
    return db;
}

module.exports.initDb = initDb;
module.exports.initDbMysql = initDbMysql;