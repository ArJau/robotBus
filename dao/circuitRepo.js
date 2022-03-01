var mongoose = require('mongoose');
var connectionDb = require('../connectionDb');

var db;

var circuitsSchema;//mongoose Shcema (structure of mongo document)
var PersistentCircuitModel; //mongoose Model (constructor of persistent PersistentCircuitModel)

var init = function(callbackWithPersistentCircuitModel) {
    db = connectionDb.initDb('TransportHoraire');
    mongoose.Connection = db;
    circuitsSchema = new mongoose.Schema(
    {
        
        "_id": {
            "primaryKey": true,
            "type": "Object",
            "required": true
        },
        "aom": {
            "type": "Object",
            "structure": {
                "name": {
                    "key": true,
                    "type": "undefined",
                    "required": false
                },
                "siren": {
                    "type": "string",
                    "required": true
                }
            },
            "required": true
        },
        "community_resources": {
            "type": "Array",
            "required": true
        },
        "covered_area": {
            "type": "Object",
            "structure": {
                "name": {
                    "key": true,
                    "type": "string",
                    "required": true
                },
                "region": {
                    "type": "Object",
                    "structure": {
                        "name": {
                            "type": "string",
                            "required": true
                        }
                    },
                    "required": true
                },
                "aom": {
                    "type": "Object",
                    "structure": {
                        "name": {
                            "key": true,
                            "type": "string",
                            "required": true
                        },
                        "siren": {
                            "type": "string",
                            "required": true
                        }
                    },
                    "required": true
                },
                "cities": {
                    "type": "Array",
                    "required": true
                },
                "type": {
                    "type": "string",
                    "required": true
                },
                "country": {
                    "type": "Object",
                    "structure": {
                        "name": {
                            "type": "string",
                            "required": true
                        }
                    },
                    "required": true
                }
            },
            "required": true
        },
        "created_at": {
            "type": "string",
            "required": true
        },
        "datagouv_id": {
            "key": true,
            "type": "string",
            "required": true
        },
        "id": {
            "key": true,
            "type": "string",
            "required": true
        },
        "page_url": {
            "type": "string",
            "required": true
        },
        "publisher": {
            "type": "Object",
            "structure": {
                "name": {
                    "type": "string",
                    "required": true
                },
                "type": {
                    "key": true,
                    "type": "string",
                    "required": true
                }
            },
            "required": true
        },
        "resources": {
            "type": "Array",
            "required": true
        },
        "slug": {
            "key": true,
            "type": "string",
            "required": true
        },
        "title": {
            "key": true,
            "type": "string",
            "required": true
        },
        "type": {
            "key": true,
            "type": "string",
            "required": true
        },
        "updated": {
            "type": "string",
            "required": true
        }
    
    }
    );
    //circuitsSchema.set('id',false); //no default virtual id alias for _id
    circuitsSchema.set('toJSON', { //virtuals: true , 
                                versionKey:false,
                                transform: function (doc, ret) {   delete ret._id  }
                                });
                                
    //console.log("mongoose circuitsSchema : " + JSON.stringify(circuitsSchema) );
    PersistentCircuitModel = mongoose.model('circuit', circuitsSchema);
    
    //console.log("mongoose PersistentCircuitModel : " + PersistentCircuitModel );
    if(callbackWithPersistentCircuitModel)
        callbackWithPersistentCircuitModel(PersistentCircuitModel);
}

module.exports.init=init;