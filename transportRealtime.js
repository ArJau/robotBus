var GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var request = require('request');

var requestSettings = {
  method: 'GET',
  url: 'https://proxy.transport.data.gouv.fr/resource/bibus-brest-gtfs-rt-trip-update',
  encoding: null
};
request(requestSettings, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    
    var feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
    //console.log(feed);
    feed.entity.forEach(function(entity) {
      if (entity.tripUpdate) {
        console.log(entity.tripUpdate);
      }
    });
  }
  
});
