var mongoose = require('mongoose');
var connectionDb = require('../connectionDb');

var db;

var genericShema;//mongoose Shcema (structure of mongo document)
var PersistentCircuitModel; //mongoose Model (constructor of persistent PersistentCircuitModel)

var init = function(dbName, collectionName, jsonShema ,  callbackWithPersistentCircuitModel) {
    db = connectionDb.initDb(dbName);
    mongoose.Connection = db;
    genericShema = new mongoose.Schema(jsonShema);
    //genericShema.set('id',false); //no default virtual id alias for _id
    genericShema.set('toJSON', { //virtuals: true , 
                                versionKey:false,
                                transform: function (doc, ret) {   delete ret._id  }
                                });
                                
    //console.log("mongoose genericShema : " + JSON.stringify(genericShema) );
    PersistentCircuitModel = mongoose.model(collectionName, genericShema);
    
    //console.log("mongoose PersistentCircuitModel : " + PersistentCircuitModel );
    if(callbackWithPersistentCircuitModel)
        callbackWithPersistentCircuitModel(PersistentCircuitModel);
}

module.exports.init=init;