# config.coffee contains the default settings and area-specific settings or
# overrides of defaults. To override the settings in config.coffee, for
# example for testing or deployment, use local_config.coffee.

# window.citynavi should have been defined in init.coffee.

# Configuration modification functions.
#######################################

# Merge changes into old configs or store new configs.
citynavi.update_configs = (configs) ->
    citynavi.configs or= {}
    for key, config of configs
        citynavi.configs[key] = _.extend(citynavi.configs[key] or {},
                                         config)

    # Reload current config.
    if citynavi.config?.id
        citynavi.set_config(citynavi.config.id)

# Merge certain configs to create the current config.
citynavi.set_config = (id) ->
    # The current configuration will appear under citynavi.config.
    citynavi.config = _.extend {}, citynavi.configs.defaults,
        citynavi.configs[id], (citynavi.configs.overrides or {})
    citynavi.config.id = id


# Helper data.
##############

# Original structure from:
# https://github.com/reitti/reittiopas/blob/90a4d5f20bed3868b5fb608ee1a1c7ce77b70ed8/web/js/utils.coffee
hsl_colors =
    walk: '#999999' # walking; HSL official color is too light #bee4f8
    cycle:'#009999'
    wait: '#999999' # waiting time at a stop
    1:    '#007ac9' # Helsinki internal bus lines
    2:    '#00985f' # Trams
    3:    '#007ac9' # Espoo internal bus lines
    4:    '#007ac9' # Vantaa internal bus lines
    5:    '#007ac9' # Regional bus lines
    6:    '#ff6319' # Metro
    7:    '#00b9e4' # Ferry
    8:    '#007ac9' # U-lines
    12:   '#64be14' # Commuter trains
    21:   '#007ac9' # Helsinki service lines
    22:   '#007ac9' # Helsinki night buses
    23:   '#007ac9' # Espoo service lines
    24:   '#007ac9' # Vantaa service lines
    25:   '#007ac9' # Region night buses
    36:   '#007ac9' # Kirkkonummi internal bus lines
    38:   '#007ac9' # Undocumented, assumed bus
    39:   '#007ac9' # Kerava internal bus lines

hel_geocoder_base_url = "http://dev.hel.fi/geocoder/v1/"
hel_servicemap_base_url = "http://www.hel.fi/palvelukarttaws/rest/v2/"
recorder_base_url = "http://maas.okf.fi/"


# Configuration data in plain objects.
######################################

defaults =
    hel_geocoder_address_url: hel_geocoder_base_url + "address/"
    hel_geocoder_poi_url: hel_geocoder_base_url + "poi/"
    waag_url: "http://api.citysdk.waag.org/"
    google_url: "http://data.okf.fi/gis/1/"
    nominatim_url: "http://open.mapquestapi.com/nominatim/v1/search.php"
    bag42_url: "http://bag42.nl/api/v0/geocode/json"
    hel_servicemap_service_url: hel_servicemap_base_url + "service/"
    hel_servicemap_unit_url: hel_servicemap_base_url + "unit/"
    reittiopas_url: "http://tuukka.kapsi.fi/tmp/reittiopas.cgi?callback=?"
    osm_notes_url: "http://api.openstreetmap.org/api/0.6/notes.json"
    faye_url: "http://dev.hsl.fi:9002/faye"
    recorder_login_url: recorder_base_url + "auth/login"
    recorder_get_trace_url: recorder_base_url + "get_trace"
    recorder_get_route_url: recorder_base_url + "get_route"
    recorder_get_fluency_url: recorder_base_url + "get_fluency"
    recorder_trace_seq_url: recorder_base_url + "store_data"

    icon_base_path: "static/images/"

    min_zoom: 5

    colors:
        hsl: hsl_colors
        google:
            WALK: hsl_colors.walk
            CAR: hsl_colors.walk
            BICYCLE: hsl_colors.cycle
            WAIT: hsl_colors.wait
            0: hsl_colors[2]
            1: hsl_colors[6]
            2: hsl_colors[12]
            3: hsl_colors[5]
            4: hsl_colors[7]
            109: hsl_colors[12]

    icons:
        google:
            WALK: 'walking.svg'
            CAR: 'car.svg'
            BICYCLE: 'bicycle.svg'
            WAIT: 'clock.svg'
            0: 'tram_stop.svg'
            1: 'subway.svg'
            2: 'train_station2.svg'
            3: 'bus_stop.svg'
            4: 'port.svg'
            109: 'train_station2.svg'

    defaultmap: "osm"

    maps:
        osm:
            name: "OpenStreetMap"
            url_template: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            opts:
                maxZoom: 19
                attribution: 'Map data &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
        opencyclemap:
            name: "OpenCycleMap"
            url_template: 'http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png'
            opts:
                attribution: 'Map &copy; <a href="http://www.thunderforest.com/" target="_blank">Thunderforest</a>, Map data &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
        transport:
            name: "Public transport"
            url_template: 'http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png'
            opts:
                attribution: 'Map &copy; <a href="http://www.thunderforest.com/" target="_blank">Thunderforest</a>, Map data &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
        mapquest:
            name: "MapQuest"
            url_template: 'http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg'
            opts:
                maxZoom: 19
                subdomains: '1234'
                attribution: 'Map data &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>, Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">'

helsinki =
    name: "Helsinki Region"
    country: "fi"
    cities: null
    bbox_ne: [70.09, 31.58]
    bbox_sw: [59.50, 19.11]
    center: [64.795, 25.345]
    otp_base_url: "http://otp.okf.fi/otp/routers/default/"
    siri_url: "http://dev.hsl.fi/siriaccess/vm/json?operatorRef=HSL"
    poi_muni_id: null # XXX is this ok?
    waag_id: ""
    poi_providers:
        "waag": [
            {type: "restaurant"}
            {type: "cafe"}
            {type: "bar"}
            {type: "pub"}
            {type: "supermarket"}
            {type: "pharmacy"}
            {type: "park"}
            {type: "library"}
            {type: "recycling"}
            {type: "swimming_pool"}
            {type: "toilet"} # XXX is this what's available here?
        ]
    autocompletion_providers: ["poi_categories", "history", "google", "osm"]
    google_suffix: ", Finland"



# Save and set configuration.
#############################

citynavi.update_configs {
    defaults
    helsinki
}

citynavi.set_config("helsinki")


# Attempt to load local configuration.
######################################
#
# Currently local_config.js is loaded in index.html. If local_config.coffee
# has not been created, the browser can't find local_config.js and will move
# on. No harm done except for a dirty 404.
# FIXME: Load local_config.js from here if it exists.
