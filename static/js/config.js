(function() {
  var defaults, hel_geocoder_base_url, hel_servicemap_base_url, helsinki, hsl_colors, recorder_base_url;

  citynavi.update_configs = function(configs) {
    var config, key, ref;
    citynavi.configs || (citynavi.configs = {});
    for (key in configs) {
      config = configs[key];
      citynavi.configs[key] = _.extend(citynavi.configs[key] || {}, config);
    }
    if ((ref = citynavi.config) != null ? ref.id : void 0) {
      return citynavi.set_config(citynavi.config.id);
    }
  };

  citynavi.set_config = function(id) {
    citynavi.config = _.extend({}, citynavi.configs.defaults, citynavi.configs[id], citynavi.configs.overrides || {});
    return citynavi.config.id = id;
  };

  hsl_colors = {
    walk: '#999999',
    cycle: '#009999',
    wait: '#999999',
    1: '#007ac9',
    2: '#00985f',
    3: '#007ac9',
    4: '#007ac9',
    5: '#007ac9',
    6: '#ff6319',
    7: '#00b9e4',
    8: '#007ac9',
    12: '#64be14',
    21: '#007ac9',
    22: '#007ac9',
    23: '#007ac9',
    24: '#007ac9',
    25: '#007ac9',
    36: '#007ac9',
    38: '#007ac9',
    39: '#007ac9'
  };

  hel_geocoder_base_url = "http://dev.hel.fi/geocoder/v1/";

  hel_servicemap_base_url = "http://www.hel.fi/palvelukarttaws/rest/v2/";

  recorder_base_url = "http://maas.okf.fi/";

  defaults = {
    hel_geocoder_address_url: hel_geocoder_base_url + "address/",
    hel_geocoder_poi_url: hel_geocoder_base_url + "poi/",
    waag_url: "http://api.citysdk.waag.org/",
    google_url: "http://data.okf.fi/gis/1/",
    nominatim_url: "http://open.mapquestapi.com/nominatim/v1/search.php",
    bag42_url: "http://bag42.nl/api/v0/geocode/json",
    hel_servicemap_service_url: hel_servicemap_base_url + "service/",
    hel_servicemap_unit_url: hel_servicemap_base_url + "unit/",
    reittiopas_url: "http://tuukka.kapsi.fi/tmp/reittiopas.cgi?callback=?",
    osm_notes_url: "http://api.openstreetmap.org/api/0.6/notes.json",
    faye_url: "http://dev.hsl.fi:9002/faye",
    recorder_login_url: recorder_base_url + "auth/login",
    recorder_get_trace_url: recorder_base_url + "get_trace",
    recorder_get_route_url: recorder_base_url + "get_route",
    recorder_get_plan_url: recorder_base_url + "get_plan",
    recorder_get_fluency_url: recorder_base_url + "get_fluency",
    recorder_get_traces_url: recorder_base_url + "get_traces",
    recorder_get_route_fluency_url: recorder_base_url + "route_fluency",
    recorder_post_route_url: recorder_base_url + "store_data",
    recorder_post_plan_url: recorder_base_url + "store_plan",
    recorder_post_trace_seq_url: recorder_base_url + "trace_seqs",
    icon_base_path: "static/images/",
    min_zoom: 5,
    colors: {
      hsl: hsl_colors,
      google: {
        WALK: hsl_colors.walk,
        CAR: hsl_colors.walk,
        BICYCLE: hsl_colors.cycle,
        WAIT: hsl_colors.wait,
        0: hsl_colors[2],
        1: hsl_colors[6],
        2: hsl_colors[12],
        3: hsl_colors[5],
        4: hsl_colors[7],
        109: hsl_colors[12]
      }
    },
    icons: {
      google: {
        WALK: 'walking.svg',
        CAR: 'car.svg',
        BICYCLE: 'bicycle.svg',
        WAIT: 'clock.svg',
        0: 'tram_stop.svg',
        1: 'subway.svg',
        2: 'train_station2.svg',
        3: 'bus_stop.svg',
        4: 'port.svg',
        109: 'train_station2.svg'
      }
    },
    defaultmap: "stamen",
    maps: {
      stamen: {
        name: "Stamen",
        url_template: 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png',
        opts: {
          maxZoom: 20,
          attribution: 'Map tiles by <a href="http://stamen.com/">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>. Map data &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>.'
        }
      },
      osm: {
        name: "OpenStreetMap",
        url_template: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        opts: {
          maxZoom: 19,
          attribution: 'Map data &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
        }
      },
      opencyclemap: {
        name: "OpenCycleMap",
        url_template: 'http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
        opts: {
          attribution: 'Map &copy; <a href="http://www.thunderforest.com/" target="_blank">Thunderforest</a>, Map data &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
        }
      },
      transport: {
        name: "Public transport",
        url_template: 'http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png',
        opts: {
          attribution: 'Map &copy; <a href="http://www.thunderforest.com/" target="_blank">Thunderforest</a>, Map data &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
        }
      },
      mapquest: {
        name: "MapQuest",
        url_template: 'http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg',
        opts: {
          maxZoom: 19,
          subdomains: '1234',
          attribution: 'Map data &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>, Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">'
        }
      }
    }
  };

  helsinki = {
    name: "Helsinki Region",
    country: "fi",
    cities: null,
    bbox_ne: [70.09, 31.58],
    bbox_sw: [59.50, 19.11],
    center: [64.795, 25.345],
    otp_base_url: "http://otp.okf.fi/otp/routers/default/",
    siri_url: "http://dev.hsl.fi/siriaccess/vm/json?operatorRef=HSL",
    poi_muni_id: null,
    waag_id: "",
    poi_providers: {
      "waag": [
        {
          type: "restaurant"
        }, {
          type: "cafe"
        }, {
          type: "bar"
        }, {
          type: "pub"
        }, {
          type: "supermarket"
        }, {
          type: "pharmacy"
        }, {
          type: "park"
        }, {
          type: "library"
        }, {
          type: "recycling"
        }, {
          type: "swimming_pool"
        }, {
          type: "toilet"
        }
      ]
    },
    autocompletion_providers: ["poi_categories", "history", "google", "osm"],
    google_suffix: ", Finland"
  };

  citynavi.update_configs({
    defaults: defaults,
    helsinki: helsinki
  });

  citynavi.set_config("helsinki");

}).call(this);

//# sourceMappingURL=config.js.map
