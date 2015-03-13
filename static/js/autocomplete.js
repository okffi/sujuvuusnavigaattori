(function() {
  var Autocompleter, Bag42Completer, CategoryPrediction, GeocoderCompleter, GoogleCompleter, GoogleLocation, HistoryCompleter, Location, LocationHistory, LocationPrediction, OSMCompleter, POICategoryCompleter, Prediction, RemoteAutocompleter, accent_insensitive_pattern, completers, generate_area_completers, get_all_predictions, google_url, hel_geocoder_address_url, letters_to_accents, navigate_to_location, navigate_to_poi, nominatim_url, pred_list, ref, render_autocomplete_results, supported_completers, test_completer,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  ref = citynavi.config, hel_geocoder_address_url = ref.hel_geocoder_address_url, google_url = ref.google_url, nominatim_url = ref.nominatim_url;

  Location = (function() {
    function Location(name1, coords1) {
      this.name = name1;
      this.coords = coords1;
    }

    Location.prototype.fetch_details = function(callback, args) {
      return callback(args, this);
    };

    Location.prototype.to_json = function() {
      return {
        name: this.name,
        coords: this.coords
      };
    };

    Location.from_json = function(d) {
      return new Location(d.name, d.coords);
    };

    return Location;

  })();

  window.Location = Location;

  LocationHistory = (function() {
    function LocationHistory(ls_id) {
      var j, l, len, loc, ref1, s;
      this.ls_id = ls_id;
      s = localStorage[this.ls_id];
      if (s) {
        this.array = JSON.parse(s);
      } else {
        this.array = [];
      }
      this.history = [];
      ref1 = this.array;
      for (j = 0, len = ref1.length; j < len; j++) {
        l = ref1[j];
        loc = Location.from_json(l);
        this.history.push(loc);
      }
    }

    LocationHistory.prototype.add = function(loc) {
      this.array.push(loc.to_json());
      this.history.push(loc);
      localStorage[this.ls_id] = JSON.stringify(this.array);
      return this.history.length - 1;
    };

    LocationHistory.prototype.get = function(id) {
      return this.history[id];
    };

    LocationHistory.prototype.clear = function() {
      this.array = [];
      this.history = [];
      return localStorage.removeItem(this.ls_id);
    };

    return LocationHistory;

  })();

  window.location_history = new LocationHistory("city-navigator-history");

  Prediction = (function() {
    function Prediction() {}

    Prediction.prototype.select = function($input, $ul) {
      var args, coords;
      if (this.type === "location") {
        coords = this.location.coords;
        if ((coords == null) || ((coords[0] != null) && (coords[1] != null))) {
          $.mobile.showPageLoadingMsg();
          return this.location.fetch_details(navigate_to_location, this.location);
        } else {
          $input.val(this.location.street + " ");
          $input.focus();
          return $input.trigger("keyup");
        }
      } else {
        $.mobile.showPageLoadingMsg();
        args = {
          callback: navigate_to_poi,
          location: citynavi.get_source_location()
        };
        if (args.location == null) {
          alert("The device hasn't provided its current location. Using region center instead.");
          args.location = citynavi.config.center;
        }
        return this.category.fetch_pois(args);
      }
    };

    Prediction.prototype.render = function() {
      var $el, dest_page, icon_html, name, ref1;
      icon_html = '';
      name = this.name;
      if (this.type === "category") {
        dest_page = "select-nearest";
        icon_html = this.category.get_icon_html();
        name = "Closest " + name.toLowerCase();
      } else {
        dest_page = "map-page";
      }
      if (((ref1 = this.location) != null ? ref1.icon : void 0) != null) {
        icon_html = "<img src='" + this.location.icon + "'>";
      }
      $el = $("<li><a href='#" + dest_page + "'>" + icon_html + name + "</a></li>");
      $el.find('img').height(20).addClass('ui-li-icon');
      return $el;
    };

    return Prediction;

  })();

  LocationPrediction = (function(superClass) {
    extend(LocationPrediction, superClass);

    function LocationPrediction(loc) {
      this.location = loc;
      this.type = "location";
      this.name = loc.name;
    }

    return LocationPrediction;

  })(Prediction);

  CategoryPrediction = (function(superClass) {
    extend(CategoryPrediction, superClass);

    function CategoryPrediction(cat) {
      this.category = cat;
      this.type = "category";
      this.name = cat.name;
    }

    return CategoryPrediction;

  })(Prediction);

  Autocompleter = (function() {
    function Autocompleter() {}

    return Autocompleter;

  })();

  RemoteAutocompleter = (function(superClass) {
    extend(RemoteAutocompleter, superClass);

    function RemoteAutocompleter() {
      this.xhr = null;
      this.timeout = null;
      this.remote = true;
    }

    RemoteAutocompleter.prototype.get_predictions = function(query, callback, args) {
      var timeout_handler;
      this.abort();
      timeout_handler = (function(_this) {
        return function() {
          _this.timeout = null;
          return _this.fetch_results();
        };
      })(this);
      this.callback = callback;
      this.callback_args = args;
      this.query = query;
      return this.timeout = window.setTimeout(timeout_handler, 200);
    };

    RemoteAutocompleter.prototype.submit_location_predictions = function(loc_list) {
      var j, len, loc, pred_list;
      pred_list = [];
      for (j = 0, len = loc_list.length; j < len; j++) {
        loc = loc_list[j];
        pred_list.push(new LocationPrediction(loc));
      }
      return this.callback(this.callback_args, pred_list);
    };

    RemoteAutocompleter.prototype.submit_prediction_failure = function(error) {
      return this.callback(this.callback_args, null, error);
    };

    RemoteAutocompleter.prototype.abort = function() {
      if (this.timeout) {
        window.clearTimeout(this.timeout);
        this.timeout = null;
      }
      if (this.xhr) {
        this.xhr.abort();
        return this.xhr = null;
      }
    };

    return RemoteAutocompleter;

  })(Autocompleter);

  GeocoderCompleter = (function(superClass) {
    extend(GeocoderCompleter, superClass);

    function GeocoderCompleter() {
      return GeocoderCompleter.__super__.constructor.apply(this, arguments);
    }

    GeocoderCompleter.DESCRIPTION = "Geocoder";

    GeocoderCompleter.prototype.fetch_results = function() {
      if (/\d/.test(this.query)) {
        return this.fetch_addresses();
      } else {
        return this.fetch_streets();
      }
    };

    GeocoderCompleter.prototype.fetch_addresses = function() {
      this.xhr = $.getJSON(hel_geocoder_address_url, {
        name: this.query,
        limit: 10
      });
      this.xhr.always(function() {
        return this.xhr = null;
      });
      this.xhr.fail((function(_this) {
        return function() {
          return _this.submit_prediction_failure("Request failed");
        };
      })(this));
      return this.xhr.done((function(_this) {
        return function(data) {
          var adr, coords, j, len, loc, loc_list, objs;
          objs = data.objects;
          loc_list = [];
          for (j = 0, len = objs.length; j < len; j++) {
            adr = objs[j];
            coords = adr.location.coordinates;
            loc = new Location(adr.name, [coords[1], coords[0]]);
            loc.street = $.trim(adr.street);
            if (adr.number) {
              loc.number = adr.number;
              if (adr.letter) {
                loc.number += adr.letter;
              }
              if (adr.number_end) {
                loc.number += "-" + adr.number_end;
              }
            }
            loc_list.push(loc);
          }
          return _this.submit_location_predictions(loc_list);
        };
      })(this));
    };

    GeocoderCompleter.prototype.fetch_streets = function() {
      this.xhr = $.getJSON(hel_geocoder_address_url, {
        name: this.query,
        limit: 10,
        distinct_streets: true
      });
      this.xhr.always(function() {
        return this.xhr = null;
      });
      this.xhr.fail((function(_this) {
        return function() {
          return _this.submit_prediction_failure("Request failed");
        };
      })(this));
      return this.xhr.done((function(_this) {
        return function(data) {
          var j, len, loc, loc_dict, loc_list, objs, street, strt;
          objs = data.objects;
          loc_list = [];
          loc_dict = {};
          for (j = 0, len = objs.length; j < len; j++) {
            street = objs[j];
            strt = $.trim(street.street);
            if (strt in loc_dict) {
              continue;
            }
            loc_dict[strt] = true;
            loc = new Location(strt + " \u2026", [null, null]);
            loc.street = strt;
            loc_list.push(loc);
          }
          if (loc_list.length === 1) {
            return _this.fetch_addresses();
          }
          loc_list = _.sortBy(loc_list, function(loc) {
            return loc.name.toLowerCase();
          });
          return _this.submit_location_predictions(loc_list);
        };
      })(this));
    };

    return GeocoderCompleter;

  })(RemoteAutocompleter);

  Bag42Completer = (function(superClass) {
    extend(Bag42Completer, superClass);

    function Bag42Completer() {
      return Bag42Completer.__super__.constructor.apply(this, arguments);
    }

    Bag42Completer.DESCRIPTION = "Bag42";

    Bag42Completer.prototype.fetch_results = function() {
      this.xhr = $.getJSON(citynavi.config.bag42_url, {
        address: this.query,
        maxitems: 10
      });
      this.xhr.always(function() {
        return this.xhr = null;
      });
      this.xhr.fail((function(_this) {
        return function() {
          return _this.submit_prediction_failure("Request failed");
        };
      })(this));
      return this.xhr.done((function(_this) {
        return function(data) {
          var adr, coords, j, len, loc, loc_list, objs, ref1;
          objs = data.results;
          loc_list = [];
          ref1 = objs || [];
          for (j = 0, len = ref1.length; j < len; j++) {
            adr = ref1[j];
            coords = adr.geometry.location;
            loc = new Location(adr.formatted_address.replace(/\n/g, ", "), [coords.lat, coords.lng]);
            loc_list.push(loc);
          }
          return _this.submit_location_predictions(loc_list);
        };
      })(this));
    };

    return Bag42Completer;

  })(RemoteAutocompleter);

  GoogleLocation = (function(superClass) {
    extend(GoogleLocation, superClass);

    function GoogleLocation(pred) {
      this.name = pred.description;
      this.info = pred;
    }

    GoogleLocation.prototype.fetch_details = function(callback, args) {
      var params, url;
      url = google_url + "geocode.json";
      params = {
        reference: this.info.reference
      };
      return $.getJSON(url, params, (function(_this) {
        return function(data) {
          var loc, res;
          res = data.result;
          loc = res.geometry.location;
          _this.coords = [loc.lat, loc.lng];
          return callback(args, _this);
        };
      })(this));
    };

    return GoogleLocation;

  })(Location);

  GoogleCompleter = (function(superClass) {
    extend(GoogleCompleter, superClass);

    function GoogleCompleter() {
      return GoogleCompleter.__super__.constructor.apply(this, arguments);
    }

    GoogleCompleter.DESCRIPTION = "Google geocoder";

    GoogleCompleter.prototype.fetch_results = function() {
      var area, data, location, radius, url;
      url = google_url + "autocomplete.json";
      area = citynavi.config;
      location = citynavi.get_source_location_or_area_center();
      radius = 12000;
      data = {
        query: this.query,
        location: location.join(','),
        radius: radius
      };
      data['country'] = area.country;
      this.xhr = $.getJSON(url, data);
      this.xhr.always = function() {
        return this.xhr = null;
      };
      this.xhr.fail((function(_this) {
        return function() {
          return _this.submit_prediction_failure("Request failed");
        };
      })(this));
      return this.xhr.done((function(_this) {
        return function(data) {
          var city_name, j, len, loc, loc_list, pred, preds;
          preds = data.predictions;
          loc_list = [];
          for (j = 0, len = preds.length; j < len; j++) {
            pred = preds[j];
            city_name = pred.terms[1].value;
            if (area.cities && indexOf.call(area.cities, city_name) < 0) {
              continue;
            }
            if (area.google_suffix && pred.description.lastIndexOf(area.google_suffix) === pred.description.length - area.google_suffix.length) {
              pred.description = pred.description.substring(0, pred.description.length - area.google_suffix.length);
            }
            pred.description = pred.description.replace(/( [^,]+),\1/g, "$1");
            loc = new GoogleLocation(pred);
            loc_list.push(loc);
          }
          return _this.submit_location_predictions(loc_list);
        };
      })(this));
    };

    return GoogleCompleter;

  })(RemoteAutocompleter);

  accent_insensitive_pattern = function(text) {
    var letter_to_diacritic_pattern;
    text = text.replace(/([|()[{.+*?^$\\])/g, "\\$1");
    letter_to_diacritic_pattern = function(letter) {
      return letters_to_accents[letter.toUpperCase()] || letter;
    };
    text = text.replace(/./g, letter_to_diacritic_pattern);
    return new RegExp(text);
  };

  letters_to_accents = {
    'A': '[Aa\xaa\xc0-\xc5\xe0-\xe5\u0100-\u0105\u01cd\u01ce\u0200-\u0203\u0226\u0227\u1d2c\u1d43\u1e00\u1e01\u1e9a\u1ea0-\u1ea3\u2090\u2100\u2101\u213b\u249c\u24b6\u24d0\u3371-\u3374\u3380-\u3384\u3388\u3389\u33a9-\u33af\u33c2\u33ca\u33df\u33ff\uff21\uff41]',
    'B': '[Bb\u1d2e\u1d47\u1e02-\u1e07\u212c\u249d\u24b7\u24d1\u3374\u3385-\u3387\u33c3\u33c8\u33d4\u33dd\uff22\uff42]',
    'C': '[Cc\xc7\xe7\u0106-\u010d\u1d9c\u2100\u2102\u2103\u2105\u2106\u212d\u216d\u217d\u249e\u24b8\u24d2\u3376\u3388\u3389\u339d\u33a0\u33a4\u33c4-\u33c7\uff23\uff43]',
    'D': '[Dd\u010e\u010f\u01c4-\u01c6\u01f1-\u01f3\u1d30\u1d48\u1e0a-\u1e13\u2145\u2146\u216e\u217e\u249f\u24b9\u24d3\u32cf\u3372\u3377-\u3379\u3397\u33ad-\u33af\u33c5\u33c8\uff24\uff44]',
    'E': '[Ee\xc8-\xcb\xe8-\xeb\u0112-\u011b\u0204-\u0207\u0228\u0229\u1d31\u1d49\u1e18-\u1e1b\u1eb8-\u1ebd\u2091\u2121\u212f\u2130\u2147\u24a0\u24ba\u24d4\u3250\u32cd\u32ce\uff25\uff45]',
    'F': '[Ff\u1da0\u1e1e\u1e1f\u2109\u2131\u213b\u24a1\u24bb\u24d5\u338a-\u338c\u3399\ufb00-\ufb04\uff26\uff46]',
    'G': '[Gg\u011c-\u0123\u01e6\u01e7\u01f4\u01f5\u1d33\u1d4d\u1e20\u1e21\u210a\u24a2\u24bc\u24d6\u32cc\u32cd\u3387\u338d-\u338f\u3393\u33ac\u33c6\u33c9\u33d2\u33ff\uff27\uff47]',
    'H': '[Hh\u0124\u0125\u021e\u021f\u02b0\u1d34\u1e22-\u1e2b\u1e96\u210b-\u210e\u24a3\u24bd\u24d7\u32cc\u3371\u3390-\u3394\u33ca\u33cb\u33d7\uff28\uff48]',
    'I': '[Ii\xcc-\xcf\xec-\xef\u0128-\u0130\u0132\u0133\u01cf\u01d0\u0208-\u020b\u1d35\u1d62\u1e2c\u1e2d\u1ec8-\u1ecb\u2071\u2110\u2111\u2139\u2148\u2160-\u2163\u2165-\u2168\u216a\u216b\u2170-\u2173\u2175-\u2178\u217a\u217b\u24a4\u24be\u24d8\u337a\u33cc\u33d5\ufb01\ufb03\uff29\uff49]',
    'J': '[Jj\u0132-\u0135\u01c7-\u01cc\u01f0\u02b2\u1d36\u2149\u24a5\u24bf\u24d9\u2c7c\uff2a\uff4a]',
    'K': '[Kk\u0136\u0137\u01e8\u01e9\u1d37\u1d4f\u1e30-\u1e35\u212a\u24a6\u24c0\u24da\u3384\u3385\u3389\u338f\u3391\u3398\u339e\u33a2\u33a6\u33aa\u33b8\u33be\u33c0\u33c6\u33cd-\u33cf\uff2b\uff4b]',
    'L': '[Ll\u0139-\u0140\u01c7-\u01c9\u02e1\u1d38\u1e36\u1e37\u1e3a-\u1e3d\u2112\u2113\u2121\u216c\u217c\u24a7\u24c1\u24db\u32cf\u3388\u3389\u33d0-\u33d3\u33d5\u33d6\u33ff\ufb02\ufb04\uff2c\uff4c]',
    'M': '[Mm\u1d39\u1d50\u1e3e-\u1e43\u2120\u2122\u2133\u216f\u217f\u24a8\u24c2\u24dc\u3377-\u3379\u3383\u3386\u338e\u3392\u3396\u3399-\u33a8\u33ab\u33b3\u33b7\u33b9\u33bd\u33bf\u33c1\u33c2\u33ce\u33d0\u33d4-\u33d6\u33d8\u33d9\u33de\u33df\uff2d\uff4d]',
    'N': '[Nn\xd1\xf1\u0143-\u0149\u01ca-\u01cc\u01f8\u01f9\u1d3a\u1e44-\u1e4b\u207f\u2115\u2116\u24a9\u24c3\u24dd\u3381\u338b\u339a\u33b1\u33b5\u33bb\u33cc\u33d1\uff2e\uff4e]',
    'O': '[Oo\xba\xd2-\xd6\xf2-\xf6\u014c-\u0151\u01a0\u01a1\u01d1\u01d2\u01ea\u01eb\u020c-\u020f\u022e\u022f\u1d3c\u1d52\u1ecc-\u1ecf\u2092\u2105\u2116\u2134\u24aa\u24c4\u24de\u3375\u33c7\u33d2\u33d6\uff2f\uff4f]',
    'P': '[Pp\u1d3e\u1d56\u1e54-\u1e57\u2119\u24ab\u24c5\u24df\u3250\u3371\u3376\u3380\u338a\u33a9-\u33ac\u33b0\u33b4\u33ba\u33cb\u33d7-\u33da\uff30\uff50]',
    'Q': '[Qq\u211a\u24ac\u24c6\u24e0\u33c3\uff31\uff51]',
    'R': '[Rr\u0154-\u0159\u0210-\u0213\u02b3\u1d3f\u1d63\u1e58-\u1e5b\u1e5e\u1e5f\u20a8\u211b-\u211d\u24ad\u24c7\u24e1\u32cd\u3374\u33ad-\u33af\u33da\u33db\uff32\uff52]',
    'S': '[Ss\u015a-\u0161\u017f\u0218\u0219\u02e2\u1e60-\u1e63\u20a8\u2101\u2120\u24ae\u24c8\u24e2\u33a7\u33a8\u33ae-\u33b3\u33db\u33dc\ufb06\uff33\uff53]',
    'T': '[Tt\u0162-\u0165\u021a\u021b\u1d40\u1d57\u1e6a-\u1e71\u1e97\u2121\u2122\u24af\u24c9\u24e3\u3250\u32cf\u3394\u33cf\ufb05\ufb06\uff34\uff54]',
    'U': '[Uu\xd9-\xdc\xf9-\xfc\u0168-\u0173\u01af\u01b0\u01d3\u01d4\u0214-\u0217\u1d41\u1d58\u1d64\u1e72-\u1e77\u1ee4-\u1ee7\u2106\u24b0\u24ca\u24e4\u3373\u337a\uff35\uff55]',
    'V': '[Vv\u1d5b\u1d65\u1e7c-\u1e7f\u2163-\u2167\u2173-\u2177\u24b1\u24cb\u24e5\u2c7d\u32ce\u3375\u33b4-\u33b9\u33dc\u33de\uff36\uff56]',
    'W': '[Ww\u0174\u0175\u02b7\u1d42\u1e80-\u1e89\u1e98\u24b2\u24cc\u24e6\u33ba-\u33bf\u33dd\uff37\uff57]',
    'X': '[Xx\u02e3\u1e8a-\u1e8d\u2093\u213b\u2168-\u216b\u2178-\u217b\u24b3\u24cd\u24e7\u33d3\uff38\uff58]',
    'Y': '[Yy\xdd\xfd\xff\u0176-\u0178\u0232\u0233\u02b8\u1e8e\u1e8f\u1e99\u1ef2-\u1ef9\u24b4\u24ce\u24e8\u33c9\uff39\uff59]',
    'Z': '[Zz\u0179-\u017e\u01f1-\u01f3\u1dbb\u1e90-\u1e95\u2124\u2128\u24b5\u24cf\u24e9\u3390-\u3394\uff3a\uff5a]'
  };

  OSMCompleter = (function(superClass) {
    extend(OSMCompleter, superClass);

    function OSMCompleter() {
      return OSMCompleter.__super__.constructor.apply(this, arguments);
    }

    OSMCompleter.DESCRIPTION = "OpenStreetMap Nominatim";

    OSMCompleter.prototype.fetch_results = function() {
      var area, bbox, data, ne, sw, url;
      url = nominatim_url;
      area = citynavi.config;
      ne = area.bbox_ne;
      sw = area.bbox_sw;
      bbox = [sw[1], ne[0], ne[1], sw[0]];
      data = {
        q: this.query,
        format: "json",
        countrycodes: area.country,
        limit: 20,
        bounded: 1,
        addressdetails: 1,
        viewbox: bbox.join(',')
      };
      this.xhr = $.getJSON(url, data);
      this.xhr.always((function(_this) {
        return function() {
          return _this.xhr = null;
        };
      })(this));
      this.xhr.fail((function(_this) {
        return function() {
          return _this.submit_prediction_failure("Request failed");
        };
      })(this));
      return this.xhr.done((function(_this) {
        return function(data) {
          var addr, display, is_street, j, len, loc, loc_list, name, number, obj, part, pattern, query_filter_patterns, ref1, ref2, street, suburb, type, typename;
          loc_list = [];
          query_filter_patterns = (function() {
            var j, len, ref1, results;
            ref1 = this.query.split(" ");
            results = [];
            for (j = 0, len = ref1.length; j < len; j++) {
              part = ref1[j];
              results.push(accent_insensitive_pattern(part));
            }
            return results;
          }).call(_this);
          for (j = 0, len = data.length; j < len; j++) {
            obj = data[j];
            console.log(obj.osm_type + " " + obj["class"] + " " + obj.type + " " + obj.display_name, obj);
            addr = obj.address;
            display = "";
            name = null;
            if (((ref1 = area.cities) != null ? ref1.length : void 0) && !(ref2 = addr.city, indexOf.call(area.cities, ref2) >= 0)) {
              continue;
            }
            type = obj.type;
            if (type === "yes") {
              type = obj["class"];
            }
            if (type in addr) {
              name = addr[type];
            }
            is_street = type === 'building' || type === 'house' || type === 'living_street' || type === 'pedestrian' || type === 'cycleway' || type === 'service' || type === 'residential' || type === 'tertiary' || type === 'secondary' || type === 'primary' || type === 'trunk' || type === 'motorway' || type === 'unclassified';
            street = addr.road || addr.cycleway || addr.pedestrian;
            number = addr.house_number;
            suburb = addr.neighbourhood || addr.suburb;
            if (street) {
              display += street;
              if (number) {
                display += " " + number;
              }
              display += ", " + addr.city;
            } else if (suburb) {
              display += suburb + ", " + addr.city;
            } else {
              display += addr.city;
            }
            if (display.length && name && !(type === 'city' || type === 'suburb' || type === 'neighbourhood' || type === 'pedestrian' || type === 'cycleway')) {
              display = name + ", " + display;
            }
            if (display.length && !obj.icon && (name || !number) && !is_street) {
              typename = type.replace(/_/g, " ");
              typename = typename.replace(/^./, function(c) {
                return c.toUpperCase();
              });
              display = typename + ": " + display;
            }
            if (display.length && (name || street || obj.icon) && (obj.lat != null) && (obj.lon != null)) {
              if (!_.all((function() {
                var k, len1, results;
                results = [];
                for (k = 0, len1 = query_filter_patterns.length; k < len1; k++) {
                  pattern = query_filter_patterns[k];
                  results.push(display.match(pattern));
                }
                return results;
              })())) {
                console.log(display + " doesn't match " + _this.query);
                continue;
              }
              loc = new Location("" + display, [obj.lat, obj.lon]);
              if (obj.icon) {
                loc.icon = obj.icon;
              }
              if (is_street) {
                loc.street = street;
                if (number) {
                  loc.number = number;
                }
              }
              loc_list.push(loc);
            }
          }
          return _this.submit_location_predictions(loc_list);
        };
      })(this));
    };

    return OSMCompleter;

  })(RemoteAutocompleter);

  POICategoryCompleter = (function(superClass) {
    extend(POICategoryCompleter, superClass);

    function POICategoryCompleter() {
      return POICategoryCompleter.__super__.constructor.apply(this, arguments);
    }

    POICategoryCompleter.DESCRIPTION = "POI categories";

    POICategoryCompleter.prototype.get_predictions = function(query, callback, args) {
      var cat, j, len, pred_list, q, ref1, ss;
      if (!query.length) {
        return;
      }
      pred_list = [];
      q = query.toLowerCase();
      ref1 = citynavi.poi_categories;
      for (j = 0, len = ref1.length; j < len; j++) {
        cat = ref1[j];
        ss = cat.name.slice(0, q.length).toLowerCase();
        if (ss !== q) {
          continue;
        }
        pred_list.push(new CategoryPrediction(cat));
      }
      return callback(args, pred_list);
    };

    return POICategoryCompleter;

  })(Autocompleter);

  HistoryCompleter = (function(superClass) {
    extend(HistoryCompleter, superClass);

    function HistoryCompleter() {
      return HistoryCompleter.__super__.constructor.apply(this, arguments);
    }

    HistoryCompleter.DESCRIPTION = "Destination history";

    HistoryCompleter.prototype.get_predictions = function(query, callback, args) {
      var j, location, pred_list, ref1;
      console.log("historycompleter");
      pred_list = [];
      ref1 = location_history.history;
      for (j = ref1.length - 1; j >= 0; j += -1) {
        location = ref1[j];
        if (query.length && location.name.toLowerCase().indexOf(query.toLowerCase()) !== 0) {
          continue;
        }
        pred_list.push(new LocationPrediction(location));
        if (pred_list.length >= 10) {
          break;
        }
      }
      return callback(args, pred_list);
    };

    return HistoryCompleter;

  })(Autocompleter);

  supported_completers = {
    poi_categories: new POICategoryCompleter,
    geocoder: new GeocoderCompleter,
    bag42: new Bag42Completer,
    google: new GoogleCompleter,
    osm: new OSMCompleter,
    history: new HistoryCompleter
  };

  generate_area_completers = function(area) {
    var id, j, len, ref1, results;
    ref1 = area.autocompletion_providers;
    results = [];
    for (j = 0, len = ref1.length; j < len; j++) {
      id = ref1[j];
      results.push(supported_completers[id]);
    }
    return results;
  };

  completers = generate_area_completers(citynavi.config);

  test_completer = function() {
    var callback;
    callback = function(args, data) {
      return console.log(data);
    };
    return geocoder.get_predictions("Piccadilly", callback);
  };

  navigate_to_location = function(loc) {
    var idx, page;
    idx = location_history.add(loc);
    page = "#map-page?destination=" + idx;
    citynavi.poi_list = [];
    return $.mobile.changePage(page);
  };

  navigate_to_poi = function(poi_list) {
    var idx, loc, page, poi;
    poi = poi_list[0];
    loc = new Location(poi.name, poi.coords);
    idx = location_history.add(loc);
    page = "#map-page?destination=" + idx;
    citynavi.poi_list = poi_list;
    return $.mobile.changePage(page);
  };

  get_all_predictions = function(input, callback, callback_options) {
    var c, deferred, i, j, len, prediction_callback, prev_deferred;
    input = $.trim(input);
    prev_deferred = $.Deferred().resolve();
    for (i = j = 0, len = completers.length; j < len; i = ++j) {
      c = completers[i];
      if (c.remote) {
        if (input.length < 3) {
          continue;
        }
      }
      deferred = $.Deferred();
      deferred.done(callback);
      prediction_callback = (function(c, i, deferred, prev_deferred) {
        return function(_options, new_preds, error) {
          return prev_deferred.always(function() {
            return deferred.resolve(callback_options, new_preds, error, c);
          });
        };
      })(c, i, deferred, prev_deferred);
      c.get_predictions(input, prediction_callback, {});
      prev_deferred = deferred;
    }
    return prev_deferred.always(function() {
      return callback(callback_options, null, null, null);
    });
  };

  pred_list = [];

  render_autocomplete_results = function(args, new_preds, error, completer) {
    var $el, $input, $ul, j, key, len, pred, ref1, ref2, seen, seen_addresses, seen_streets;
    $ul = args.$ul;
    $input = args.$input;
    if (completer == null) {
      console.log("not completer?");
      if (pred_list.length === 0) {
        $ul.append("<li><em>No search results.</em></li>");
      } else {
        $ul.append("<li><em>Search done.</em></li>");
      }
    } else if (new_preds == null) {
      $ul.append("<li><em>" + completer.constructor.DESCRIPTION + " failed" + (error ? ": " + error : "") + "</em></li>");
    } else {
      pred_list = pred_list.concat(new_preds);
    }
    seen = {};
    seen_streets = {};
    seen_addresses = {};
    for (j = 0, len = pred_list.length; j < len; j++) {
      pred = pred_list[j];
      if ((ref1 = pred.location) != null ? ref1.street : void 0) {
        key = pred.location.street;
        if (seen_streets[key] && !pred.location.number) {
          continue;
        }
        seen_streets[key] = true;
        if (pred.location.number) {
          key = pred.location.street + "|" + pred.location.number;
          if (seen_addresses[key]) {
            continue;
          }
          seen_addresses[key] = true;
        }
      }
      key = pred.type + "|" + ((ref2 = pred.location) != null ? ref2.icon : void 0) + "|" + pred.name;
      if (pred.rendered) {
        seen[key] = true;
        continue;
      }
      if (seen[key]) {
        console.log(key + " already seen");
        continue;
      }
      seen[key] = true;
      $el = pred.render();
      $el.data('index', pred_list.indexOf(pred));
      pred.rendered = true;
      $el.click(function(e) {
        var idx;
        e.preventDefault();
        idx = $(this).data('index');
        pred = pred_list[idx];
        return pred.select($input, $ul);
      });
      $ul.append($el);
    }
    $ul.listview("refresh");
    return $ul.trigger("updatelayout");
  };

  $(document).on("listviewbeforefilter", "#navigate-to-input", function(e, data) {
    var $input, $ul, val;
    $input = $(data.input);
    val = $input.val();
    $ul = $(this);
    $ul.html('');
    pred_list = [];
    get_all_predictions(val, render_autocomplete_results, {
      $input: $input,
      $ul: $ul
    });
    $input.off('keypress.enter');
    return $input.on('keypress.enter', function(event) {
      if (event.keyCode === 13) {
        if (pred_list.length === 1) {
          return pred_list[0].select($input, $ul);
        }
      }
    });
  });

}).call(this);

//# sourceMappingURL=autocomplete.js.map
