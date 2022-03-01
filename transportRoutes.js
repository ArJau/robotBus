const express = require('express');
const apiRouter = express.Router();
var circuitRepo = require('./dao/circuitRepo');

//var mongoose = require('mongoose');

var PersistentCircuitModel;
circuitRepo.init(
    function(model){
        PersistentCircuitModel = model;
        
    }
)

apiRouter.route('/transport-api/public/circuit')
.get( function(req , res  , next ) {
    var criteria = {created_at : "2022-02-04"};
    var lstUrl = [];
    PersistentCircuitModel.find(criteria, function(err, lstCircuits){
        if(err){
            console.log("err: " + err);
        }
        console.log(lstCircuits);
        /*for (i in lstCircuits){
            let circuit =  lstCircuits[i];
            lstUrl.push(circuit.ressources[0].original_url);
        }*/
        res.send(lstCircuits[0]);
    });
    
   
});

exports.apiRouter = apiRouter;