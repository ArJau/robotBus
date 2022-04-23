const fs = require('fs');
const os = require('os');
const path = require('path');

const unzipStream = require('unzip-stream');
var request = require('request');
const nReadlines = require('n-readlines');

var modelRepo = require('./model');

var ressource = "ressources/";
var PersistentCircuitModel;
var dateDeb = new Date();

//a exporter dans un autre fichier
class UrlReseau {
    id;
    url;
    rt;
}
class Trajet {
    id;
    route_text_color;
    route_color;
    route_long_name;
    route_short_name;
    route_id;
    idPosition = [];
    stops = [];
}
class Stops {
    //coord = [];
    stop_name;
    stop_id;
    stop_lat;
    stop_lon;
    idPosition;
}
class Pos {
    pos;
}

async function init() {

    await modelRepo.initModels();
    var mapUrl = await recupereUrl();
    //await loadReseaux(mapUrl);
    await loadReseauxInDB(mapUrl);
}

async function recupereUrl() {
    return new Promise((resolve, reject) => {
        try {
            let map = modelRepo.mapModel();
            let mapUrl = new Map();
            PersistentCircuitModel = map.get("circuits");

            /*circuitRepo.init(
            function(model){
                PersistentCircuitModel = model;
            });*/

            var criteria;
            criteria = { "resources.metadata.modes": "bus" };
            criteria = { "id": "56b0c2fba3a7294d39b88a86" };//brest
            //criteria = {};
            //a faire 620c150a0171135d9b35ecc6
            //a faire 6036e9df9d7c9b462c7ce5a4
            //criteria = { "id": "56b0c2fba3a7294d39b88a86" };//toulouse

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
    let nb = lstUrl.length;
    for (const [id, urlReseau] of mapUrl) {
        //for (i in lstUrl) {
        let url = urlReseau.url;
        let indice = (Number(i) + 1) + "/" + nb;
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
                .on('response', function (response) {
                    if (response.statusCode == 200) {//200 c'est ok
                        try {
                            loadAndDezip(url, file, id);
                            resolve();
                        } catch (er) {
                            reject(log("erreur lors du loadAndDezip, id : " + id + ", url : " + url + ", err : " + er), true);
                        }
                    } else {
                        reject(log("Erreur du server, code: " + response.statusCode + ", id: " + id), true);
                    }
                }).on('error', () => {
                    reject(log("Le server ne repond pas, id: " + id), true);
                });
        } catch (err) {
            reject(log("erreur, id : " + id + ", url : " + url + ", err : " + err), true);
        }

    })
}

async function loadAndDezip(url, file, id) {
    return new Promise((resolve, reject) => {
        try {
            request.get(url)
                .pipe(fs.createWriteStream(file))
                .on('close', function () {
                    try {
                        fs.createReadStream(file)
                            .pipe(unzipStream.Extract({ path: ressource + id })
                                .on('error', (error) => {
                                    log("DEZIP KO. id: " + id + ", error:" + error), true
                                    reject()
                                }))
                            .on('close', function () {
                                log("DEZIP OK. id: " + id)
                                resolve();
                            }
                            )
                    } catch (er) {
                        log("DEZIP KO. id: " + id), true
                        reject();
                    }
                });

        } catch (err) {
            log("loadAndDezip KO. id: " + id, true);
            reject();
        }
    });

}

/**
 * Boucle sur chaque réseau de bus trouvé, 
 *  - Analyse le répertoire dezipper en local et met en base les données.
 *  - Consolide le trajet pour facilité le requetage par le client
 * 
 * @param {*} mapUrl 
 */
async function loadReseauxInDB(mapUrl) {
    //await modelRepo.reInitCollections();//suppression des données existantes
    for (const [id, urlReseau] of mapUrl) {
        let rep = ressource + id;
        await analyseRep(rep, urlReseau);
        await consolidationTrajet(id);
        await modelRepo.reInitCollectionsTemp();//suppression des table temporaire utiliser pour le calcul précedent 
    }
    endTime();
}

function endTime() {
    const dateFin = new Date();
    log("FINI. Temps:" + ((dateFin - dateDeb) / 1000), true);
}

/**
 * Analyse des répertoires où les zip sont stockés
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
                for (let i = 0; i < fichiers.length; i++) {
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



function csvToJson(titre, contenu) {
    try {
        let tabTitre = titre.replace(/(\r\n|\n|\r)/gm, "").trim().split(",");
        let tabContenu = contenu.replace(/(\r\n|\n|\r)/gm, "").replaceAll("\"", "").trim().split(",");
        let result = "{";
        for (i in tabTitre) {
            result += "\"" + tabTitre[i] + "\":\"" + tabContenu[i] + "\",";
        }
        result = result.substring(0, result.length - 1); //on enleve la derniere ","
        result += "}";
        return JSON.parse(result);
    } catch (err) {
        log("Error parsing CSV titre: " + titre + ". contenu:" + contenu)
    }

}
/**
 * Import du fichier en base de donnée. 
 * Chaque fichier est découpé en bloc de 20000 lignes pour etre inseré en base pour éviter les problemes de mémoires
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
                    fichierJson.push(csvToJson(premiereLigne, line.toString()));
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
            reject();
        }
    });
}

/**
 * Transforme le fichier csc en json pour l'insérer en base
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
            if (urlReseau.rt) {//si on est sur un circuit temp réel
                await insertDb(fileName, urlReseau.id, model, tableauJson);//on enregistre toute les tables
            } else if (!mapFileTemp.has(fileNameCourt)) {//sinon on enregistre pas les trois tables volumineuse (stops, trips, stop_time) 
                await insertDb(fileName, urlReseau.id, model, tableauJson);
            }
            resolve();
        } catch (err) {
            log("ERROR" + err);
            reject();
        }
    });
}

function calculIdPosition(lat, lon) {
    lat = Number(lat) + 90;//+90 pour n'avoir que des valeur positive
    lon = Number(lon) + 180;// +180 pour n'avoir que des valeur positive
    let idPosition;
    let sLat = "" + (Math.floor(lat * 10));
    let sLon = "" + (Math.floor(Math.floor(Math.floor(lon * 10) / 2)) * 2);

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
                reject({ err: 'not found' });
            } else {
                log("CSV " + model + ",lignes:," + result.length + ", id: " + id + ", fileName=" + fileName, true);
                resolve();
            }
        });
    });
}

/**
 * Conncaténation de la table routes, trip, stop, et stops_time dans la table Trajet
 * afin de créer une nouvelle table optimisée pour le requetage.
 */
async function consolidationTrajet(id) {
    return new Promise((resolve, reject) => {
        let map = modelRepo.mapModel();
        let RoutesCollec = map.get("routes");

        let criteriaRoute;
        //criteriaRoute = { id: "56b0c2fba3a7294d39b88a86" };
        criteriaRoute = { "id": id };
        log("consolidation reseaux: " + id);
        try {
            let center = [];
            RoutesCollec.find(criteriaRoute, async function (err, lstRoutes) {//on récupere toutes les routes
                if (err) {
                    console.log("err: " + err);
                }
                log("nombre de routes: " + lstRoutes.length);
                for (let numRoute in lstRoutes) {
                    try {
                        await analyseRoute(lstRoutes[numRoute], numRoute, center);
                    } catch (err) {
                    }
                }
                resolve();
                log(center);
            }).clone().catch(error => { throw error });
        } catch (err) {
            reject(log(err));
        }
    });
}

async function analyseRoute(route, numRoute, center) {
    return new Promise((resolve, reject) => {
        try {
            let map = modelRepo.mapModel();
            let TripsCollec = map.get("temp_trips");
            let StopTimesCollec = map.get("temp_stop_times");
            let StopsCollec = map.get("temp_stops");
            //if (route.route_short_name == "15") {

            let criteriaTrip = { id: route.id, route_id: route.route_id };
            TripsCollec.find(criteriaTrip, function (err, lstTrips) {//on récupere le premier trip de chaque route
                let trip = lstTrips[0];
                //log("trip.trip_headsign : " + trip.trip_headsign);
                if (trip) {
                    let criteriaStopTimes = { id: route.id, trip_id: trip.trip_id };
                    StopTimesCollec.find(criteriaStopTimes, function (err, lstStopsTime) {//on recupere tous les stops du trip
                        log(numRoute + " : route.route_long_name : " + route.route_long_name)
                        let mapStopsStopTime = new Map();
                        for (let numStopTime in lstStopsTime) {//on boucle sur chaque stopTime 
                            let stopsTime = lstStopsTime[numStopTime];
                            mapStopsStopTime.set(stopsTime.stop_sequence, stopsTime.stop_id);//sert pour garder l'ordre des stops
                        }
                        //log("stopTime.stop_sequence : " + stopTime.stop_sequence);

                        let criteriaStop = { id: route.id, stop_id: { $in: Array.from(mapStopsStopTime.values()) } };
                        StopsCollec.find(criteriaStop, function (err, lstStop) {//pour enfin recuperer chaque stop
                            let trajet = new Trajet();
                            log("analyse" + route.route_short_name);
                            //trajet.id = route.id;
                            trajet.route_id = route.route_id;
                            trajet.route_long_name = route.route_long_name;
                            trajet.route_short_name = route.route_short_name;
                            trajet.route_text_color = route.route_text_color;
                            trajet.route_color = route.route_color;

                            let mapStop = new Map(); //let mapStop = lstStop.map(lstStop.stop_id => lstStop);
                            for (let numStop in lstStop) {
                                mapStop.set(lstStop[numStop].stop_id, lstStop[numStop]);//sert pour garder l'ordre des stops
                            }

                            for (let numStopTime in lstStopsTime) {
                                let stop = mapStop.get(mapStopsStopTime.get(lstStopsTime[numStopTime].stop_sequence));
                                if (stop) {
                                    let stops = new Stops();
                                    //stops.id = stop.id;
                                    log("    " + lstStopsTime[numStopTime].stop_sequence + ": " + stop.stop_name)
                                    stops.stop_name = stop.stop_name;
                                    stops.idPosition = calculIdPosition(stop.stop_lat, stop.stop_lon);
                                    stops.stop_id = stop.stop_id;
                                    stops.stop_lat = stop.stop_lat;
                                    stops.stop_lon = stop.stop_lon;
                                    stops.stop_sequence = mapStopsStopTime.get(stop.stop_id);
                                    center = calculCenter(center, stop.stop_lon, stop.stop_lat)
                                    trajet.stops.push(stops);
                                }
                            }

                            let mapIdPosition = new Map();
                            for (numStop in trajet.stops) {
                                let stop = trajet.stops[numStop];
                                if (!mapIdPosition.get(stop.idPosition)) {
                                    mapIdPosition.set(stop.idPosition, stop.idPosition);
                                    let position = new Pos();
                                    position.pos = stop.idPosition;
                                    trajet.idPosition.push(position);
                                }
                            }
                            let lstTrajet = [];
                            lstTrajet.push(trajet);
                            insertDb("Consolidation du trajet", route.id, "trajets", lstTrajet);
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

function calculCenter(center, lon, lat) {
    if (center.length = 0) {
        center[0] = lon;
        center[1] = lon;
        center[2] = lat;
        center[3] = lat;
    }
    center[0] = Math.min(lon, center[0]);
    center[1] = Math.max(lon, center[1]);
    center[2] = Math.min(lat, center[2]);
    center[3] = Math.max(lat, center[3]);
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