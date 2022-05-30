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
    dbMySql = await connectionDbMysql.initDbMysql();
    //await loadReseaux(mapUrl);
    await loadReseauxInDB(mapUrl);
    
}

async function recupereUrl() {
    return new Promise((resolve, reject) => {
        try {
            let map = modelRepo.mapModel();
            let mapUrl = new Map();
            PersistentCircuitModel = map.get("circuits");

            var criteria;
            //criteria = { "resources.metadata.modes": "bus" };
            criteria = { "id": "55ffbe0888ee387348ccb97d" };//brest
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
 * Boucle sur chaque réseau de bus trouvé, 
 *  - Analyse le répertoire dezipper en local et met en base les données.
 *  - Consolide le trajet pour facilité le requetage par le client
 * 
 * @param {*} mapUrl 
 */
async function loadReseauxInDB(mapUrl) {
    
    let i=0;
    for (const [id, urlReseau] of mapUrl) {
        let rep = ressource + id;
        i++;
        log((i +  "/" + mapUrl.size) + " ********************************** Circuit: " + urlReseau.title, true);
        await analyseRep(rep, urlReseau);
        //await consolidationTrajet(id, mapUrl);
        //await modelRepo.reInitCollectionsTemp();//suppression des table temporaires utiliser pour le calcul précedent 
        //await insertDbBasic('reseau-descs', mapUrl.get(id));
    }
    //await insertDbBasic('reseau-descs', Array.from(mapUrl.values()));
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
                let mapModelRepo = modelRepo.mapFichierSql();
                let fichiers = Array.from(mapModelRepo.keys());
                for (let i in fichiers) {
                    log("analyse du fichier: " + fichiers[i])
                    let fileName = rep + "/" + fichiers[i];
                    if (fs.existsSync(fileName)) {
                        await reInitCollections(fileName, urlReseau, mapModelRepo.get(fichiers[i]));//suppression des données existantes
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

async function reInitCollections(fileName, urlReseau, table){
    let sql = "delete from " + table + " where " + table + "_reseau_id = '" + urlReseau.id + "'";
    return new Promise(async (resolve, reject) => {
        dbMySql.query(sql, function(err, result){
            if (err)
                log("Erreur reInitCollections. fileName: " + fileName + ", id : " + urlReseau.id + ", table: " + table+ ", mes:  " + err, true);
            else 
                log("Table: " + table + ", Nb ligne supprimées: " + result.affectedRows + ", fileName: " + fileName + ", id : " + urlReseau.id);
            resolve();
        });
    });
}

/**
 * Import du fichier en base de donnée. 
 * Chaque fichier est découpé en bloc de 20000 lignes pour etre inseré en base pour éviter les problemes de mémoires
 * @param {*} fileName 
 * @param {*} id 
 * @param {*} model 
 */
 async function analyseFichier(fileName, urlReseau, table) {
    return new Promise(async (resolve, reject) => {
        try {
            const broadbandLines = new nReadlines("./" + fileName);
            let values = [];
            let fields = [];
            let line;
            let numLigne = 1;
            while (line = broadbandLines.next()) {
                if (numLigne == 1) {
                    fields = line.toString('utf8').replace("o;?", "").replace(/(\r\n|\n|\r)/gm, "").trim().split(",");
                    for (let i in fields){
                        fields[i] = table + "_" + fields[i];
                    }
                    fields[fields.length] = table + "_reseau_id";
                } else {
                    let sql = csvToSql(line, urlReseau);
                    values.push(sql);
                }

                numLigne++;
                if (numLigne % 500 == 0) {
                    await insertFichierDB(fileName, urlReseau, table, fields, values);
                    values = [];
                    if (numLigne % 5000 == 0) {
                        log((numLigne-2) + " lignes. Table: " + table + ", fileName: " + fileName + ", id : " + urlReseau.id);
                    }
                }
            }
            //si il en reste un peu
            if (values.length > 0) {
                await insertFichierDB(fileName, urlReseau, table, fields, values);
                log((numLigne-2) + " lignes. Table: " + table + ", fileName: " + fileName + ", id : " + urlReseau.id);
            }
            resolve();
        }
        catch (er) {
            log("DB ERROR" + table + ",id: " + urlReseau.id + " fileName=" + fileName + ", er:" + er, true)
            resolve();
        }
    });
}

async function insertFichierDB(fileName, urlReseau, table, fields, values){
    return new Promise(async (resolve, reject) => {
        let sql = insertSql(table, fields, values);
        dbMySql.query(sql, function(err, result){
            if (err)
                log("Erreur insertFichierDB. fileName: " + fileName + ", id : " + urlReseau.id + ", table: " + table+ ", mes:  " + err, true);
            //else
            //    log("Table: " + table + ", Nb ligne enregistrée: " + result.affectedRows + ", fileName: " + fileName + ", id : " + urlReseau.id);
            resolve();
        });
        
    });
}

function insertSql(table, fields, values){
    return "insert into " + table + " (" + fields + ") values " + values;
}

function csvToSql(line, urlReseau) {
    try {
        let lineStr = line.toString('utf8').trim();
        if (lineStr == ""){
            return;
        }
        let values = lineStr.replaceAll("o;?", "").replace(/(\r\n|\n|\r)/gm, "").split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        for (let i in values){
            values[i] = "'" + values[i].replaceAll("'", "\\'") + "'";
        }
        values[values.length] = "'" + urlReseau.id + "'";
        return "(" + values + ")";
    } catch (err) {
        log("Error parsing csvToSql. Line:" + lineStr);
    }

}


/**
 * Conncaténation de la table routes, trip, stop, et stops_time dans la table Trajet
 * afin de créer une nouvelle table optimisée pour le requetage.
 */
async function consolidationTrajet(id, mapUrl) {
    return new Promise((resolve, reject) => {
        let map = modelRepo.mapModel();
        let RoutesCollec = map.get("routes");

        let criteriaRoute;
        log("consolidation reseaux: " + id);
        try {
            
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