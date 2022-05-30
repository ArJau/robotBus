
const nReadlines = require('n-readlines');
const fs = require('fs');

var modelRepo = require('./model');
var connectionDbMysql = require('./connectionDb.js');
const UrlReseau = require('./model/urlReseau');
var ressource = "ressources/";

var PersistentCircuitModel;
var dbMySql;

var dateDeb = new Date();

async function init() {
    await modelRepo.initModels();
    dbMySql = await connectionDbMysql.initDbMysql();
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

            var criteria;
            criteria = { "resources.metadata.modes": "bus" };
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

async function loadReseauxInDB(mapUrl) {
    
    let i=0;
    for (const [id, urlReseau] of mapUrl) {
        let rep = ressource + id;
        i++;
        console.log((i +  "/" + mapUrl.size) + " ********************************** Circuit: " + urlReseau.title, true);
        let criteria  = { "id": id };
        //await modelRepo.reInitCollections(criteria);//suppression des données existantes
        await analyseRep(rep, urlReseau);
        //await consolidationTrajet(id, mapUrl);
        //await modelRepo.reInitCollectionsTemp();//suppression des table temporaires utiliser pour le calcul précedent 
        //await insertDbBasic('reseau-descs', mapUrl.get(id));
    }
    //await insertDbBasic('reseau-descs', Array.from(mapUrl.values()));
    endTime();
}

async function analyseRep(rep, urlReseau) {
   
    return new Promise(async (resolve, reject) => {
        try {
            if (fs.existsSync(rep)) {
                let mapModelRepo = modelRepo.mapFichierSql();
                let fichiers = Array.from(mapModelRepo.keys());
                for (let i in fichiers) {
                    log("analyse du fichier: " + fichiers[i]);
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
 * Import du fichier en base de donnée. 
 * Chaque fichier est découpé en bloc de 20000 lignes pour etre inseré en base pour éviter les problemes de mémoires
 * @param {*} fileName 
 * @param {*} id 
 * @param {*} model 
 */
async function analyseFichier(fileName, urlReseau, model) {
    return new Promise(async (resolve, reject) => {
        try {
            const broadbandLines = new nReadlines("./" + fileName);
            let values = [];
            let fields = [];
            let line;
            let numLigne = 1;
            while (line = broadbandLines.next()) {
                if (numLigne == 1) {
                    fields = line.toString('ascii').replace("o;?", "").replace(/(\r\n|\n|\r)/gm, "").trim().split(",");
                    for (let i in fields){
                        fields[i] = model + "_" + fields[i];
                    }
                } else {
                    values.push(csvToSql(line));
                }

                numLigne++;
                if (numLigne % 5000 == 0) {
                    await insertFichierDB(fileName, urlReseau, model, fields, values);
                    values = [];
                }
            }
            //si il en reste un peu
            if (values.length > 0) {
                await insertFichierDB(fileName, urlReseau, model, fields, values);
            }
            resolve();
        }
        catch (er) {
            log("DB ERROR" + model + ",id: " + urlReseau.id + " fileName=" + fileName + ", er:" + er, true)
            resolve();
        }
    });
}

async function insertFichierDB(fileName, urlReseau, model, fields, values){
    return new Promise(async (resolve, reject) => {
        let sql = insertSql(model, fields, values);
        dbMySql.query(sql, function(err, result){
            if (err)
                log("Erreur insertFichierDB. fileName: " + fileName + ", id : " + urlReseau.id + ", model: " + model+ ", mes:  " + err, true);
            else
                log("Table: " + model + ", Nb lign enregistrée: " + result.length + ", fileName: " + fileName + ", id : " + urlReseau.id);
            resolve();
        });
        
    });
}

function insertSql(model, fields, values){
    return "insert into " + model + " (" + fields + ") values " + values;
}

function csvToSql(line) {
    try {
        line = line.toString('ascii').trim();
        if (line == ""){
            return;
        }
        let values = line.replaceAll("'", "\'").replaceAll("o;?", "").replace(/(\r\n|\n|\r)/gm, "").split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        for (let i in values){
            values[i] = "'" + values[i] + "'";
        }
        return "(" + values + ")";
    } catch (err) {
        log("Error parsing csvToSql. Line:" + line)
    }

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

function endTime() {
    const dateFin = new Date();
    log("FINI. Temps:" + ((dateFin - dateDeb) / 1000), true);
}

init();