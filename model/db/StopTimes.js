
module.exports = class StopTimes {
    id;
    trip_id;
    reseau_id;
    arrival_time;
    departure_time;
    stop_id;
    stop_sequence;
    pickup_type;
    drop_off_type;
    shape_dist_traveled;

    externalKey(){
        return ["trip_id", "stop_id"];
    }
}