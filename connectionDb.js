var mongoose = require('mongoose');
var mongoDbUrl = 'mongodb://127.0.0.1:27017'; //by default

async function initDb(dbName){
    mongoose.connect(mongoDbUrl, { useNewUrlParser: true, useUnifiedTopology: true, dbName : dbName });
    var db = mongoose.connection;
    db.on('error' , function() { 
        console.log("mongoDb connection error = " + " for dbUrl=" + mongoDbUrl  + "/" + dbName);
    });
    db.once('open', function() {
    // we're connected!
    console.log("Connected correctly to mongodb database: "  + mongoDbUrl  + "/" + dbName);
    });
    return db;
}


module.exports.initDb = initDb;