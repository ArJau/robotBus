var GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var request = require('request');


//{'resources.format': 'gtfs-rt'}
var requestSettings = {
  method: 'GET',
  url: 'https://proxy.transport.data.gouv.fr/resource/bibus-brest-gtfs-rt-trip-update',
  //55ffbe0888ee387348ccb97d
  encoding: null
};
request(requestSettings, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    
    var feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
    //log(feed.entity);
    /*feed.entity.forEach(function(entity) {
      if (entity.tripUpdate) {
        console.log(entity.tripUpdate);
      }
    });*/
    let feedEntity = feed.entity.slice(0,1);
    for (let numEntity in feedEntity){
      if (feedEntity[numEntity].tripUpdate) {
        //console.log(feedEntity[numEntity].tripUpdate);
        stopTimeUpdate = feedEntity[numEntity].tripUpdate.stopTimeUpdate;
        for (let numSeq in stopTimeUpdate){
          let stopTime = stopTimeUpdate[numSeq];
          let dateArrivee = new Date(stopTime.arrival.time);
          let dateDepart = new Date(stopTime.departure.time);
          console.log(stopTime.stopSequence + ", " + stopTime.stopId + ": " + dateArrivee.getTime() + "-" + dateDepart.getTime());
        }
      }
    }
  }
  
});

function log(txt, isFichier){
  const date = new Date();
  const content = date.toISOString()  + ", " + txt;

  if (isFichier){
      var nomFichier = pad(date.getUTCFullYear() + (pad(date.getUTCMonth()) + 1) + date.getUTCDate()) +  ".log";
     
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
