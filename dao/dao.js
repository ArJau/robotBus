const Agency = require("../model/db/Agency");
const Calandar = require("../model/db/Calandar");
const CalendarDates = require("../model/db/CalendarDates");
const Routes = require("../model/db/Routes");
const Shapes = require("../model/db/Shapes");
const StopTimes = require("../model/db/StopTimes");
const Stops = require("../model/db/Stops");
const Trips = require("../model/db/Trips");
const fs = require('fs');
const path = require('path');

var mapDao = new Map();
var mapDaoAlias = new Map();
var mapObjetPrincipale = new Map();
var listObjet = [];

function castJSON(jsonObject, object) {
    // otherwise create a new object of type specified
    if (jsonObject.length){//si c'est un tableau
        let tabResult = [];
        for (let i in jsonObject){
           tabResult.push(mapObjectField(jsonObject[i], object));
        }
        return tabResult;
    }
    else{
        mapObjectField(jsonObject, object)
        return obj;
    }
}

function mapObjectField(jsonObject, object){
    let mapObjetSecondaire = new Map();
    let objetPrincipale = eval("new " + object + "()");//objet principale
    let idObjetPrincipale = jsonObject[object.toLowerCase() + "_id"];
    if (!mapObjetPrincipale.get(idObjetPrincipale)){
        objetPrincipale.id = idObjetPrincipale;
        mapObjetPrincipale.set(idObjetPrincipale, objetPrincipale);
        listObjet.push(idObjetPrincipale);
    }
    
    for(let champRequete in jsonObject){
        let champ = champRequete.substring(champRequete.indexOf("_") + 1);
        let objectRequete = champRequete.substring(0, champRequete.indexOf("_"));
        if (object.toLowerCase() == objectRequete){
            mapObjetPrincipale.get(idObjetPrincipale)[champ] = jsonObject[champRequete];
        }else{
            let objectJson = mapDaoAlias.get(objectRequete);
            if (!mapObjetSecondaire.get(objectJson)){
                let objSec = eval("new " + objectJson + "()");//objets secondaire
                objSec.id = jsonObject[objectRequete + "_id"];
                mapObjetSecondaire.set((objectJson), objSec);
            }
            mapObjetSecondaire.get(objectJson)[champ] = jsonObject[champRequete];
        }
    }

    let lstObjetSecond = Array.from(mapObjetSecondaire.keys());
    for (let i in lstObjetSecond){
        let objectSec = mapObjetSecondaire.get(lstObjetSecond[i]);
        let lstChamps = mapDao.get(objectSec);
        for (let j in lstChamps){
            if (lstChamps[j].startWith("lst_")){
                let objectJson = lstChamps[j].substring(lstChamps[j].indexOf("_") + 1);
                if (mapObjetSecondaire.get(objectJson)){
                    eval("objectSec." + lstChamps[j] + ".push(mapObjetSecondaire.get(objectJson))");
                }
            }
        }
    }
    
    let lstChamps = mapDao.get(object);
    for (let j in lstChamps){
        if (lstChamps[j].startWith("lst_")){
            let objectJson = lstChamps[j].substring(lstChamps[j].indexOf("_") + 1);
            if (mapObjetSecondaire.get(objectJson)){
                eval("mapObjetPrincipale.get(idObjetPrincipale)." + lstChamps[j] + ".push(mapObjetSecondaire.get(objectJson))");
            }
        }
    }
}

async function initSchemaDataBase(){
    const directoryPath = path.join('./model/db');
    let files = fs.readdirSync(directoryPath);
 
    files.forEach(async function (file) {
        file  = file.replace(".js", "")
        let obj = eval('new '+file+'()');
        mapDao.set(file, Object.getOwnPropertyNames(obj));
        mapDaoAlias.set(file.toLocaleLowerCase(), file);
    });
}

function getMapDao(){
    return mapDao;
}

function init(){
    //console.log(castJSON({url:2, tel:"fgzer"}, "Agency"));
    initSchemaDataBase().then(()=>{
        console.log(getMapDao());
    });
}

init();

module.exports.getMapDao = getMapDao;