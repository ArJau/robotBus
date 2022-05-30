module.exports = class Trips {
    id;
    route_id;
    reseau_id;
    service_id;
    trip_id;
    trip_headsign;
    direction_id;
    block_id;
    shape_id;
    lst_StopTimes = [];

    externalKey(){
        return ["shape_id", "route_id"];
    }
}
