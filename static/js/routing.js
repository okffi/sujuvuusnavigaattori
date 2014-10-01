(function() {
  var BackControl, DetailsControl, TRANSFORM_MAP, commentMarker, construct_locationfound_event, contextmenu, control_layers, create_tile_layer, create_wait_leg, currentStep, currentStepIndex, decode_polyline, dir_to_finnish, display_detail, display_route_result, display_step, find_route, find_route_offline, find_route_otp, find_route_reittiopas, format_code, format_time, google_colors, google_icons, handle_vehicle_update, hel_servicemap_unit_url, interpolations, interpret_jore, key, lastLeg, layers, location_to_finnish, map, map_under_drag, mapfitBounds, marker_changed, offline_cleanup, onSourceDragEnd, onTargetDragEnd, osm_notes_url, osmnotes, otp_cleanup, path_to_finnish, poi_markers, positionMarker, positionMarker2, position_bounds, position_point, previous_positions, reittiopas_url, render_route_buttons, render_route_layer, reset_map, resize_map, routeLayer, route_to_destination, route_to_service, set_comment_marker, set_source_marker, set_target_marker, simulation_step, simulation_timeoutId, simulation_timestep, simulation_timestep_default, siri_to_live, sourceCircle, sourceMarker, speak, speak_callback, speak_queue, speak_real, step_to_finnish_speech, targetMarker, transform_location, transport_colors, value, vehicles, _ref, _ref1, _ref2;

  map = null;

  map_under_drag = false;

  layers = {};

  positionMarker = sourceMarker = targetMarker = commentMarker = null;

  positionMarker2 = null;

  sourceCircle = null;

  routeLayer = null;

  position_point = position_bounds = null;

  vehicles = [];

  previous_positions = [];

  interpolations = [];

  siri_to_live = function(vehicle) {
    return {
      vehicle: {
        id: vehicle.MonitoredVehicleJourney.VehicleRef.value
      },
      trip: {
        route: vehicle.MonitoredVehicleJourney.LineRef.value
      },
      position: {
        latitude: vehicle.MonitoredVehicleJourney.VehicleLocation.Latitude,
        longitude: vehicle.MonitoredVehicleJourney.VehicleLocation.Longitude,
        bearing: vehicle.MonitoredVehicleJourney.Bearing
      }
    };
  };

  interpret_jore = function(routeId) {
    var mode, route, routeType, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
    if (citynavi.config.id !== "helsinki") {
      _ref = ["BUS", 3, routeId], mode = _ref[0], routeType = _ref[1], route = _ref[2];
    } else if (routeId != null ? routeId.match(/^1019/) : void 0) {
      _ref1 = ["FERRY", 4, "Ferry"], mode = _ref1[0], routeType = _ref1[1], route = _ref1[2];
    } else if (routeId != null ? routeId.match(/^1300/) : void 0) {
      _ref2 = ["SUBWAY", 1, routeId.substring(4, 5)], mode = _ref2[0], routeType = _ref2[1], route = _ref2[2];
    } else if (routeId != null ? routeId.match(/^300/) : void 0) {
      _ref3 = ["RAIL", 2, routeId.substring(4, 5)], mode = _ref3[0], routeType = _ref3[1], route = _ref3[2];
    } else if (routeId != null ? routeId.match(/^10(0|10)/) : void 0) {
      _ref4 = ["TRAM", 0, "" + (parseInt(routeId.substring(2, 4)))], mode = _ref4[0], routeType = _ref4[1], route = _ref4[2];
    } else if (routeId != null ? routeId.match(/^(1|2|4).../) : void 0) {
      _ref5 = ["BUS", 3, "" + (parseInt(routeId.substring(1)))], mode = _ref5[0], routeType = _ref5[1], route = _ref5[2];
    } else {
      _ref6 = ["BUS", 3, routeId], mode = _ref6[0], routeType = _ref6[1], route = _ref6[2];
    }
    return [mode, routeType, route];
  };

  $(document).bind("pageshow", function(e, data) {
    var page_id;
    page_id = $.mobile.activePage.attr("id");
    return $('html').attr('class', "ui-mobile mode-" + page_id);
  });

  $(document).bind("pagebeforechange", function(e, data) {
    var destination, location, srv_id, start_bounds, u, zoom;
    if (typeof data.toPage !== "string") {
      console.log("pagebeforechange without toPage");
      return;
    }
    console.log("pagebeforechange", data.toPage);
    u = $.mobile.path.parseUrl(data.toPage);
    if (u.hash.indexOf('#navigation-page') === 0) {
      start_bounds = L.latLngBounds([]);
      if (sourceMarker != null) {
        start_bounds.extend(sourceMarker.getLatLng());
      }
      if (position_bounds != null) {
        start_bounds.extend(position_bounds);
      }
      if (start_bounds.isValid()) {
        zoom = Math.min(map.getBoundsZoom(start_bounds), 18);
        map.setView(start_bounds.getCenter(), zoom);
      }
    }
    if (u.hash.indexOf('#map-page?service=') === 0) {
      srv_id = u.hash.replace(/.*\?service=/, "");
      e.preventDefault();
      route_to_service(srv_id);
    }
    if (u.hash.indexOf('#map-page?destination=') === 0) {
      destination = u.hash.replace(/.*\?destination=/, "");
      e.preventDefault();
      location = location_history.get(destination);
      return route_to_destination(location);
    }
  });

  $('#map-page').bind('pageshow', function(e, data) {
    var zoom;
    console.log("#map-page pageshow");
    resize_map();
    if (targetMarker != null) {
      if (sourceMarker != null) {
        sourceMarker.closePopup();
      }
      targetMarker.closePopup();
      targetMarker.openPopup();
    } else if (sourceMarker != null) {
      sourceMarker.closePopup();
      sourceMarker.openPopup();
    }
    if (routeLayer != null) {
      return mapfitBounds(routeLayer.getBounds());
    } else if (position_point != null) {
      zoom = Math.min(map.getBoundsZoom(position_bounds), 15);
      return map.setView(position_point, zoom);
    }
  });

  $('#map-page').on('pagebeforehide', function(e, o) {
    if (o.nextPage.attr('id') === "front-page") {
      return reset_map();
    }
  });

  reset_map = function() {
    var zoom;
    if (routeLayer != null) {
      map.removeLayer(routeLayer);
      routeLayer = null;
      citynavi.set_itinerary(null);
    }
    $('.route-list ul').empty().hide().parent().removeClass("active");
    $('.control-details').empty();
    if (sourceMarker != null) {
      map.removeLayer(sourceMarker);
      sourceMarker = null;
    }
    if (targetMarker != null) {
      map.removeLayer(targetMarker);
      targetMarker = null;
    }
    if (commentMarker != null) {
      map.removeLayer(commentMarker);
      commentMarker = null;
    }
    if (position_point) {
      zoom = Math.min(map.getBoundsZoom(position_bounds), 15);
      map.setView(position_point, zoom);
      set_source_marker(position_point, {
        accuracy: positionMarker.getRadius()
      });
    } else {
      map.setView(citynavi.config.center, citynavi.config.min_zoom);
    }
    vehicles = [];
    previous_positions = [];
    return interpolations = [];
  };

  $('#live-page').bind('pageshow', function(e, data) {
    map.setView(citynavi.config.center, citynavi.config.min_zoom);
    console.log("live map - subscribing to all vehicles");
    routeLayer = L.featureGroup().addTo(map);
    return $.getJSON(citynavi.config.siri_url, function(data) {
      var sub, vehicle, _i, _len, _ref, _ref1;
      _ref = data.Siri.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vehicle = _ref[_i];
        handle_vehicle_update(true, siri_to_live(vehicle));
      }
      console.log("Got " + data.Siri.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity.length + " vehicles in " + citynavi.config.name);
      sub = (_ref1 = citynavi.realtime) != null ? _ref1.client.subscribe("/location/" + citynavi.config.id + "/**", function(msg) {
        return handle_vehicle_update(false, msg);
      }) : void 0;
      return $('#live-page').on('pagebeforehide', function(e, o) {
        if (o.nextPage.attr('id') === "front-page") {
          return sub.cancel();
        }
      });
    });
  });

  $('#live-page').on('pagebeforehide', function(e, o) {
    if (o.nextPage.attr('id') === "front-page") {
      return reset_map();
    }
  });

  transport_colors = citynavi.config.colors.hsl;

  google_colors = citynavi.config.colors.google;

  google_icons = citynavi.config.icons.google;

  _ref = citynavi.config, hel_servicemap_unit_url = _ref.hel_servicemap_unit_url, osm_notes_url = _ref.osm_notes_url, reittiopas_url = _ref.reittiopas_url;

  format_code = function(code) {
    if (code.substring(0, 3) === "300") {
      return code.charAt(4);
    } else if (code.substring(0, 4) === "1300") {
      return "Metro";
    } else if (code.substring(0, 3) === "110") {
      return code.substring(2, 5);
    } else if (code.substring(0, 4) === "1019") {
      return "Suomenlinna ferry";
    }
    return code.substring(1, 5).replace(/^(0| )+| +$/, "");
  };

  format_time = function(time) {
    return time.replace(/(....)(..)(..)(..)(..)/, "$1-$2-$3 $4:$5");
  };

  decode_polyline = function(encoded, dims) {
    var b, dim, i, point, points, result, shift;
    point = (function() {
      var _i, _results;
      _results = [];
      for (i = _i = 0; 0 <= dims ? _i < dims : _i > dims; i = 0 <= dims ? ++_i : --_i) {
        _results.push(0);
      }
      return _results;
    })();
    i = 0;
    points = (function() {
      var _i, _results;
      _results = [];
      while (i < encoded.length) {
        for (dim = _i = 0; 0 <= dims ? _i < dims : _i > dims; dim = 0 <= dims ? ++_i : --_i) {
          result = 0;
          shift = 0;
          while (true) {
            b = encoded.charCodeAt(i++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
            if (!(b >= 0x20)) {
              break;
            }
          }
          point[dim] += result & 1 ? ~(result >> 1) : result >> 1;
        }
        _results.push(point.slice(0));
      }
      return _results;
    })();
    return points;
  };

  set_source_marker = function(latlng, options) {
    var accuracy, measure;
    if (sourceMarker != null) {
      map.removeLayer(sourceMarker);
      sourceMarker = null;
    }
    sourceMarker = L.marker(latlng, {
      draggable: true
    }).addTo(map).on('dragend', onSourceDragEnd);
    if (options != null ? options.accuracy : void 0) {
      accuracy = options.accuracy;
      measure = options.measure;
      if (measure == null) {
        measure = accuracy < 2000 ? "within " + (Math.round(accuracy)) + " meters" : "within " + (Math.round(accuracy / 1000)) + " km";
      }
      sourceMarker.bindPopup("The starting point for journey planner<br>(tap the red marker to update)<br>You are " + measure + " from this point");
      if (sourceCircle !== null) {
        map.removeLayer(sourceCircle);
        sourceCircle = null;
      }
    } else {
      sourceMarker.bindPopup("The starting point for journey<br>(drag the marker to change)");
    }
    if (options.popup) {
      sourceMarker.openPopup();
    }
    return marker_changed(options);
  };

  set_target_marker = function(latlng, options) {
    var description;
    if (targetMarker != null) {
      map.removeLayer(targetMarker);
      targetMarker = null;
    }
    targetMarker = L.marker(latlng, {
      draggable: true
    }).addTo(map).on('dragend', onTargetDragEnd);
    description = options != null ? options.description : void 0;
    if (description == null) {
      description = "The end point for journey<br>(drag the marker to change)";
    }
    targetMarker.bindPopup(description).openPopup();
    return marker_changed(options);
  };

  onSourceDragEnd = function(event) {
    sourceMarker.unbindPopup();
    sourceMarker.bindPopup("The starting point for journey<br>(drag the marker to change)");
    return marker_changed();
  };

  onTargetDragEnd = function(event) {
    targetMarker.unbindPopup();
    targetMarker.bindPopup("The end point for journey<br>(drag the marker to change)");
    return marker_changed();
  };

  marker_changed = function(options) {
    if ((sourceMarker != null) && (targetMarker != null)) {
      return find_route(sourceMarker.getLatLng(), targetMarker.getLatLng(), function(route) {
        if (options != null ? options.zoomToFit : void 0) {
          return mapfitBounds(route.getBounds());
        } else if (options != null ? options.zoomToShow : void 0) {
          if (!map.getBounds().contains(route.getBounds())) {
            return mapfitBounds(route.getBounds());
          }
        }
      });
    }
  };

  poi_markers = [];

  route_to_destination = function(target_location) {
    var lat, lng, marker, poi, target, _fn, _i, _j, _len, _len1, _ref1, _ref2;
    console.log("route_to_destination", target_location.name);
    _ref1 = target_location.coords, lat = _ref1[0], lng = _ref1[1];
    $.mobile.changePage("#map-page");
    target = new L.LatLng(lat, lng);
    set_target_marker(target, {
      description: target_location.name,
      zoomToFit: true
    });
    for (_i = 0, _len = poi_markers.length; _i < _len; _i++) {
      marker = poi_markers[_i];
      map.removeLayer(marker);
    }
    poi_markers = [];
    if (citynavi.poi_list) {
      _ref2 = citynavi.poi_list;
      _fn = function(poi) {
        var icon, latlng;
        icon = L.AwesomeMarkers.icon({
          svg: poi.category.get_icon_path(),
          color: 'green'
        });
        latlng = new L.LatLng(poi.coords[0], poi.coords[1]);
        marker = L.marker(latlng, {
          icon: icon
        });
        marker.bindPopup("" + poi.name);
        marker.poi = poi;
        marker.on('click', function(e) {
          return set_target_marker(e.target.getLatLng(), {
            description: poi.name
          });
        });
        marker.addTo(map);
        return poi_markers.push(marker);
      };
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        poi = _ref2[_j];
        _fn(poi);
      }
    }
    return console.log("route_to_destination done");
  };

  route_to_service = function(srv_id) {
    var params, source;
    console.log("route_to_service", srv_id);
    if (sourceMarker == null) {
      alert("The device hasn't provided the current position!");
      return;
    }
    source = sourceMarker.getLatLng();
    params = {
      service: srv_id,
      distance: 1000,
      lat: source.lat.toPrecision(7),
      lon: source.lng.toPrecision(7)
    };
    $.getJSON(hel_servicemap_unit_url + "?callback=?", params, function(data) {
      var target;
      console.log("palvelukartta callback got data");
      window.service_dbg = data;
      if (data.length === 0) {
        alert("No service near the current position.");
        return;
      }
      $.mobile.changePage("#map-page");
      target = new L.LatLng(data[0].latitude, data[0].longitude);
      set_target_marker(target, {
        description: "" + data[0].name_en + "<br>(closest " + srv_id + ")"
      });
      return console.log("palvelukartta callback done");
    });
    return console.log("route_to_service done");
  };

  create_wait_leg = function(start_time, duration, point, placename) {
    var leg;
    leg = {
      mode: "WAIT",
      routeType: null,
      route: "",
      duration: duration,
      startTime: start_time,
      endTime: start_time + duration,
      legGeometry: {
        points: [point]
      },
      from: {
        lat: point[0] * 1e-5,
        lon: point[1] * 1e-5,
        name: placename
      }
    };
    leg.to = leg.from;
    return leg;
  };

  offline_cleanup = function(data) {
    var index, itinerary, leg, new_legs, time, wait_time, _i, _j, _len, _len1, _ref1, _ref10, _ref11, _ref12, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
    _ref2 = ((_ref1 = data.plan) != null ? _ref1.itineraries : void 0) || [];
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      itinerary = _ref2[_i];
      new_legs = [];
      time = itinerary.startTime;
      _ref3 = itinerary.legs;
      for (index = _j = 0, _len1 = _ref3.length; _j < _len1; index = ++_j) {
        leg = _ref3[index];
        leg.endTime = leg.startTime + leg.duration;
        if (leg.mode === "WALK") {
          leg.from = {
            lat: leg.legGeometry.points[0][0] * 1e-5,
            lon: leg.legGeometry.points[0][1] * 1e-5,
            name: typeof legs !== "undefined" && legs !== null ? legs[index - 1].to.name : void 0
          };
          leg.to = {
            lat: _.last(leg.legGeometry.points)[0] * 1e-5,
            lon: _.last(leg.legGeometry.points)[1] * 1e-5,
            name: typeof legs !== "undefined" && legs !== null ? legs[index + 1].from.name : void 0
          };
        }
        if (citynavi.config.id === "helsinki") {
          if ((_ref4 = leg.routeId) != null ? _ref4.match(/^1019/) : void 0) {
            _ref5 = ["FERRY", 4], leg.mode = _ref5[0], leg.routeType = _ref5[1];
            leg.route = "Ferry";
          } else if ((_ref6 = leg.routeId) != null ? _ref6.match(/^1300/) : void 0) {
            _ref7 = ["SUBWAY", 1], leg.mode = _ref7[0], leg.routeType = _ref7[1];
            leg.route = "Metro";
          } else if ((_ref8 = leg.routeId) != null ? _ref8.match(/^300/) : void 0) {
            _ref9 = ["RAIL", 2], leg.mode = _ref9[0], leg.routeType = _ref9[1];
          } else if ((_ref10 = leg.routeId) != null ? _ref10.match(/^10(0|10)/) : void 0) {
            _ref11 = ["TRAM", 0], leg.mode = _ref11[0], leg.routeType = _ref11[1];
          } else if (leg.mode !== "WALK") {
            _ref12 = ["BUS", 3], leg.mode = _ref12[0], leg.routeType = _ref12[1];
          }
        }
        if (leg.startTime - time > 1000) {
          wait_time = leg.startTime - time;
          time = leg.endTime;
          new_legs.push(create_wait_leg(leg.startTime - wait_time, wait_time, leg.legGeometry.points[0], leg.from.name));
        }
        new_legs.push(leg);
        time = leg.endTime;
      }
      itinerary.legs = new_legs;
    }
    return data;
  };

  find_route_offline = function(source, target, callback) {
    $.mobile.loading('show');
    return window.citynavi.reach.find(source, target, function(itinerary) {
      var data;
      $.mobile.loading('hide');
      if (itinerary) {
        data = {
          plan: {
            itineraries: [itinerary]
          }
        };
      } else {
        data = {
          plan: {
            itineraries: []
          }
        };
      }
      data = offline_cleanup(data);
      display_route_result(data);
      if (callback) {
        callback(routeLayer);
      }
      return $.mobile.changePage("#map-page");
    });
  };

  otp_cleanup = function(data) {
    var itinerary, last, leg, legs, length, new_legs, time, wait_time, _i, _j, _len, _len1, _ref1, _ref2, _ref3;
    _ref2 = ((_ref1 = data.plan) != null ? _ref1.itineraries : void 0) || [];
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      itinerary = _ref2[_i];
      legs = itinerary.legs;
      length = legs.length;
      last = length - 1;
      if (!legs[0].routeType && legs[0].startTime !== itinerary.startTime) {
        legs[0].startTime = itinerary.startTime;
        legs[0].duration = legs[0].endTime - legs[0].startTime;
      }
      if (!legs[last].routeType && legs[last].endTime !== itinerary.endTime) {
        legs[last].endTime = itinerary.endTime;
        legs[last].duration = legs[last].endTime - legs[last].startTime;
      }
      new_legs = [];
      time = itinerary.startTime;
      _ref3 = itinerary.legs;
      for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
        leg = _ref3[_j];
        leg.legGeometry.points = decode_polyline(leg.legGeometry.points, 2);
        if (leg.startTime - time > 1000 && leg.routeType === null) {
          wait_time = leg.startTime - time;
          time = leg.endTime;
          leg.startTime -= wait_time;
          leg.endTime -= wait_time;
          new_legs.push(leg);
          new_legs.push(create_wait_leg(leg.endTime, wait_time, _.last(leg.legGeometry.points), leg.to.name));
        } else if (leg.startTime - time > 1000) {
          wait_time = leg.startTime - time;
          time = leg.endTime;
          new_legs.push(create_wait_leg(leg.startTime - wait_time, wait_time, leg.legGeometry.points[0], leg.from.name));
          new_legs.push(leg);
        } else {
          new_legs.push(leg);
          time = leg.endTime;
        }
      }
      itinerary.legs = new_legs;
    }
    return data;
  };

  find_route = function(source, target, callback) {
    var find_route_impl;
    console.log("find_route", source.toString(), target.toString(), callback != null);
    if (window.citynavi.reach != null) {
      find_route_impl = find_route_offline;
    } else {
      find_route_impl = find_route_otp;
    }
    find_route_impl(source, target, callback);
    return console.log("find_route done");
  };

  find_route_otp = function(source, target, callback) {
    var $modes, mode, params, _i, _len;
    params = {
      toPlace: "" + target.lat + "," + target.lng,
      fromPlace: "" + source.lat + "," + source.lng,
      minTransferTime: 180,
      walkSpeed: 1.17,
      maxWalkDistance: 100000,
      numItineraries: 3
    };
    if (!$('[name=usetransit]').attr('checked')) {
      params.mode = $("input:checked[name=vehiclesettings]").val();
    } else {
      params.mode = "FERRY," + $("input:checked[name=vehiclesettings]").val();
      $modes = $("#modesettings input:checked");
      if ($modes.length === 0) {
        $modes = $("#modesettings input");
      }
      for (_i = 0, _len = $modes.length; _i < _len; _i++) {
        mode = $modes[_i];
        params.mode = $(mode).attr('name') + "," + params.mode;
      }
    }
    if ($('#wheelchair').attr('checked')) {
      params.wheelchair = "true";
    }
    if ($('#prefer-free').attr('checked') && citynavi.config.id === "manchester") {
      params.preferredRoutes = "GMN_1,GMN_2,GMN_3";
    }
    return $.getJSON(citynavi.config.otp_base_url + "plan", params, function(data) {
      console.log("opentripplanner callback got data");
      data = otp_cleanup(data);
      display_route_result(data);
      if (callback) {
        callback(routeLayer);
      }
      $.mobile.changePage("#map-page");
      return console.log("opentripplanner callback done");
    });
  };

  display_route_result = function(data) {
    var $list, i, index, itinerary, maxDuration, polylines, _i, _len, _ref1, _ref2;
    if ((_ref1 = data.error) != null ? _ref1.msg : void 0) {
      $('#error-popup p').text(data.error.msg);
      $('#error-popup').popup();
      $('#error-popup').popup('open');
      return;
    }
    window.route_dbg = data;
    if (routeLayer !== null) {
      map.removeLayer(routeLayer);
      routeLayer = null;
    }
    routeLayer = L.featureGroup().addTo(map);
    maxDuration = _.max((function() {
      var _i, _len, _ref2, _results;
      _ref2 = data.plan.itineraries;
      _results = [];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        i = _ref2[_i];
        _results.push(i.duration);
      }
      return _results;
    })());
    _ref2 = [0, 1, 2];
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      index = _ref2[_i];
      $list = $(".route-buttons-" + index);
      $list.empty();
      $list.hide();
      $list.parent().removeClass("active");
      if (index in data.plan.itineraries) {
        itinerary = data.plan.itineraries[index];
        if (index === 0) {
          polylines = render_route_layer(itinerary, routeLayer);
          $list.parent().addClass("active");
          citynavi.set_itinerary(itinerary);
        } else {
          polylines = null;
        }
        $list.css('width', itinerary.duration / maxDuration * 100 + "%");
        render_route_buttons($list, itinerary, routeLayer, polylines, maxDuration);
      }
    }
    return resize_map();
  };

  render_route_layer = function(itinerary, routeLayer) {
    var leg, legs, route_includes_transit, sum, total_walking_distance, total_walking_duration, _i, _len, _results;
    legs = itinerary.legs;
    vehicles = [];
    previous_positions = [];
    sum = function(xs) {
      return _.reduce(xs, (function(x, y) {
        return x + y;
      }), 0);
    };
    total_walking_distance = sum((function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = legs.length; _i < _len; _i++) {
        leg = legs[_i];
        if (leg.distance && (leg.routeType == null)) {
          _results.push(leg.distance);
        }
      }
      return _results;
    })());
    total_walking_duration = sum((function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = legs.length; _i < _len; _i++) {
        leg = legs[_i];
        if (leg.distance && (leg.routeType == null)) {
          _results.push(leg.duration);
        }
      }
      return _results;
    })());
    route_includes_transit = _.any((function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = legs.length; _i < _len; _i++) {
        leg = legs[_i];
        _results.push(leg.routeType != null);
      }
      return _results;
    })());
    $('.control-details').html("<div class='route-details'><div>Itinerary:&nbsp;&nbsp;<i><img src='static/images/clock.svg'> " + Math.ceil(itinerary.duration / 1000 / 60) + "min<\/i>&nbsp;&nbsp;<i><img src='static/images/walking.svg'> " + Math.ceil(total_walking_duration / 1000 / 60) + "min / " + Math.ceil(total_walking_distance / 100) / 10 + "km<\/i></div></div>");
    _results = [];
    for (_i = 0, _len = legs.length; _i < _len; _i++) {
      leg = legs[_i];
      _results.push((function(leg) {
        var color, dashArray, icon, label, last_stop, marker, point, points, polyline, secondsCounter, stop, uid, _ref1, _ref2;
        uid = Math.floor(Math.random() * 1000000);
        points = (function() {
          var _j, _len1, _ref1, _results1;
          _ref1 = leg.legGeometry.points;
          _results1 = [];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            point = _ref1[_j];
            _results1.push(new L.LatLng(point[0] * 1e-5, point[1] * 1e-5));
          }
          return _results1;
        })();
        color = google_colors[(_ref1 = leg.routeType) != null ? _ref1 : leg.mode];
        if (leg.routeType !== null) {
          dashArray = null;
        } else {
          dashArray = "5,10";
          color = "#000";
        }
        polyline = new L.Polyline(points, {
          color: color,
          weight: 8,
          opacity: 0.2,
          clickable: false,
          dashArray: dashArray
        });
        polyline.addTo(routeLayer);
        polyline = new L.Polyline(points, {
          color: color,
          opacity: 0.4,
          dashArray: dashArray
        }).on('click', function(e) {
          mapfitBounds(polyline.getBounds());
          if (typeof marker !== "undefined" && marker !== null) {
            return marker.openPopup();
          }
        });
        polyline.addTo(routeLayer);
        if (true) {
          stop = leg.from;
          last_stop = leg.to;
          point = {
            y: stop.lat,
            x: stop.lon
          };
          icon = L.divIcon({
            className: "navigator-div-icon"
          });
          label = "<span style='font-size: 24px;'><img src='static/images/" + google_icons[(_ref2 = leg.routeType) != null ? _ref2 : leg.mode] + "' style='vertical-align: sub; height: 24px'/><span>" + leg.route + "</span></span>";
          secondsCounter = function() {
            var duration, hours, minutes, now, seconds, sign;
            now = citynavi.time();
            if (leg.startTime >= now) {
              duration = moment.duration(leg.startTime - now);
              sign = "";
            } else {
              duration = moment.duration(now - leg.startTime);
              sign = "-";
            }
            seconds = (duration.seconds() + 100).toString().substring(1);
            minutes = duration.minutes();
            hours = duration.hours() + 24 * duration.days();
            if (hours > 0) {
              minutes = (minutes + 100).toString().substring(1);
              minutes = "" + hours + ":" + minutes;
            }
            $("#counter" + uid).text("" + sign + minutes + ":" + seconds);
            return setTimeout(secondsCounter, 1000);
          };
          marker = L.marker(new L.LatLng(point.y, point.x), {
            icon: icon
          }).addTo(routeLayer).bindPopup("<b>Time: " + (moment(leg.startTime).format("HH:mm")) + "&mdash;" + (moment(leg.endTime).format("HH:mm")) + "</b><br /><b>From:</b> " + (stop.name || "") + "<br /><b>To:</b> " + (last_stop.name || ""));
          if ((leg.routeType != null) || leg === legs[0]) {
            marker.bindLabel(label + ("<span id='counter" + uid + "' class='counter firstleg" + (leg === legs[0]) + " transitroute" + route_includes_transit + "'></span>"), {
              noHide: true
            }).showLabel();
            secondsCounter();
          }
        }
        if (leg.routeType != null) {
          $.getJSON(citynavi.config.otp_base_url + "transit/variantForTrip", {
            tripId: leg.tripId,
            tripAgency: leg.agencyId
          }, function(data) {
            var geometry, line_layer;
            geometry = data.geometry;
            points = (function() {
              var _j, _len1, _ref3, _results1;
              _ref3 = decode_polyline(geometry.points, 2);
              _results1 = [];
              for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
                point = _ref3[_j];
                _results1.push(new L.LatLng(point[0] * 1e-5, point[1] * 1e-5));
              }
              return _results1;
            })();
            line_layer = new L.Polyline(points, {
              color: color,
              opacity: 0.2
            });
            return line_layer.addTo(routeLayer);
          });
          console.log("subscribing to " + leg.routeId);
          $.getJSON(citynavi.config.siri_url, {
            lineRef: leg.routeId
          }, function(data) {
            var vehicle, _j, _len1, _ref3, _ref4;
            _ref3 = data.Siri.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity;
            for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
              vehicle = _ref3[_j];
              handle_vehicle_update(true, siri_to_live(vehicle));
            }
            console.log("Got " + data.Siri.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity.length + " vehicles on route " + leg.routeId);
            return (_ref4 = citynavi.realtime) != null ? _ref4.subscribe_route(leg.routeId, function(msg) {
              return handle_vehicle_update(false, msg);
            }) : void 0;
          });
        }
        return polyline;
      })(leg));
    }
    return _results;
  };

  handle_vehicle_update = function(initial, msg) {
    var icon, id, interpolation, mode, old_pos, pos, route, routeType, steps, _ref1;
    id = msg.vehicle.id;
    pos = [msg.position.latitude, msg.position.longitude];
    _ref1 = interpret_jore(msg.trip.route), mode = _ref1[0], routeType = _ref1[1], route = _ref1[2];
    if (!(id in vehicles)) {
      icon = L.divIcon({
        className: "navigator-div-icon",
        html: "<div id='vehicle-" + id + "' style='background: " + google_colors[routeType != null ? routeType : mode] + "'><span>" + route + "</span><img src='static/images/" + google_icons[routeType != null ? routeType : mode] + "' height='20px' /></div>"
      });
      vehicles[id] = L.marker(pos, {
        icon: icon
      }).addTo(routeLayer);
      if (!initial) {
        console.log("new vehicle " + id + " on route " + msg.trip.route);
      }
    } else {
      old_pos = previous_positions[id];
      steps = 30;
      interpolation = function(index, id, old_pos) {
        var lat, lng;
        lat = old_pos[0] + (pos[0] - old_pos[0]) * (index / steps);
        lng = old_pos[1] + (pos[1] - old_pos[1]) * (index / steps);
        vehicles[id].setLatLng([lat, lng]);
        if (index < steps) {
          return interpolations[id] = setTimeout((function() {
            return interpolation(index + 1, id, old_pos);
          }), 1000);
        } else {
          return interpolations[id] = null;
        }
      };
      if (previous_positions[id][0] !== pos[0] || previous_positions[id][1] !== pos[1]) {
        if (interpolations[id]) {
          clearTimeout(interpolations[id]);
        }
        interpolation(1, id, old_pos);
      }
    }
    previous_positions[id] = pos;
    $("#vehicle-" + id).css('transform', "rotate(" + (msg.position.bearing + 90) + "deg)");
    return $("#vehicle-" + id + " span").css('transform', "rotate(-" + (msg.position.bearing + 90) + "deg)");
  };

  render_route_buttons = function($list, itinerary, route_layer, polylines, max_duration) {
    var $end, $full_trip, $start, index, leg, length, trip_duration, trip_start, _fn, _i, _len, _ref1;
    trip_duration = itinerary.duration;
    trip_start = itinerary.startTime;
    length = itinerary.legs.length + 1;
    $full_trip = $("<li class='leg'><div class='leg-bar' style='margin-right: 3px'><i style='font-weight: lighter'><img />Total</i><div class='leg-indicator'>" + (Math.ceil(trip_duration / 1000 / 60)) + "min</div></div></li>");
    $full_trip.css("left", "{0}%");
    $full_trip.css("width", "{5}%");
    $full_trip.click(function(e) {
      mapfitBounds(route_layer.getBounds());
      sourceMarker.closePopup();
      targetMarker.closePopup();
      return sourceMarker.openPopup();
    });
    $start = $("<li class='leg'><div class='leg-bar'><i><img src='static/images/walking.svg' height='100%' style='visibility: hidden' /></i><div class='leg-indicator' style='font-style: italic; text-align: left'>" + (moment(trip_start).format("HH:mm")) + "</div></div></li>");
    $start.css("left", "" + 0 + "%");
    $start.css("width", "" + 15 + "%");
    $list.append($start);
    $end = $("<li class='leg'><div class='leg-bar'><i><img src='static/images/walking.svg' height='100%' style='visibility: hidden' /></i><div class='leg-indicator' style='font-style: italic; text-align: right'>" + (moment(trip_start + trip_duration).format("HH:mm")) + "</div></div></li>");
    $end.css("right", "" + 0 + "%");
    $end.css("width", "" + 15 + "%");
    $list.append($end);
    _ref1 = itinerary.legs;
    _fn = function(index) {
      var $leg, color, icon_name, leg_duration, leg_label, leg_start, leg_subscript, _ref2, _ref3;
      if (leg.mode === "WALK" && $('#wheelchair').attr('checked')) {
        icon_name = "wheelchair.svg";
      } else {
        icon_name = google_icons[(_ref2 = leg.routeType) != null ? _ref2 : leg.mode];
      }
      color = google_colors[(_ref3 = leg.routeType) != null ? _ref3 : leg.mode];
      leg_start = (leg.startTime - trip_start) / trip_duration;
      leg_duration = leg.duration / trip_duration;
      leg_label = "<img src='static/images/" + icon_name + "' height='100%' />";
      if ((leg.routeType == null) && (leg.distance != null) && leg.duration / max_duration > 0.35) {
        leg_subscript = "<div class='leg-indicator' style='font-weight: normal'>" + (Math.ceil(leg.distance / 100) / 10) + "km</div>";
      } else {
        leg_subscript = "<div class='leg-indicator'>" + leg.route + "</div>";
      }
      $leg = $("<li class='leg'><div style='background: " + color + ";' class='leg-bar'><i>" + leg_label + "</i>" + leg_subscript + "</div></li>");
      $leg.css("left", "" + (leg_start * 100) + "%");
      $leg.css("width", "" + (leg_duration * 100) + "%");
      $leg.click(function(e) {
        if ($list.parent().filter('.active').length > 0) {
          return polylines[index].fire("click");
        } else {
          routeLayer.eachLayer(function(layer) {
            return routeLayer.removeLayer(layer);
          });
          $list.parent().siblings().removeClass('active');
          polylines = render_route_layer(itinerary, routeLayer);
          $list.parent().addClass('active');
          mapfitBounds(routeLayer.getBounds());
          return citynavi.set_itinerary(itinerary);
        }
      });
      $leg.find('i').click(function(e) {
        return polylines[index].fire("click");
      });
      return $list.append($leg);
    };
    for (index = _i = 0, _len = _ref1.length; _i < _len; index = ++_i) {
      leg = _ref1[index];
      _fn(index);
    }
    return $list.show();
  };

  find_route_reittiopas = function(source, target, callback) {
    var params;
    params = {
      request: "route",
      detail: "full",
      epsg_in: "wgs84",
      epsg_out: "wgs84",
      from: "" + source.lng + "," + source.lat,
      to: "" + target.lng + "," + target.lat
    };
    return $.getJSON(reittiopas_url, params, function(data) {
      var leg, legs, route, _fn, _i, _len;
      window.route_dbg = data;
      if (routeLayer !== null) {
        map.removeLayer(routeLayer);
        routeLayer = null;
      } else {
        map.removeLayer(layers["osm"]);
        map.addLayer(layers["cloudmade"]);
      }
      route = L.featureGroup().addTo(map);
      routeLayer = route;
      legs = data[0][0].legs;
      _fn = function() {
        var color, last_stop, marker, point, points, polyline, stop;
        points = (function() {
          var _j, _len1, _ref1, _results;
          _ref1 = leg.shape;
          _results = [];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            point = _ref1[_j];
            _results.push(new L.LatLng(point.y, point.x));
          }
          return _results;
        })();
        color = transport_colors[leg.type];
        polyline = new L.Polyline(points, {
          color: color
        }).on('click', function(e) {
          mapfitBounds(e.target.getBounds());
          if (typeof marker !== "undefined" && marker !== null) {
            return marker.openPopup();
          }
        });
        polyline.addTo(route);
        if (leg.type !== 'walk') {
          stop = leg.locs[0];
          last_stop = leg.locs[leg.locs.length - 1];
          point = leg.shape[0];
          return marker = L.marker(new L.LatLng(point.y, point.x)).addTo(route).bindPopup("<b><Time: " + (format_time(stop.depTime)) + "</b><br /><b>From:</b> {stop.name}<br /><b>To:</b> " + last_stop.name);
        }
      };
      for (_i = 0, _len = legs.length; _i < _len; _i++) {
        leg = legs[_i];
        _fn();
      }
      if (!map.getBounds().contains(route.getBounds())) {
        return mapfitBounds(route.getBounds());
      }
    });
  };

  resize_map = function() {
    var attr_height, attr_width, height;
    console.log("resize_map");
    height = window.innerHeight - $('#map-page [data-role=footer]').height() - 0;
    console.log("#map height", height);
    attr_width = height - 10;
    $('.leaflet-control-attribution').css('width', attr_width + "px");
    attr_height = $('.leaflet-control-attribution').height();
    console.log(".leaflet-control-attribution height", attr_height);
    $('.leaflet-control-attribution').css('left', attr_width / 2 - attr_height / 8 + "px");
    return $('.leaflet-control-attribution').css('top', -attr_width / 2 - attr_height / 2 + "px");
  };

  $(window).on('resize', function() {
    return resize_map();
  });

  window.map_dbg = map = L.map('map', {
    minZoom: citynavi.config.min_zoom,
    zoomControl: false,
    attributionControl: false
  }).setView(citynavi.config.center, citynavi.config.min_zoom);

  map.whenReady(function() {
    console.log("map ready");
    return setTimeout(function() {
      return map.fire('zoomend', 0);
    });
  });

  map.on('zoomend', function(e) {
    var i, minzooms, zoom;
    console.log("zoomend");
    zoom = map.getZoom();
    minzooms = ((function() {
      var _i, _results;
      _results = [];
      for (i = _i = 0; 0 <= zoom ? _i <= zoom : _i >= zoom; i = 0 <= zoom ? ++_i : --_i) {
        _results.push("minzoom-" + i);
      }
      return _results;
    })()).join(" ");
    return $('#map').attr('class', "leaflet-container leaflet-fade-anim " + minzooms);
  });

  $(document).ready(function() {
    resize_map();
    return map.invalidateSize();
  });

  DetailsControl = L.Control.extend({
    options: {
      position: 'topleft'
    },
    onAdd: function(map) {
      var $container;
      $container = $("<div class='control-details'></div>");
      return $container.get(0);
    }
  });

  new DetailsControl().addTo(map);

  new DetailsControl({
    position: 'topright'
  }).addTo(map);

  L.control.attribution({
    position: 'bottomright'
  }).addTo(map);

  if (!window.testem_mode) {
    map.locate({
      setView: false,
      maxZoom: 15,
      watch: true,
      timeout: 0xFFFFFFFF,
      enableHighAccuracy: true
    });
  }

  create_tile_layer = function(map_config) {
    return L.tileLayer(map_config.url_template, map_config.opts);
  };

  _ref1 = citynavi.config.maps;
  for (key in _ref1) {
    value = _ref1[key];
    layers[key] = create_tile_layer(value);
  }

  layers[citynavi.config.defaultmap].addTo(map);

  osmnotes = new leafletOsmNotes();

  control_layers = {};

  _ref2 = citynavi.config.maps;
  for (key in _ref2) {
    value = _ref2[key];
    control_layers[value.name] = layers[key];
  }

  L.control.layers(control_layers, {
    "View map errors": osmnotes
  }).addTo(map);

  L.control.scale().addTo(map);

  BackControl = L.Control.extend({
    options: {
      position: 'topleft'
    },
    onAdd: function(map) {
      var $button, $container;
      $container = $("<div id='back-control'>");
      $button = $("<a href='' data-role='button' data-rel='back' data-icon='arrow-l' data-mini='true'>Back</a>");
      $button.on('click', function(e) {
        e.preventDefault();
        if (history.length < 2) {
          $.mobile.changePage("#front-page");
        } else {
          history.back();
        }
        return false;
      });
      $container.append($button);
      return $container.get(0);
    }
  });

  L.control.zoom().addTo(map);

  TRANSFORM_MAP = [];

  transform_location = function(point) {
    var current, radius, src_pnt, t, _i, _len;
    for (_i = 0, _len = TRANSFORM_MAP.length; _i < _len; _i++) {
      t = TRANSFORM_MAP[_i];
      src_pnt = new L.LatLng(t.source.lat, t.source.lng);
      current = new L.LatLng(point.lat, point.lng);
      radius = 100;
      if (src_pnt.distanceTo(current) < radius) {
        point.lat = t.dest.lat;
        point.lng = t.dest.lng;
        return;
      }
    }
  };

  map.on('dragstart', function(e) {
    return map_under_drag = true;
  });

  map.on('dragend', function(e) {
    return map_under_drag = false;
  });

  map.on('locationerror', function(e) {
    if (e.message !== "Geolocation error: The operation couldn’t be completed. (kCLErrorDomain error 0.).") {
      return alert(e.message);
    }
  });

  map.on('locationfound', function(e) {
    var bbox_ne, bbox_sw, measure, point, popup, radius, zoom, _ref3, _ref4;
    radius = e.accuracy;
    measure = e.accuracy < 2000 ? "within " + (Math.round(e.accuracy)) + " meters" : "within " + (Math.round(e.accuracy / 1000)) + " km";
    point = e.latlng;
    transform_location(point);
    bbox_sw = citynavi.config.bbox_sw;
    bbox_ne = citynavi.config.bbox_ne;
    if (!((bbox_sw[0] < (_ref3 = point.lat) && _ref3 < bbox_ne[0])) || !((bbox_sw[1] < (_ref4 = point.lng) && _ref4 < bbox_ne[1]))) {
      if (sourceMarker !== null) {
        if (positionMarker !== null) {
          map.removeLayer(positionMarker);
          map.removeLayer(positionMarker2);
          positionMarker = null;
        }
        return;
      }
      console.log(bbox_sw[0], point.lat, bbox_ne[0]);
      console.log(bbox_sw[1], point.lng, bbox_ne[1]);
      console.log("using area center instead of geolocation outside area");
      point.lat = citynavi.config.center[0];
      point.lng = citynavi.config.center[1];
      e.accuracy = 2001;
      radius = 50;
      measure = "nowhere near";
      e.bounds = L.latLngBounds(bbox_sw, bbox_ne);
    }
    if ((positionMarker != null) && map.getBounds().contains(positionMarker.getLatLng())) {
      if (!map.getBounds().contains(e.bounds)) {
        if (!map_under_drag) {
          map.panTo(point);
        }
      }
    }
    position_point = point;
    position_bounds = e.bounds;
    citynavi.set_source_location([point.lat, point.lng]);
    if (positionMarker !== null) {
      map.removeLayer(positionMarker);
      map.removeLayer(positionMarker2);
      positionMarker = null;
    } else if (sourceMarker === null) {
      zoom = Math.min(map.getBoundsZoom(e.bounds), 15);
      map.setView(point, zoom);
      popup = $.mobile.activePage.attr("id") !== "front-page";
      set_source_marker(point, {
        accuracy: radius,
        measure: measure,
        popup: popup
      });
    }
    if (e.accuracy > 2000) {
      return;
    }
    positionMarker = L.circle(point, radius, {
      color: 'red',
      weight: 1,
      opacity: 0.4
    }).addTo(map).on('click', function(e) {
      return set_source_marker(point, {
        accuracy: radius,
        measure: measure
      });
    });
    return positionMarker2 = ((e.heading != null) && !isNaN(e.heading) ? L.rotatedMarker(point, {
      angle: e.heading,
      icon: L.icon({
        iconUrl: 'static/images/arrow.svg',
        iconSize: [20, 20]
      })
    }) : L.circleMarker(point, {
      radius: 7,
      color: 'red',
      weight: 2,
      fillOpacity: 1
    })).addTo(map).on('click', function(e) {
      return set_source_marker(point, {
        accuracy: radius,
        measure: measure
      });
    });
  });

  map.on('click', function(e) {
    if ((sourceMarker != null) && (targetMarker != null)) {
      return;
    }
    if (sourceMarker === null) {
      return set_source_marker(e.latlng, {
        popup: true
      });
    } else if (targetMarker === null) {
      return set_target_marker(e.latlng);
    }
  });

  contextmenu = L.popup().setContent('<a href="#" onclick="return setMapSource()">Set source</a> | <a href="#" onclick="return setMapTarget()">Set target</a> | <a href="#" onclick="return setNoteLocation()">Report map error</a>');

  set_comment_marker = function(latlng) {
    var description;
    if (commentMarker != null) {
      map.removeLayer(commentMarker);
      commentMarker = null;
    }
    if (latlng == null) {
      return;
    }
    commentMarker = L.marker(latlng, {
      draggable: true
    }).addTo(map);
    description = typeof options !== "undefined" && options !== null ? options.description : void 0;
    if (description == null) {
      description = "Location for map error report";
    }
    return commentMarker.bindPopup(description).openPopup();
  };

  map.on('contextmenu', function(e) {
    contextmenu.setLatLng(e.latlng);
    contextmenu.openOn(map);
    window.setMapSource = function() {
      set_source_marker(e.latlng);
      map.removeLayer(contextmenu);
      return false;
    };
    window.setMapTarget = function() {
      set_target_marker(e.latlng);
      map.removeLayer(contextmenu);
      return false;
    };
    return window.setNoteLocation = function() {
      var hide;
      set_comment_marker(e.latlng);
      osmnotes.addTo(map);
      $('#comment-box').show();
      hide = function() {
        $('#comment-box').hide();
        resize_map();
        return set_comment_marker();
      };
      $('#comment-box .cancel-button').unbind('click');
      $('#comment-box .cancel-button').bind('click', function() {
        hide();
        return false;
      });
      $('#comment-box').unbind('submit');
      $('#comment-box').bind('submit', function() {
        var lat, lon, text, uri;
        text = $('#comment-box textarea').val();
        lat = commentMarker.getLatLng().lat;
        lon = commentMarker.getLatLng().lng;
        uri = osm_notes_url;
        $.post(uri, {
          lat: lat,
          lon: lon,
          text: text
        }, function() {
          $('#comment-box textarea').val("");
          return hide();
        });
        return false;
      });
      $.mobile.changePage('#map-page');
      resize_map();
      map.removeLayer(contextmenu);
      return false;
    };
  });

  mapfitBounds = function(bounds) {
    var bottomPadding, topPadding;
    topPadding = $(".ui-header").height() + $(".control-details").height();
    bottomPadding = $(".ui-footer").height();
    return map.fitBounds(bounds, {
      paddingTopLeft: [0, topPadding],
      paddingBottomRight: [0, bottomPadding]
    });
  };

  simulation_timestep_default = 10000;

  simulation_timeoutId = null;

  simulation_timestep = simulation_timestep_default;

  $('.pause-navigation-link').on('click', function(e) {
    if ($('.pause-navigation-link').attr('data-icon') === 'pause') {
      console.log("Pausing");
      simulation_timestep = 0;
      $('.pause-navigation-link').attr('data-icon', 'play');
      $('.pause-navigation-link .ui-icon').attr('class', 'ui-icon ui-icon-play ui-icon-shadow');
      $('.pause-navigation-link').buttonMarkup('option', 'icon', 'play');
      return $('.pause-navigation-link .ui-btn-text').text("Continue");
    } else {
      console.log("Playing");
      simulation_timestep = simulation_timestep_default;
      $('.pause-navigation-link').attr('data-icon', 'pause');
      $('.pause-navigation-link .ui-icon').attr('class', 'ui-icon ui-icon-pause ui-icon-shadow');
      $('.pause-navigation-link').buttonMarkup('option', 'icon', 'pause');
      return $('.pause-navigation-link .ui-btn-text').text("Pause");
    }
  });

  $('.journey-preview-link').on('click', function(e) {
    var itinerary, route_id, vehicle, _i, _len, _ref3;
    itinerary = citynavi.get_itinerary();
    for (route_id in ((_ref3 = citynavi.realtime) != null ? _ref3.subs : void 0) || []) {
      citynavi.realtime.unsubscribe_route(route_id);
    }
    for (_i = 0, _len = vehicles.length; _i < _len; _i++) {
      vehicle = vehicles[_i];
      routeLayer.removeLayer(vehicle);
    }
    vehicles = [];
    previous_positions = [];
    interpolations = [];
    console.log("Starting simulation");
    return simulation_step(itinerary, itinerary.startTime - 60 * 1000);
  });

  lastLeg = null;

  currentStep = null;

  currentStepIndex = null;

  speak_queue = [];

  $('#navigation-page').on('pagebeforehide', function(e, o) {
    if (o.nextPage.attr('id') === "map-page") {
      if (simulation_timeoutId != null) {
        clearTimeout(simulation_timeoutId);
        simulation_timeoutId = null;
        citynavi.set_simulation_time(null);
      }
      if (positionMarker != null) {
        map.removeLayer(positionMarker);
        map.removeLayer(positionMarker2);
        positionMarker = null;
        position_point = null;
        citynavi.set_source_location(null);
      }
      lastLeg = null;
      currentStep = null;
      currentStepIndex = null;
      return speak_queue = [];
    }
  });

  $('#use-speech').change(function() {
    var xhr;
    if ($('#use-speech').attr('checked')) {
      if (typeof meSpeak === "undefined" || meSpeak === null) {
        xhr = $.ajax({
          url: "mespeak/mespeak.js",
          dataType: "script",
          cache: true
        });
        xhr.done(function() {
          if (typeof meSpeak !== "undefined" && meSpeak !== null) {
            if (typeof meSpeak !== "undefined" && meSpeak !== null) {
              meSpeak.loadConfig("mespeak/mespeak_config.json");
            }
            if (typeof meSpeak !== "undefined" && meSpeak !== null) {
              meSpeak.loadVoice("mespeak/voices/fi.json");
            }
            return console.log("meSpeak loaded");
          } else {
            return console.log("meSpeak failed");
          }
        });
        return xhr.fail(function(jqXHR, textStatus, errorThrown) {
          return console.log("meSpeak failed to load: " + textStatus + " " + errorThrown);
        });
      }
    }
  });

  speak_real = function(text) {
    if ((typeof meSpeak !== "undefined" && meSpeak !== null) && $('#use-speech').attr('checked')) {
      console.log("*** Speaking", text);
      return meSpeak.speak(text, {}, speak_callback);
    } else {
      console.log("*** Not speaking", text);
      return speak_callback();
    }
  };

  display_detail = function(text) {
    return $('.control-details').html("<div class='route-details'><div>" + text + "</div></div>");
  };

  speak = function(text) {
    if (speak_queue.length === 0) {
      speak_queue.unshift(text);
      return speak_real(text);
    } else {
      return speak_queue.unshift(text);
    }
  };

  speak_callback = function() {
    var text;
    console.log("... speech done.");
    speak_queue.pop();
    if (speak_queue.length !== 0) {
      text = speak_queue[0];
      return speak_real(text);
    }
  };

  dir_to_finnish = {
    DEPART: "",
    NORTH: "Kulje pohjoiseen katua",
    SOUTH: "Kulje etelään katua",
    EAST: "Kulje itään katua",
    WEST: "Kulje länteen katua",
    NORTHWEST: "Kulje luoteeseen katua",
    SOUTHEAST: "Kulje kaakkoon katua",
    NORTHEAST: "Kulje koilliseen katua",
    SOUTHWEST: "Kulje lounaaseen katua",
    CONTINUE: "Jatka eteenpäin kadulle",
    LEFT: "Käänny vasemmalle kadulle",
    RIGHT: "Käänny oikealle kadulle",
    SLIGHTLY_LEFT: "Käänny viistosti vasemmalle kadulle",
    SLIGHTLY_RIGHT: "Käänny viistosti oikealle kadulle",
    HARD_LEFT: "Käänny jyrkästi vasemmalle kadulle",
    HARD_RIGHT: "Käänny jyrkästi oikealle kadulle",
    UTURN_LEFT: "Tee U-käännös vasemmalle kadulle",
    UTURN_RIGHT: "Tee U-käännös oikealle kadulle",
    CIRCLE_CLOCKWISE: "Kulje myötäpäivään liikenneympyrää",
    CIRCLE_COUNTERCLOCKWISE: "Kulje vastapäivään liikenneympyrää",
    ELEVATOR: "Mene hissillä kadulle"
  };

  path_to_finnish = {
    "bike path": "pyörätie",
    path: "polku",
    "open area": "aukio",
    bridleway: "kärrypolku",
    platform: "laituri",
    footbridge: "ylikulkusilta",
    underpass: "alikulku",
    road: "tie",
    ramp: "liittymä",
    link: "linkki",
    "service road": "pihatie",
    alley: "kuja",
    "parking aisle": "parkkipaikka",
    byway: "sivutie",
    track: "ajoura",
    sidewalk: "jalkakäytävä",
    steps: "portaat",
    cycleway: "pyörätie",
    "Elevator": "hissi",
    "default level": "maantaso"
  };

  location_to_finnish = function(location) {
    var corner;
    corner = location.name.match(/corner of (.*) and (.*)/);
    if (corner != null) {
      return "katujen " + corner[1] + " ja " + corner[2] + " kulma";
    }
    return path_to_finnish[location.name] || location.name || 'nimetön';
  };

  step_to_finnish_speech = function(step) {
    var text;
    if (step.relativeDirection && step.relativeDirection !== "DEPART") {
      text = dir_to_finnish[step.relativeDirection] || step.relativeDirection;
    } else {
      text = dir_to_finnish[step.absoluteDirection] || step.asboluteDirection;
    }
    text += " " + (path_to_finnish[step.streetName] || step.streetName || 'nimetön');
    return text;
  };

  display_step = function(step) {
    var icon, marker;
    icon = L.divIcon({
      className: "navigator-div-icon"
    });
    return marker = L.marker(new L.LatLng(step.lat, step.lon), {
      icon: icon
    }).addTo(routeLayer).bindLabel("" + (((step.relativeDirection && step.relativeDirection !== "DEPART") || step.absoluteDirection).toLowerCase().replace('_', ' ')) + " on " + (step.streetName || 'unnamed path'), {
      noHide: true
    }).showLabel();
  };

  simulation_step = function(itinerary, time) {
    var accuracy, geometry, l, latLng, leg, legIndex, nextLeg, p, predecessor, share, step, _i, _len, _ref10, _ref11, _ref12, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
    simulation_timeoutId = setTimeout((function() {
      return simulation_step(itinerary, time + simulation_timestep);
    }), 1000);
    citynavi.set_simulation_time(moment(time));
    leg = null;
    _ref3 = itinerary.legs;
    for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
      l = _ref3[_i];
      if ((l.startTime <= time && time < l.endTime)) {
        leg = l;
      }
    }
    if (time < itinerary.legs[0].startTime) {
      leg = {
        startTime: itinerary.startTime,
        endTime: itinerary.legs[0].startTime,
        legGeometry: {
          points: [[sourceMarker.getLatLng().lat * 1e5, sourceMarker.getLatLng().lng * 1e5]]
        }
      };
    } else if (time >= itinerary.legs[itinerary.legs.length - 1].endTime) {
      leg = {
        startTime: itinerary.legs[itinerary.legs.length - 1].endTime,
        endTime: itinerary.endTime,
        legGeometry: {
          points: [[targetMarker.getLatLng().lat * 1e5, targetMarker.getLatLng().lng * 1e5]]
        }
      };
    }
    if (leg == null) {
      console.log("No current leg");
      return;
    }
    if (lastLeg == null) {
      display_detail("Instructions start at " + itinerary.legs[0].from.name + ".");
      speak("Ohjeet alkavat kadulta " + location_to_finnish(itinerary.legs[0].from));
      if ((_ref4 = itinerary.legs[0].steps) != null ? _ref4[0] : void 0) {
        currentStep = (_ref5 = itinerary.legs[0].steps) != null ? _ref5[0] : void 0;
        currentStepIndex = 0;
        display_step(currentStep);
        console.log("current step", currentStep);
      }
    }
    if (leg !== lastLeg && (leg != null ? (_ref6 = leg.steps) != null ? _ref6[0] : void 0 : void 0)) {
      currentStep = leg.steps[0];
      currentStepIndex = 0;
    }
    lastLeg = leg;
    legIndex = itinerary.legs.indexOf(leg) + 1;
    geometry = (function() {
      var _j, _len1, _ref7, _results;
      _ref7 = leg.legGeometry.points;
      _results = [];
      for (_j = 0, _len1 = _ref7.length; _j < _len1; _j++) {
        p = _ref7[_j];
        _results.push([p[0] * 1e-5, p[1] * 1e-5]);
      }
      return _results;
    })();
    share = (time - leg.startTime) / (leg.endTime - leg.startTime);
    if (geometry.length > 1 && share !== 0) {
      _ref7 = L.GeometryUtil.interpolateOnLine(map, geometry, share), latLng = _ref7.latLng, predecessor = _ref7.predecessor;
    } else {
      _ref8 = [L.latLng(geometry[0]), -1], latLng = _ref8[0], predecessor = _ref8[1];
    }
    if ((currentStep != null) && latLng.distanceTo(new L.LatLng(currentStep.lat, currentStep.lon)) < 5) {
      step = currentStep;
      display_detail("Next, go " + (((step.relativeDirection && step.relativeDirection !== "DEPART") || step.absoluteDirection).toLowerCase().replace('_', ' ')) + " on " + (step.streetName || 'unnamed path') + ".");
      speak(step_to_finnish_speech(step));
      currentStepIndex = currentStepIndex + 1;
      currentStep = (_ref9 = leg.steps) != null ? _ref9[currentStepIndex] : void 0;
      if (currentStep == null) {
        nextLeg = (_ref10 = itinerary.legs) != null ? _ref10[legIndex + 1] : void 0;
        console.log("nextLeg", nextLeg);
        if (nextLeg != null ? (_ref11 = nextLeg.steps) != null ? _ref11[0] : void 0 : void 0) {
          currentStep = nextLeg != null ? (_ref12 = nextLeg.steps) != null ? _ref12[0] : void 0 : void 0;
          currentStepIndex = 0;
        } else {
          currentStep = null;
        }
      }
      if (currentStep != null) {
        display_step(currentStep);
      } else {
        display_detail("Arriving at destination.");
        speak("Saavutaan perille");
      }
    }
    accuracy = 50;
    return map.fire('locationfound', construct_locationfound_event(latLng, accuracy));
  };

  construct_locationfound_event = function(latLng, accuracy) {
    var bounds, lat, latAccuracy, lng, lngAccuracy;
    lat = latLng.lat;
    lng = latLng.lng;
    latAccuracy = 180 * accuracy / 40075017;
    lngAccuracy = latAccuracy / Math.cos(L.LatLng.DEG_TO_RAD * lat);
    bounds = L.latLngBounds([lat - latAccuracy, lng - lngAccuracy], [lat + latAccuracy, lng + lngAccuracy]);
    return {
      accuracy: accuracy,
      latlng: L.latLng(lat, lng),
      bounds: bounds
    };
  };

}).call(this);

//# sourceMappingURL=routing.js.map
