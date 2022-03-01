const repo = require('./dao/repo');

var mapM = new Map();
var mapF = new Map();
var dbName = "TransportHoraire";


async function initModels(){
    let agency = {
        id : {"type": "string"},
        agency_id: {"type": "string"},
        agency_name : {"type": "string"},
        agency_url : {"type": "string"},
        agency_timezone : {"type": "string"},
        agency_phone : {"type": "string"},
        agency_lang : {"type": "string"},
        id : {"type": "string"}
    };
    repoInit(dbName, 'agencies', agency);


    let stops = {
        id : {"type": "string"},
        stop_id: {"type": "string"},
        level_id : {"type": "string"},
        stop_name : {"type": "string"},
        stop_lat : {"type": "string"},
        stop_lon : {"type": "string"},
        location_type : {"type": "string"},
        parent_station : {"type": "string"}
    };
    repoInit(dbName, 'stops', stops);
 

    let routes = {
        route_id: {"type": "string"},
        route_short_name : {"type": "string"},
        route_long_name : {"type": "string"},
        route_desc : {"type": "string"},
        route_type : {"type": "string"},
        route_url: {"type": "string"},
        route_color: {"type": "string"},
        route_text_color: {"type": "string"},
        id : {"type": "string"}
    };
    repoInit(dbName, 'routes', routes);

    let trips = {
        id : {"type": "string"},
        route_id: {"type": "string"},
        service_id : {"type": "string"},
        trip_id : {"type": "string"},
        trip_headsign : {"type": "string"},
        block_id : {"type": "string"}
    };
    repoInit(dbName, 'trips', trips)
        

    let stop_times = {
        id : {"type": "string"},
        trip_id: {"type": "string"},
        arrival_time : {"type": "string"},
        departure_time : {"type": "string"},
        stop_id : {"type": "string"},
        stop_sequence : {"type": "string"},
        pickup_type : {"type": "string"},
        drop_off_type : {"type": "string"}
    };
    repoInit(dbName, 'stop_times', stop_times)
    

    let calendar = {
        id : {"type": "string"},
        service_id: {"type": "string"},
        monday : {"type": "string"},
        tuesday : {"type": "string"},
        wednesday : {"type": "string"},
        thursday : {"type": "string"},
        friday : {"type": "string"},
        saturday : {"type": "string"},
        sunday : {"type": "string"},
        start_date : {"type": "string"},
        end_date : {"type": "string"}
    };
    repoInit(dbName, 'calendars', calendar)
    

    let calendar_dates = {
        id : {"type": "string"},
        service_id: {"type": "string"},
        date : {"type": "string"},
        exception_type : {"type": "string"}
    };
    repoInit(dbName, 'calendar_dates', calendar_dates);


    let fare_attributes = {
        id : {"type": "string"},
        fare_id: {"type": "string"},
        price : {"type": "string"},
        currency_type : {"type": "string"},
        payment_method : {"type": "string"},
        transfers : {"type": "string"},
        transfer_duration : {"type": "string"}
    };
    repoInit(dbName, 'fare_attributes', fare_attributes);


    let fare_rules = {
        id : {"type": "string"},
        fare_id: {"type": "string"},
        route_id : {"type": "string"},
        origin_id : {"type": "string"},
        destination_id : {"type": "string"},
        contains_id : {"type": "string"}
    };
    repoInit(dbName, 'fare_rules', fare_rules);


    let shapes = {
        id : {"type": "string"},
        shape_id: {"type": "string"},
        shape_pt_lat : {"type": "string"},
        shape_pt_lon : {"type": "string"},
        shape_pt_sequence : {"type": "string"},
        shape_dist_traveled : {"type": "string"}
    };
    repoInit(dbName, 'shapes', shapes);

    let pathways = {
        pathway_id : {"type": "string"},
        from_stop_id: {"type": "string"},
        to_stop_id : {"type": "string"},
        pathway_mode : {"type": "string"},
        is_bidirectional : {"type": "string"},
        length : {"type": "string"},
        traversal_time : {"type": "string"},
        stair_count : {"type": "string"},
        max_slope : {"type": "string"},
        min_width : {"type": "string"},
        signposted_as : {"type": "string"},
        reversed_signposted_as : {"type": "string"}
    };
    repoInit(dbName, 'pathways', pathways);


    let frequencies = {
        id : {"type": "string"},
        trip_id: {"type": "string"},
        start_time : {"type": "string"},
        end_time : {"type": "string"},
        headway_secs : {"type": "string"},
        exact_times : {"type": "string"}
    };
    repoInit(dbName, 'frequencies', frequencies);


    let transfers = {
        id : {"type": "string"},
        from_stop_id: {"type": "string"},
        to_stop_id : {"type": "string"},
        transfer_type : {"type": "string"},
        min_transfer_time : {"type": "string"},
        from_route_id : {"type": "string"},
        to_route_id : {"type": "string"},
        from_trip_id : {"type": "string"},
        to_trip_id : {"type": "string"},
        na : {"type": "string"},
        na : {"type": "string"}
    };
    repoInit(dbName, 'transfers', transfers);

/*
    let levels = {
    };
    repoInit(dbName, 'levels', levels);*/

/*
    let translations = {
    };
    repoInit(dbName, 'translations', translations);*/

/*
    let attributions = {
    };
    repoInit(dbName, 'attributions', attributions);*/


    let feed_info = {
        id : {"type": "string"},
        feed_publisher_name: {"type": "string"},
        feed_publisher_url : {"type": "string"},
        feed_lang : {"type": "string"},
        feed_id : {"type": "string"}
    };
    repoInit(dbName, 'feed_info', feed_info);

}

function repoInit(dbName, nameCollection, schema){
    repo.init(dbName, nameCollection, schema,
    function(model){
        mapM.set(nameCollection, model);
    });
}
/**
 * Mapping entre le nom du fichier de description et de la collection.
 */
function initMapF(){
    mapF.set('agency.txt', 'agencies');
    mapF.set('stops.txt', 'stops');
    mapF.set('routes.txt', 'routes');
    mapF.set('trips.txt', 'trips');
    mapF.set('stop_times.txt', 'stop_times');
    mapF.set('calendar.txt', 'calendars');
    mapF.set('calendar_dates.txt', 'calendar_dates');
    mapF.set('fare_attributes.txt', 'fare_attributes');
    mapF.set('fare_rules.txt', 'fare_rules');
    mapF.set('shapes.txt', 'shapes');
    mapF.set('pathways.txt', 'pathways');
    mapF.set('frequencies.txt', 'frequencies');
    mapF.set('transfers.txt', 'transfers');
    mapF.set('levels.txt', 'levels');
    mapF.set('translations.txt', 'translations');
    mapF.set('attributions.txt', 'attributions');
}

function mapModel(){
    return mapM;
}

/**
 * Suppression de tous les enregistrements de  toutes les collections
 */
async function reInitCollections(){
    for (const i of mapM.entries()){
        let model =  mapModel();
        await deleteModel(model, i);
    }
}

function deleteModel(model, i){
    return new Promise((resolve, reject)=>{
        model.get(i[0]).deleteMany(function(err, delOK) {
            if (err) 
                reject();
            if (delOK) 
                resolve(console.log("Collection "+ i[0] + " deleted"));
        });
    })
}

function mapFichier(){
    return mapF;
}

initModels();
initMapF();

module.exports.mapModel=mapModel;
module.exports.mapFichier=mapFichier;
module.exports.reInitCollections=reInitCollections;