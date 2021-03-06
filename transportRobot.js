const fs = require('fs');

const unzipStream = require('unzip-stream');
var request = require('request');
const nReadlines = require('n-readlines');

var modelRepo = require('./model');
const UrlReseau = require('./model/urlReseau.js');
const Pos = require('./model/pos.js');
const Agence = require('./model/agence.js');
const Trajet = require('./model/trajet.js');
const Stops = require('./model/stops.js');

var connectionDbMysql = require('./connectionDb.js');

var ressource = "ressources/";
var PersistentCircuitModel;
var dateDeb = new Date();
var dbMySql;

var tabColor = [
    "641e16", "c0392b", "633974", "af7ac5", "6c3483", "5499c7", 
    "117864", "1abc9c", "27ae60", "2ecc71", "7d6608", "d4ac0d", 
    "f7dc6f", "b9770e", "d68910", "ba4a00", "7b7d7d", "aab7b8", 
    "17202a", "566573", "58d68d", "FF0000", "00FFFF","FF00FF", 
    "0000FF", "00FF00","FFFF00", "008000", "FF69B", "FFA500"];

async function init() {
    await modelRepo.initModels();
    var mapUrl = await recupereUrl();
    //await loadReseaux(mapUrl);
    //await loadReseauxInDB(mapUrl);

    dbMySql = connectionDbMysql.initDbMysql();
    
}

async function recupereUrl() {
    return new Promise((resolve, reject) => {
        try {
            let map = modelRepo.mapModel();
            let mapUrl = new Map();
            PersistentCircuitModel = map.get("circuits");

            var criteria;
            criteria = { "resources.metadata.modes": "bus" };
            //criteria = { "id": "55ffbe0888ee387348ccb97d" };//brest
            //criteria = {"id": "5cedcdca9ce2e74f4ec3af03"};//test
            //criteria = { "id": "61fd32feaa59c5ebde258f2d" };//Quimper Bretagne Occidentale
            //criteria = { "id": "5dfa54b46f44417bc185117a" };
            //criteria = {};
            //a faire 620c150a0171135d9b35ecc6
            //a faire 6036e9df9d7c9b462c7ce5a4
            //criteria = { "id": "56b0c2fba3a7294d39b88a86" };//toulouse
            /*criteria = { "id": {$in: [
            "600175b2496819e24a71a80c",
            "615fd9d5bbb0c1c35fe86fe3"
            ] } }*/

            PersistentCircuitModel.find(criteria, async function (err, lstCircuits) {
                if (err) {
                    console.log("err: " + err);
                }
                
                for (i in lstCircuits) {
                    let circuit = lstCircuits[i];
                    if (circuit.resources) {
                        let url;
                        let format;
                        let id = circuit.id;
                        let resource;
                        let numResourceSave = -1;
                        let updated;
                        let indiceGTFS = 0;
                        for (let numResource in circuit.resources) {
                            //console.log("numResource: "+ numResource);
                            resource = circuit.resources[numResource][0];
                            url = resource.original_url;
                            format = resource.format;


                            if (format == "GTFS" & url.startsWith("http")) {
                                if (indiceGTFS == 0) {
                                    updated = new Date(resource.updated);
                                    indiceGTFS++;
                                }
                                if (updated.getTime() <= new Date(resource.updated).getTime()) {
                                    updated = new Date(resource.updated);
                                    numResourceSave = numResource;//on prend le dernier
                                }
                            } else if (format == "gtfs-rt") {
                                if (!mapUrl.get(id)) {
                                    mapUrl.set(id, new UrlReseau())
                                }
                                let urlReseau = mapUrl.get(id)
                                urlReseau.rt = true;
                                urlReseau.id = id;
                            } else {
                                //log("FORMAT: " + format + ", URL: " + url + ", id: " + id);
                            }
                        }
                        if (numResourceSave != -1) {
                            if (!mapUrl.get(id)) {
                                mapUrl.set(id, new UrlReseau())
                            }
                            let urlReseau = mapUrl.get(id)
                            urlReseau.id = id;
                            urlReseau.title = circuit.title;
                            urlReseau.name = circuit.aom?circuit.aom.name:null;
                            urlReseau.url = circuit.resources[numResourceSave][0].original_url;
                            numResourceSave = -1;//on reinitialise la varible pour le prochain
                        }
                        //console.log(url);
                    }
                    else {
                        log("Resource inexistante id: " + id, true);
                    }
                }
                resolve(mapUrl);
            });
        } catch (err) {
            reject();
        }
    });
}

async function loadReseaux(mapUrl) {
    for (const [id, urlReseau] of mapUrl) {
        let url = urlReseau.url;
        let indice = (Number(i) + 1);
        try {
            log("ZIP, " + indice + ", id: " + id + ", url: " + url, true);
            await analyseURL(urlReseau);
        } catch (err) {
            log("analyseURL: " + err);
        }
    }
}



async function analyseURL(urlObj) {
    let id = urlObj.id;
    let url = urlObj.url;
    let file = ressource + id + '.zip';

    return new Promise((resolve, reject) => {
        try {
            request.get(url)
                .on('response', async function (response) {
                    if (response.statusCode == 200) {//200 c'est ok
                        try {
                            await loadAndDezip(url, file, id);
                            resolve();
                        } catch (er) {
                            reject(log("erreur lors du loadAndDezip, id : " + id + ", url : " + url + ", err : " + er), true);
                        }
                    } else {
                        resolve(log("Erreur du server, code: " + response.statusCode + ", id: " + id), true);
                    }
                }).on('error', () => {
                    resolve(log("Le server ne repond pas, id: " + id), true);
                });
        } catch (err) {
            resolve(log("Erreur analyseURL. id : " + id + ", url : " + url + ", err : " + err), true);
        }

    })
}

async function loadAndDezip(url, file, id) {
    return new Promise((resolve, reject) => {
        try {
            request.get(url)
                .pipe(fs.createWriteStream(file))
                .on('close', async function () {
                    try {
                        fs.createReadStream(file)
                            .pipe(unzipStream.Extract({ path: ressource + id })
                                .on('error', (error) => {
                                    log("DEZIP KO. id: " + id + ", error:" + error), true
                                    resolve()
                                }))
                            .on('close', function () {
                                log("DEZIP OK. id: " + id)
                                resolve();
                            }
                            )
                    } catch (er) {
                        log("DEZIP KO. id: " + id), true
                        resolve();
                    }
                });

        } catch (err) {
            log("loadAndDezip KO. id: " + id, true);
            reject();
        }
    });

}

/**
 * Boucle sur chaque r??seau de bus trouv??, 
 *  - Analyse le r??pertoire dezipper en local et met en base les donn??es.
 *  - Consolide le trajet pour facilit?? le requetage par le client
 * 
 * @param {*} mapUrl 
 */
async function loadReseauxInDB(mapUrl) {
    
    let i=0;
    for (const [id, urlReseau] of mapUrl) {
        let rep = ressource + id;
        i++;
        log((i +  "/" + mapUrl.size) + " ********************************** Circuit: " + urlReseau.title, true);
        let criteria  = { "id": id };
        await modelRepo.reInitCollections(criteria);//suppression des donn??es existantes
        await analyseRep(rep, urlReseau);
        await consolidationTrajet(id, mapUrl);
        await modelRepo.reInitCollectionsTemp();//suppression des table temporaires utiliser pour le calcul pr??cedent 
        await insertDbBasic('reseau-descs', mapUrl.get(id));
    }
    //await insertDbBasic('reseau-descs', Array.from(mapUrl.values()));
    endTime();
}

function endTime() {
    const dateFin = new Date();
    log("FINI. Temps:" + ((dateFin - dateDeb) / 1000), true);
}

/**
 * Analyse des r??pertoires o?? les zip sont stock??s
 * @param {*} rep 
 * @param {*} id 
 * @returns 
 */
async function analyseRep(rep, urlReseau) {
    return new Promise(async (resolve, reject) => {
        try {
            if (fs.existsSync(rep)) {
                let mapModelRepo = modelRepo.mapFichier();
                let fichiers = Array.from(mapModelRepo.keys());
                for (let i in fichiers) {
                    log("analyse du fichier: " + fichiers[i])
                    let fileName = rep + "/" + fichiers[i];
                    if (fs.existsSync(fileName)) {
                        await analyseFichier(fileName, urlReseau, mapModelRepo.get(fichiers[i]));
                    }
                }
                resolve();
            } else {
                resolve();
            }
        } catch (err) {
            reject();
        }
    });
}

/**
 * Transformation d'un fichier csv en json
 */
function csvToJson(titre, contenu) {
    try {
        if (contenu.trim() == ""){
            return;
        }
        let tabTitre = titre.replace("o;?", "").replace(/(\r\n|\n|\r)/gm, "").trim().split(",");
        let tabContenu = contenu.replaceAll("o;?", "").replace(/(\r\n|\n|\r)/gm, "").trim().split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        let result = "{";
        for (i in tabTitre) {
            if (tabContenu[i]){
                result += "\"" + tabTitre[i].replaceAll("\"", "") + "\":\"" + tabContenu[i].replaceAll("\"", "") + "\",";
            }
        }
        result = result.substring(0, result.length - 1); //on enleve la derniere ","
        result += "}";
        return JSON.parse(result);
    } catch (err) {
        log("Error parsing CSV titre: " + titre + ". contenu:" + contenu)
    }

}
/**
 * Import du fichier en base de donn??e. 
 * Chaque fichier est d??coup?? en bloc de 20000 lignes pour etre inser?? en base pour ??viter les problemes de m??moires
 * @param {*} fileName 
 * @param {*} id 
 * @param {*} model 
 */
async function analyseFichier(fileName, urlReseau, model) {
    return new Promise(async (resolve, reject) => {
        try {
            let premiereLigne = "";
            const broadbandLines = new nReadlines("./" + fileName);
            fichierJson = [];
            let line;
            let numLigne = 1;
            while (line = broadbandLines.next()) {
                if (numLigne == 1) {
                    premiereLigne = line.toString('ascii');
                } else {
                    let contenu = csvToJson(premiereLigne, line.toString());
                    if (contenu){
                        fichierJson.push(contenu);
                    }
                }

                numLigne++;
                if (numLigne % 20000 == 0) {
                    await insertFichierDB(fileName, urlReseau, model, fichierJson);
                    fichierJson = [];
                }
            }
            //si il en reste un peu
            if (fichierJson.length > 0) {
                await insertFichierDB(fileName, urlReseau, model, fichierJson);
            }
            resolve();
        }
        catch (er) {
            log("DB ERROR" + model + ",id: " + urlReseau.id + " fileName=" + fileName + ", er:" + er, true)
            resolve();
        }
    });
}

/**
 * Transforme le fichier csc en json pour l'ins??rer en base
 * @param {} fileName 
 * @param {*} urlReseau 
 * @param {*} stringFichier 
 * @param {*} model 
 */
async function insertFichierDB(fileName, urlReseau, model, tableauJson) {
    return new Promise(async (resolve, reject) => {
        try {
            let mapFileTemp = modelRepo.mapFichierTemp();
            fileNameCourt = fileName.substring(fileName.lastIndexOf("/") + 1);

            if (mapFileTemp.has(fileNameCourt)) {//enregistrement dans les tables temporaires
                await insertDb(fileName, urlReseau.id, mapFileTemp.get(fileNameCourt), tableauJson);
            }
            if (urlReseau.rt) {//si on est sur un circuit temp r??el
                await insertDb(fileName, urlReseau.id, model, tableauJson);//on enregistre toute les tables
            } else if (!mapFileTemp.has(fileNameCourt)) {//sinon on enregistre pas les trois tables volumineuse (stops, trips, stop_time) 
                await insertDb(fileName, urlReseau.id, model, tableauJson);
            }
            resolve();
        } catch (err) {
            log("ERROR insertFichierDB: " + err.err, true);
            resolve();
        }
    });
}

function calculIdPosition(lat, lon) {
    lat = Number(lat) + 90;//+90 pour n'avoir que des valeur positive
    lon = Number(lon) + 180;// +180 pour n'avoir que des valeur positive
    let idPosition;
    let sLat = "" + (Math.floor(Math.floor(Math.floor(lat * 10) / 2)) * 2);
    let sLon = "" + (Math.floor(Math.floor(Math.floor(lon * 10) / 6)) * 6);

    idPosition = sLat + sLon;
    return idPosition;
}

async function insertDb(fileName, id, model, tableauJson) {
    return new Promise((resolve, reject) => {
        for (let i in tableauJson) {
            tableauJson[i]["id"] = id;
            if (model == "stops" | model == "temp_stops") {
                tableauJson[i]["idPosition"] = calculIdPosition(tableauJson[i].stop_lat, tableauJson[i].stop_lon);
            }
        }

        let mapModelRepo = modelRepo.mapModel();
        mapModelRepo.get(model).insertMany(tableauJson, async (err, result) => {
            if (err) {
                resolve({ err: err });
            } else {
                log("CSV " + model + ",lignes:," + result.length + ", id: " + id + ", fileName=" + fileName, true);
                resolve();
            }
        });
    });
}

async function insertDbBasic(model, tableauJson) {
    return new Promise((resolve, reject) => {
        let mapModelRepo = modelRepo.mapModel();
        mapModelRepo.get(model).insertMany(tableauJson, async (err, result) => {
            if (err) {
                reject({ err: err });
            } else {
                log("Model " + model + ",lignes:," + result.length, true);
                resolve();
            }
        });
    });
}



/**
 * Conncat??nation de la table routes, trip, stop, et stops_time dans la table Trajet
 * afin de cr??er une nouvelle table optimis??e pour le requetage.
 */
async function consolidationTrajet(id, mapUrl) {
    return new Promise((resolve, reject) => {
        let map = modelRepo.mapModel();
        let RoutesCollec = map.get("routes");

        let criteriaRoute;
        criteriaRoute = { "id": id };
        log("consolidation reseaux: " + id);
        try {
            let center = [];
            RoutesCollec.find(criteriaRoute, async function (err, lstRoutes) {//on r??cupere toutes les routes
                if (err) {
                    console.log("err: " + err);
                }
                log("nombre de routes: " + lstRoutes.length);
                let mapIdPositionTrajet = new Map();
                for (let numRoute in lstRoutes) {
                    try {
                        await analyseRoute(lstRoutes[numRoute], numRoute, center, mapIdPositionTrajet);
                    } catch (err) {
                    }
                }
               

                try {
                    await completeDataReseaux(mapUrl, lstRoutes, id, center, mapIdPositionTrajet);
                } catch (err) {
                }

                resolve();
            }).clone().catch(error => { throw error });
        } catch (err) {
            reject(log(err));
        }
    });
}


async function completeDataReseaux(mapUrl, lstRoutes, id, center, mapIdPositionTrajet) {
    return new Promise((resolve, reject) => {
        try {
            let centerC = [];
            centerC.push((center[0] + center[2]) / 2);
            centerC.push((center[1] + center[3]) / 2);
            mapUrl.get(id).coord = center;
            mapUrl.get(id).center = centerC;
            mapUrl.get(id).nbRoutes = lstRoutes.length;


            let zoom = Math.ceil(center[2] - center[0]);
            if (!zoom) {
                mapUrl.get(id).zoom = 12;
            } else if (zoom <= 2) {
                mapUrl.get(id).zoom = 10;
            } else if (zoom <= 4) {
                mapUrl.get(id).zoom = 9;
            } else if (zoom <= 6) {
                mapUrl.get(id).zoom = 8;
            } else {
                mapUrl.get(id).zoom = 6;
            }

            let lstPositionReseau = [];
            for (const [i, position] of mapIdPositionTrajet) {
                lstPositionReseau.push(position);
            }
            mapUrl.get(id).idPosition = lstPositionReseau;

            let map = modelRepo.mapModel();
            let criteriaAgency = { id: id };
            let agencyCollec = map.get("agencies");
            agencyCollec.find(criteriaAgency, async function (err, lstAgence) {
                for (let i in lstAgence) {
                    let agenceJson = new Agence();
                    let agency = lstAgence[i];
                    agenceJson.url = agency.agency_url;
                    agenceJson.tel = agency.agency_phone;
                    agenceJson.name = agency.agency_name;
                    mapUrl.get(id).agence.push(agenceJson);
                }
                resolve();
            });
        } catch (err) {
            resolve(log("Erreur completeDataReseaux:" + err));
        }
    });

}

async function analyseRoute(route, numRoute, center, mapIdPositionTrajet) {
    return new Promise((resolve, reject) => {
        try {
            let map = modelRepo.mapModel();
            let TripsCollec = map.get("temp_trips");
            let StopTimesCollec = map.get("temp_stop_times");
            let StopsCollec = map.get("temp_stops");
            let shapesCollec = map.get("temp_shapes");
            //if (route.route_short_name == "15") {

            let criteriaTrip = { id: route.id, route_id: route.route_id };
            TripsCollec.find(criteriaTrip, async function (err, lstTrips) {//on r??cupere le premier trip de chaque route
                let trip = lstTrips[0];
                //log("trip.trip_headsign : " + trip.trip_headsign);
                if (trip) {
                    let criteriaStopTimes = { id: route.id, trip_id: trip.trip_id };
                    StopTimesCollec.find(criteriaStopTimes, async function (err, lstStopsTime) {//on recupere tous les stops du trip
                        //log(numRoute + " : route.route_long_name : " + route.route_long_name)
                        let mapStopsStopTime = new Map();
                        for (let numStopTime in lstStopsTime) {//on boucle sur chaque stopTime 
                            let stopsTime = lstStopsTime[numStopTime];
                            mapStopsStopTime.set(stopsTime.stop_sequence, stopsTime.stop_id);//sert pour garder l'ordre des stops
                        }
                        //log("stopTime.stop_sequence : " + stopTime.stop_sequence);

                        let criteriaStop = { id: route.id, stop_id: { $in: Array.from(mapStopsStopTime.values()) } };
                        StopsCollec.find(criteriaStop, async function (err, lstStop) {//pour enfin recuperer chaque stop
                            let trajet = new Trajet();
                            //trajet.id = route.id;
                            trajet.route_id = route.route_id;
                            trajet.route_long_name = route.route_long_name;
                            trajet.route_short_name = route.route_short_name;
                            trajet.route_text_color = route.route_text_color;
                            if (route.route_color){
                                trajet.route_color = route.route_color;
                            }else{//si pas de couleur on en choisi une c'est plus joli.
                                trajet.route_color = tabColor[Math.floor(Math.random()*tabColor.length)];
                            }

                            let mapStop = new Map(); //let mapStop = lstStop.map(lstStop.stop_id => lstStop);
                            for (let numStop in lstStop) {
                                mapStop.set(lstStop[numStop].stop_id, lstStop[numStop]);//sert pour garder l'ordre des stops
                            }

                            for (let numStopTime in lstStopsTime) {
                                let stop = mapStop.get(mapStopsStopTime.get(lstStopsTime[numStopTime].stop_sequence));
                                if (stop) {
                                    let stops = new Stops();
                                    //stops.id = stop.id;
                                    //log("    " + lstStopsTime[numStopTime].stop_sequence + ": " + stop.stop_name)
                                    stops.stop_name = stop.stop_name;
                                    stops.idPosition = calculIdPosition(stop.stop_lat, stop.stop_lon);
                                    stops.stop_id = stop.stop_id;
                                    stops.stop_lat = stop.stop_lat;
                                    stops.stop_lon = stop.stop_lon;
                                    stops.stop_sequence = mapStopsStopTime.get(stop.stop_id);
                                    center = calculCenter(center, stop.stop_lat, stop.stop_lon);
                                    if(!trajet.stops)
                                        trajet.stops = [];
                                    trajet.stops.push(stops);
                                }
                            }

                            let mapIdPosition = new Map();
                            for (numStop in trajet.stops) {
                                let stop = trajet.stops[numStop];
                                if (!mapIdPosition.get(stop.idPosition)) {//gestion de id de position unique au niveau des trajet
                                    mapIdPosition.set(stop.idPosition, stop.idPosition);
                                    let position = new Pos();
                                    position.pos = stop.idPosition;
                                    trajet.idPosition.push(position);
                                }

                                if (!mapIdPositionTrajet.get(stop.idPosition)) {//gestion de id de position unique au niveau des trajet
                                    let position = new Pos();
                                    position.pos = stop.idPosition;
                                    mapIdPositionTrajet.set(stop.idPosition, position);
                                }
                            }

                            let criteriaShape = { id: route.id, shape_id: trip.shape_id };
                            await shapesCollec.find(criteriaShape, function(err, lstShape){//on r??cupere la shape, si elle existe
                                for (let numShape in lstShape) {
                                    let shape = lstShape[numShape];
                                    trajet.shapes.push([shape.shape_pt_lat, shape.shape_pt_lon]);//tableau de coord d??crivant la forme de la route
                                }
                            }).clone().sort({ shape_pt_sequence: -1 }).catch(error => { throw error });

                            let criteriaStopRoute = { stop_id: lstStop[i].stop_id, shape_id: trip.shape_id };
                            await StopTimesCollec.find(criteriaStopRoute, async function (err, lstStopsTime) {
                            });

                            let lstTrajet = [];
                            lstTrajet.push(trajet);
                            insertDb(numRoute + " : long_name : " + route.route_long_name, route.id, "trajets", lstTrajet);
                            return resolve(true);
                        }).clone().catch(error => { throw error });
                    }).clone().sort({ stop_sequence: -1 }).catch(error => { throw error });
                } else {
                    return resolve(true);
                }
            }).clone().limit(1).catch(error => { throw error });

            /*}
            else {
                reject(false);
            }*/
        } catch (err) {
            reject(log(err));
        }

    });
}

function calculCenter(center, lat, lon) {
    if (center.length == 0) {
        center[0] = lat;
        center[1] = lon;
        center[2] = lat;
        center[3] = lon;
    }
    center[0] = Math.min(lat, center[0]);
    center[1] = Math.min(lon, center[1]);
    center[2] = Math.max(lat, center[2]);
    center[3] = Math.max(lon, center[3]);
    return center;
}

function filtreStops(lstStops) {
    let map = new Map();
    let stops;
    let stop;
    for (let i in lstStops) {
        stop = lstStops[i];
        if (!map.get(stop.stop_name)) {
            stops = new Stops();
            stops.id = stop.id;
            stops.stop_name = stop.stop_name;
            stops.idPosition = calculIdPosition(stop.stop_lat, stop.stop_lon)
            map.set(stop.stop_name, stops);
        }
        map.get(stop.stop_name).coord.push({ lon: stop.stop_lon, lat: stop.stop_lat });

    }
    return Array.from(map.values());
}



function log(txt, isFichier) {
    const date = new Date();
    const content = date.toISOString() + ", " + txt;

    if (isFichier) {
        var nomFichier = date.getUTCFullYear() + (pad(date.getUTCMonth() + 1)) + date.getUTCDate() + ".log";

        fs.appendFile('log/' + nomFichier, content + "\n", function (err) {
            if (err) { throw err };
        });
    }
    console.log(content);
}

function pad(number) {
    if (number < 10) {
        return '0' + number;
    }
    return Number(number);
}

init();

module.exports.init = init;