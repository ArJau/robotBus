var mongoose = require('mongoose');

var db;

var genericShema;//mongoose Shcema (structure of mongo document)
var PersistentModel; //mongoose Model (constructor of persistent PersistentCircuitModel)

var init = function(db, collectionName, jsonShema ,  callbackWithPersistentModel) {
    mongoose.Connection = db;
    genericShema = new mongoose.Schema(jsonShema);
    //genericShema.set('id',false); //no default virtual id alias for _id
    genericShema.set('toJSON', { //virtuals: true , 
                                versionKey:false,
                                transform: function (doc, ret) {   delete ret._id  }
                                });
                                
    //console.log("mongoose genericShema : " + JSON.stringify(genericShema) );
    PersistentModel = mongoose.model(collectionName, genericShema);
    
    //console.log("mongoose PersistentCircuitModel : " + PersistentCircuitModel );
    if(callbackWithPersistentModel)
        callbackWithPersistentModel(PersistentModel);
}

module.exports.init=init;