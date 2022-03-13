const fs = require('fs');
const os = require('os');
const path = require('path');

const unzipStream = require('unzip-stream');
var request = require('request');
const lineReader = require('line-reader');
const csvtojson = require('csvtojson');

var modelRepo = require('./model');

var ressource = "ressources/";
var PersistentCircuitModel;
var dateDeb = new Date();

async function init(){

    await modelRepo.initModels();
    let map = modelRepo.mapModel();
    PersistentCircuitModel = map.get("circuits");

    /*circuitRepo.init(
    function(model){
        PersistentCircuitModel = model;
    });*/

    var criteria;
    //criteria = {"resources.metadata.modes" : "bus"};
    //criteria = {"id": "56b0c2fba3a7294d39b88a86"};
    criteria = {};
    //a faire 620c150a0171135d9b35ecc6
    //a faire 6036e9df9d7c9b462c7ce5a4
    //56b0c2fba3a7294d39b88a86 : toulouse
    var lstUrl = [];
    var lstUrlRt = [];
    
    PersistentCircuitModel.find(criteria, async function(err, lstCircuits){
        if(err){
            console.log("err: " + err);
        }
        //lstCircuits = lstCircuits.slice(0,10);
        //nbCircuits = lstCircuits.length;
        
        for (i in lstCircuits){
            let circuit = lstCircuits[i];    
            if (circuit.resources){
                let url;
                let format; 
                let id = circuit.id;
                let resource;
                for (let numResource in circuit.resources){// a faire prendre les derniers fichier mis a jour
                    //console.log("numResource: "+ numResource);
                    resource = circuit.resources[numResource][0];
                    url = resource.original_url;
                    format = resource.format;

                    if (format == "GTFS" & url.startsWith("http")){
                        lstUrl.push({id : id, url:url});
                    }else{
                        log("FORMAT: " + format + ", URL: " + url + ", id: " + id);
                    }
                   
                }
                //console.log(url);
            }
            else{
                log("Resource inexistante id: " + id, true);
            }
        }
        //console.log(lstUrl);
        //await loadReseaux(lstUrl);
        //await loadReseauxInDB(lstUrl);
        consolidationTrajet();
        
    });
}

async function loadReseaux(lstUrl){
    let nb = lstUrl.length;
    for(i in lstUrl){
        let url = lstUrl[i].url;
        let id = lstUrl[i].id;
        let indice = (Number(i)+1) + "/" + nb;
        try{
            log("ZIP, " + indice + ", id: "+ id + ", url: " + url , true);
            await analyseURL(lstUrl[i]);
        }catch(err){
            log("analyseURL: " + err);
        }
    }
}

async function analyseURL(urlObj){
    let id = urlObj.id;
    let url = urlObj.url;
    let file = ressource + id + '.zip';

    return new Promise( (resolve, reject) => {
        try{
            request.get(url)
            .on('response', function (response) {
                if (response.statusCode == 200){//200 c'est ok
                    try{
                        resolve(loadAndDezip(url, file, id));
                    }catch(er){
                        reject(log("erreur lors du loadAndDezip, id : " + id + ", url : " + url + ", err : " + er), true);
                    } 
                }else{
                    reject(log("Erreur du server, code: " + response.statusCode + ", id: "+  id), true);
                }
            }).on('error', ()=>{
                reject(log("Le server ne repond pas, id: "+  id), true);
            });
        }catch(err){
            reject(log("erreur, id : " + id + ", url : " + url + ", err : " + err), true);
        } 

    })    
}

async function loadAndDezip(url, file, id){
        return new Promise( (resolve, reject) => {
            try{
            request.get(url)
            .pipe(fs.createWriteStream(file))
            .on('close', function () {
                    try{
                        fs.createReadStream(file)
                        .pipe(unzipStream.Extract({ path: ressource + id })
                            .on('error', (error)=>{
                                reject(log("DEZIP KO. id: " + id + ", error:" + error), true)
                            }))
                        .on('close', function () {
                            resolve(log("DEZIP OK. id: " + id ));
                            }
                        )
                    }catch(er){
                        reject(log("DEZIP KO. id: " + id ), true);
                }
            });

        }catch(err){
            reject(log("loadAndDezip KO. id: " + id ), true);
        }
    });
 
}


async function loadReseauxInDB(lstUrl){
    await modelRepo.reInitCollections();
    const fs = require('fs');
    for (let i in lstUrl){
        let rep = ressource + lstUrl[i].id;
        await analyseRep(rep, lstUrl[i].id);
    }
    await endTime();
}

async function endTime(){
    const dateFin = new Date();
    log("FINI. Temps:" + ((dateFin - dateDeb)/1000), true);
}

async function analyseRep(rep, id){
    if (fs.existsSync(rep)) {
        let files = fs.readdirSync(rep);
        let directory = [];
        let continu = true;
        for (const fileName of files) {
            const fileStat = fs.lstatSync(path.join(rep, fileName));
            let map = modelRepo.mapFichier();
            if (map.has(fileName)){
                await csvToDB(rep + "/" + fileName, id, map.get(fileName));
                continu = false;
            }else if (fileStat.isDirectory()){
                directory.push(rep + "/" + fileName);
            }
        }
        if (continu){
            for (let i in directory){
                analyseRep(directory[i], id);
            }
        }
    }
}
/**
 * Import du fichier en base de donnée. 
 * Chaque fichier est découpé en bloc de 20000 lignes pour etre inseré en base pour éviter les probleme de mémoires
 * @param {*} fileName 
 * @param {*} id 
 * @param {*} model 
 */
 async function csvToDB(fileName, id, model){
    //return new Promise((resolve, reject)=>{
        try{
            let premiereLigne = "";
            let stringFichier = "";
            let numLigne=0
            lineReader.eachLine(fileName,(line,last)=>{
                if (numLigne==0){
                    premiereLigne = (line + os.EOL);
                }else{
                    stringFichier += (line + os.EOL);
                }
                numLigne++;
                if (numLigne%20000==0 | last){
                    stringFichier = premiereLigne + "\n" + stringFichier;//on rajoute la premiere ligne
                    csvtojson().fromString(stringFichier).then((tableauJson) =>{
                        insertDb(fileName, id, model, tableauJson);
                    });
                    stringFichier = "";
                }

            });
        }
        catch(er){
            //reject(log("DB ERROR" + model + ",id: "+id + " fileName=" + fileName + ", er:" + er, true));
        }
    //});
}

function calculIdPosition(lat, lon){
    lat = Number(lat) + 90;//+90 pour n'avoir que des valeur positive
    lon = Number(lon) + 180;// +180 pour n'avoir que des valeur positive
    let idPosition;
    let sLat = ""+ (Math.floor(lat*10));
    let sLon =  ""+ (Math.floor(Math.floor(Math.floor(lon*10)/2))*2);

    idPosition  = sLat + sLon;
    return idPosition;
}

async function insertDb(fileName, id, model, tableauJson){
    return new Promise((resolve, reject)=>{
        try{
            for (let i in tableauJson) {
                tableauJson[i]["id"] = id;

                if (model == "stops"){
                    tableauJson[i]["idPosition"] = calculIdPosition(tableauJson[i].stop_lat, tableauJson[i].stop_lon);
                }
            }
           
            //console.log(tableauJson);
            let map = modelRepo.mapModel();
            map.get(model).insertMany(tableauJson, (err, result) => {
                if (err){
                    reject(log("CSV ERROR" + model + ",id: "+id + " fileName=" + fileName, true));
                }
                if(result){
                    resolve(log("CSV " + model + ",lignes:," + tableauJson.length + ", id: "+id + ", fileName=" + fileName, true));
                }
            });
        }catch(er){
            reject(log("CSV ERROR" + model + ",id: "+id + " fileName=" + fileName + ", er:" + er, true));
        }
    });
}

class Trajet{
    id;
    route_text_color;
    route_color;
    route_long_name;
    route_short_name;
    route_id;
    idPosition = [];
    stops  = [];
}

/**
 * Conncaténation de la table routes, trip, stop, et stops_time 
 * afin de créer une nouvelle table optimisée pour le requetage.
 */
async function consolidationTrajet(){
    let map = modelRepo.mapModel();
    let RoutesCollec = map.get("routes");
    let TripsCollec = map.get("trips");
    let StopTimesCollec = map.get("stop_times");
    let StopsCollec = map.get("stops");

    let criteriaRoute = {id:"56b0c2fba3a7294d39b88a86"};
    let lstTrajet = [];
    await RoutesCollec.find(criteriaRoute, async function(err, lstRoutes){//on récupere toutes les routes
        if(err){console.log("err: " + err);}
        
        for (let numRoute in lstRoutes){
            let trajet = new Trajet();
            let route = lstRoutes[numRoute];
            if(route.route_short_name == "101"){


            //log(numRoute + " : route.route_long_name : " + route.route_long_name)
            //trajet.id = route.id;
            trajet.route_id = route.route_id;
            trajet.route_long_name = route.route_long_name;
            trajet.route_short_name = route.route_short_name;
            trajet.route_text_color = route.route_text_color;
            trajet.route_color = route.route_color;
            let criteriaTrip = {id:route.id, route_id:route.route_id};
            await TripsCollec.find(criteriaTrip, async function(err, lstTrips){//on récupere le premier trip de chaque route
                let trip = lstTrips[0];
                if(err){console.log("err: " + err);}
                //log("trip.trip_headsign : " + trip.trip_headsign);

                let criteriaStopTimes = {id : trip.id , trip_id : trip.trip_id};
                await StopTimesCollec.find(criteriaStopTimes, async function(err, lstStopsTime){//on recupere tous les stops du trip
                    for (let numStopTime in lstStopsTime){//on boucle sur chaque stopTime 
                        let stopTime = lstStopsTime[numStopTime];
                        if(err){console.log("err: " + err);}
                        //log("stopTime.stop_sequence : " + stopTime.stop_sequence);

                        let criteriaStop = {id : stopTime.id , stop_id : stopTime.stop_id};
                        await StopsCollec.find(criteriaStop, async function(err, lstStop){//pour enfin recuperer chaque stop
                            if(err){console.log("err: " + err);}

                            stops = new Stops();
                            let stop = lstStop[0];
                            stops.id = stop.id;
                            stops.stop_name = stop.stop_name;
                            stops.idPosition = calculIdPosition(stop.stop_lat, stop.stop_lon);
                            stops.stop_lat = stop.stop_lat;
                            stops.stop_lon = stop.stop_lon;
                            stops.stop_sequence = stopTime.stop_sequence;
                            trajet.stops.push(stops);
                            //trajet.stops.push(filtreStops(lstStops));
                            //trajet.stops[trajet.stops.length-1].stop_sequence = stopTime.stop_sequence;
                        }).clone();
                    }
                    let mapIdPosition = new Map();
                    for (numStop in trajet.stops){
                        let stop  = trajet.stops[numStop];
                        if (!mapIdPosition.get(stop.idPosition)){
                            mapIdPosition.set(stop.idPosition, stop.idPosition);
                        }
                    }
                    trajet.idPosition.push(Array.from(mapIdPosition.values()));
                    let lstTrajet = []
                    lstTrajet.push(trajet);
                    insertDb("pas de fichier", route.id, "trajets", lstTrajet);

                    //lstTrajet.push(trajet);
                    //log(JSON.stringify(trajet));
                }).clone();
            }).clone().limit(1);
        }
        
        }
    }).clone();
}

class Stops{
    id;
    coord = [];
    stop_name;
    stop_sequence;
    stop_lat;
    stop_lon;
    idPosition;
}

function filtreStops(lstStops){
    let map = new Map();
    let stops;
    let stop;
    for (let i in lstStops){
        stop = lstStops[i];
        if (!map.get(stop.stop_name)){
            stops = new Stops();
            stops.id = stop.id;
            stops.stop_name = stop.stop_name;
            stops.idPosition = calculIdPosition(stop.stop_lat, stop.stop_lon)
            map.set(stop.stop_name, stops);
        }
        map.get(stop.stop_name).coord.push({lon:stop.stop_lon, lat:stop.stop_lat});
        
    }
    return Array.from(map.values());
}



function log(txt, isFichier){
    const date = new Date();
    const content = date.toISOString()  + ", " + txt;

    if (isFichier){
        var nomFichier = date.getUTCFullYear() + (pad(date.getUTCMonth()+ 1)) + date.getUTCDate() + ".log";
       
        fs.appendFile('log/' + nomFichier, content + "\n", function (err) {
            if (err) {throw err};
        });
    }
    console.log(content);
}

function pad(number) {
    if ( number < 10 ) {
      return '0' + number;
    }
    return Number(number);
}

init();

module.exports.init = init;