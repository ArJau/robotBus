module.exports = class Stops {
    id;
    stop_id;
    reseau_id;
    stop_code;
    stop_name;
    stop_desc;
    stop_lat;
    stop_lon;
    location_type;
    parent_station;
    lst_StopTimes = [];
    idPosition;
}