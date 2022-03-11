var GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var request = require('request');
var modelRepo = require('./model');
var fs = require('fs');


async function init() {

  await modelRepo.initModels();
  let map = modelRepo.mapModel();
  PersistentCircuitModel = map.get("circuits");

  let lstUrlRt = [];
  let criteria;
  //criteria = { "resources.format": "gtfs-rt" };
  //criteria = { "id": "55ffbe0888ee387348ccb97d" };
  //criteria = { "id": "5b0d18ed88ee3836341f603d" };
  criteria = { "id": "5dfcf2a4634f4110fc360457" };
  
  

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
        for (let numResource in circuit.resources) {// a faire prendre les derniers fichier mis a jour
          //console.log("numResource: "+ numResource);
          resource = circuit.resources[numResource][0];
          url = resource.original_url;
          format = resource.format;

          if (format == "gtfs-rt") {
            lstUrlRt.push({ id: id, url: url });
          } else {
            log("FORMAT: " + format + ", URL: " + url + ", id: " + id);
          }

        }
        //console.log(url);
      }
      else {
        log("Resource inexistante id: " + id, true);
      }
      await loadRealTime(lstUrlRt);
    }
  });
}


async function loadRealTime(lstUrlRt) {

  for (let i in lstUrlRt) {
    let urlRt = lstUrlRt[i];

    let requestSettings = {
      method: 'GET',
      url: urlRt.url,
      //55ffbe0888ee387348ccb97d
      encoding: null
    };
    request(requestSettings, function (error, response, body) {
      if (!error && response.statusCode == 200) {

        var feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
        let feedEntity = feed.entity.slice(0, 1);

        log(JSON.stringify(feedEntity), true);
        for (let numEntity in feedEntity) {
          if (feedEntity[numEntity].tripUpdate) {
            stopTimeUpdate = feedEntity[numEntity].tripUpdate.stopTimeUpdate;
            for (let numSeq in stopTimeUpdate) {
              let stopTime = stopTimeUpdate[numSeq];
              //console.log(stopTime);
              /*let dateArrivee = new Date(stopTime.arrival.time.low * 1000);
              let dateDepart = new Date(stopTime.departure.time.low * 1000);
              log(stopTime.stopSequence + ". " + stopTime.stopId 
              + ". " + dateArrivee.getUTCDate() + " " + dateArrivee.toLocaleTimeString() 
              + "." + dateDepart.getUTCDate()  + " " + dateDepart.toLocaleTimeString(), true);*/
            }
            //console.log("-----------------------------------------------------------------");
          }
        }

        //insertDb(lstUrlRt[i].id,"realTime", feedEntity);
      }
    });
  }
}
async function insertDb(id, model, tableauJson) {
  return new Promise((resolve, reject) => {
    try {
      for (let i in tableauJson) {
        tableauJson[i]["id"] = id;
      }

      //console.log(tableauJson);
      let map = modelRepo.mapModel();
      map.get(model).insertMany(tableauJson, (err, result) => {
        if (err) {
          reject(log("CSV ERROR" + model + ",id: " + id, true));
        }
        if (result) {
          resolve(log("CSV " + model + ",lignes:," + tableauJson.length + ", id: " + id + ", fileName=" + fileName, true));
        }
      });
    } catch (er) {
      reject(log("CSV ERROR" + model + ",id: " + id + " fileName=" + fileName + ", er:" + er, true));
    }
  });
}

function log(txt, isFichier) {
  const date = new Date();
  const content = date.toISOString() + ", " + txt;

  if (isFichier) {
    var nomFichier = date.getUTCFullYear() + (pad(date.getUTCMonth()+ 1)) + date.getUTCDate() + ".log";

    fs.appendFile('log/' + nomFichier, content + "\n", function (err) {
      if (err) { throw err };
    });
  }
  console.log(content);
}

init();

function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return Number(number);
}
