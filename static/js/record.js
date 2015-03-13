(function() {
  var MAX_LOCATION_ACCURACY_ERROR, MAX_TIME_BETWEEN_ROUTE_POINTS, MAX_TRACK_ERROR_DIST, NEAR_CROSSING_MAX_DIST, create_fluency_data, deg2rad, delete_recording_id, delete_trace_seq, distSum, find_nearest_route_crossing_point, find_nearest_route_point, finish_trace_recording, form_raw_trace, form_route_trace, get_distance, get_recording, get_recording_id, get_route_points, get_timestamp, get_trace_seq, google_url, handle_geo_result, info, is_recording, previous_crossing_latlng, previous_good_location_timestamp, rawDistSum, recorder_login_url, recorder_post_plan_url, recorder_post_route_url, recorder_post_trace_seq_url, recording_id, ref, resend_failed_data_if_any, reset_routing_data, reverse_geocode, routeVisualizationColors, save_failed_send, send_data_to_server, send_plan_to_server, send_trace_seq_to_server, start_recording, stop_recording, store_recording_id, store_trace, timeSum, uniqueId, update_current_recording_endTime, update_current_recording_gps_speed, update_current_recording_raw_dist, update_current_recording_route_dist, update_current_recording_speed, update_current_recording_to_place, update_raw_distance, wakelocked, was_on_route;

  ref = citynavi.config, recorder_login_url = ref.recorder_login_url, recorder_post_route_url = ref.recorder_post_route_url, recorder_post_plan_url = ref.recorder_post_plan_url, recorder_post_trace_seq_url = ref.recorder_post_trace_seq_url, google_url = ref.google_url;

  MAX_TRACK_ERROR_DIST = 20;

  MAX_LOCATION_ACCURACY_ERROR = 20;

  MAX_TIME_BETWEEN_ROUTE_POINTS = 20;

  NEAR_CROSSING_MAX_DIST = 10;

  wakelocked = false;

  previous_crossing_latlng = null;

  previous_good_location_timestamp = null;

  timeSum = 0;

  distSum = 0;

  rawDistSum = 0;

  was_on_route = true;

  routeVisualizationColors = {
    cycling: [
      {
        lowerSpeedLimit: 0,
        higherSpeedLimit: 10,
        color: '#d53e4f'
      }, {
        lowerSpeedLimit: 10,
        higherSpeedLimit: 12,
        color: '#fdae61'
      }, {
        lowerSpeedLimit: 12,
        higherSpeedLimit: 15,
        color: '#fee08b'
      }, {
        lowerSpeedLimit: 15,
        higherSpeedLimit: 20,
        color: '#ffffbf'
      }, {
        lowerSpeedLimit: 20,
        higherSpeedLimit: 25,
        color: '#e6f598'
      }, {
        lowerSpeedLimit: 25,
        higherSpeedLimit: 30,
        color: '#abdda4'
      }, {
        lowerSpeedLimit: 30,
        higherSpeedLimit: 35,
        color: '#66c2a5'
      }, {
        lowerSpeedLimit: 35,
        higherSpeedLimit: 45,
        color: '#3288bd'
      }, {
        lowerSpeedLimit: 45,
        higherSpeedLimit: void 0,
        color: '#5e4fa2'
      }
    ],
    walking: []
  };

  window.routeVisualizationColors = routeVisualizationColors;

  document.addEventListener("deviceready", function() {
    return window.powerManagement = cordova.require('org.apache.cordova.plugin.power-management.PowerManagement');
  }, false);

  stop_recording = function() {
    var j, len, ref1, routeline;
    if (window.speedLegend != null) {
      window.map_dbg.removeControl(info);
    }
    window.speedLegend = void 0;
    send_trace_seq_to_server();
    if (window.route_dbg == null) {
      finish_trace_recording();
    }
    delete_recording_id();
    reset_routing_data();
    delete_trace_seq();
    window.map_dbg.removeLayer(window.rawline);
    ref1 = window.routelines;
    for (j = 0, len = ref1.length; j < len; j++) {
      routeline = ref1[j];
      window.map_dbg.removeLayer(routeline);
    }
    window.routelines = [];
    return window.powerManagement.releaseWakeLock(function() {
      return wakelocked = false;
    });
  };

  start_recording = function() {
    reset_routing_data();
    delete_trace_seq();
    store_recording_id(uniqueId(36));
    if (window.route_dbg != null) {
      info.addTo(window.map_dbg);
      window.speedLegend = info;
      send_plan_to_server();
    }
    window.rawline = new L.Polyline([], {
      color: 'black',
      opacity: 0.4
    }).addTo(window.map_dbg);
    window.routelines = [];
    return window.powerManagement.acquireWakeLock(function() {
      return wakelocked = true;
    });
  };

  finish_trace_recording = function() {
    var avgGPSSpeed, j, len, speedCount, speedSum, trace, trace_seq;
    update_current_recording_endTime(get_timestamp());
    trace_seq = get_trace_seq();
    if (trace_seq != null) {
      trace = trace_seq[trace_seq.length - 1];
      if (trace != null) {
        update_current_recording_to_place(trace.location.latlng.lat, trace.location.latlng.lng);
      }
      speedSum = 0;
      speedCount = 0;
      for (j = 0, len = trace_seq.length; j < len; j++) {
        trace = trace_seq[j];
        if ((trace != null ? trace.speed : void 0) != null) {
          speedSum += trace.speed;
          speedCount++;
        }
      }
      if (speedCount > 0) {
        avgGPSSpeed = speedSum / speedCount * 3.6;
        return update_current_recording_gps_speed(avgGPSSpeed);
      }
    }
  };

  send_trace_seq_to_server = function() {
    var jqxhr, payload;
    payload = {
      session_id: get_recording_id(),
      trace_seq: get_trace_seq()
    };
    return jqxhr = $.ajax({
      url: recorder_post_trace_seq_url,
      data: JSON.stringify(payload),
      contentType: 'application/json',
      type: 'POST'
    }).done(function(d) {
      console.log('trace response:');
      console.log(d);
      return resend_failed_data_if_any();
    }).fail(function(jqXHR, textStatus, errorThrown) {
      console.log(jqXHR);
      console.log(textStatus);
      console.log(errorThrown);
      return save_failed_send(recorder_post_trace_seq_url, payload);
    });
  };

  send_plan_to_server = function() {
    var from_latlng, jqxhr, payload, to_latlng;
    from_latlng = window.route_dbg.requestParameters.fromPlace.split(',');
    to_latlng = window.route_dbg.requestParameters.toPlace.split(',');
    payload = {
      session_id: get_recording_id(),
      max_walk_distance: window.route_dbg.requestParameters.maxWalkDistance,
      from_place: {
        lat: parseFloat(from_latlng[0]),
        lng: parseFloat(from_latlng[1])
      },
      to_place: {
        lat: parseFloat(to_latlng[0]),
        lng: parseFloat(to_latlng[1])
      },
      min_transfer_time: window.route_dbg.requestParameters.minTransferTime,
      walk_speed: window.route_dbg.requestParameters.walkSpeed,
      mode: window.route_dbg.requestParameters.mode,
      timestamp: window.route_dbg.plan.date
    };
    console.log('going to POST data to server');
    console.log(payload);
    return jqxhr = $.ajax({
      url: recorder_post_plan_url,
      data: JSON.stringify(payload),
      contentType: 'application/json',
      type: 'POST'
    }).done(function(d) {
      console.log('plan response:');
      console.log(d);
      return resend_failed_data_if_any();
    }).fail(function(jqXHR, textStatus, errorThrown) {
      console.log(jqXHR);
      console.log(textStatus);
      console.log(errorThrown);
      return save_failed_send(recorder_post_plan_url, payload);
    });
  };

  save_failed_send = function(url, payload) {
    var failed_send, failed_send_data, failed_send_data_string;
    failed_send_data_string = localStorage['failed_send_data'];
    failed_send_data = null;
    if (failed_send_data_string != null) {
      failed_send_data = JSON.parse(failed_send_data_string);
    } else {
      failed_send_data = [];
    }
    failed_send = {
      url: url,
      payload: payload
    };
    failed_send_data.push(failed_send);
    return localStorage['failed_send_data'] = JSON.stringify(failed_send_data);
  };

  resend_failed_data_if_any = function() {
    var data, failed_send_data, failed_send_data_string, j, jqxhr, len, results;
    failed_send_data_string = localStorage['failed_send_data'];
    if (failed_send_data_string != null) {
      failed_send_data = JSON.parse(failed_send_data_string);
      localStorage.removeItem('failed_send_data');
      results = [];
      for (j = 0, len = failed_send_data.length; j < len; j++) {
        data = failed_send_data[j];
        results.push(jqxhr = $.ajax({
          url: data.url,
          data: JSON.stringify(data.payload),
          contentType: 'application/json',
          type: 'POST'
        }).done(function(d) {}).fail(function(jqXHR, textStatus, errorThrown) {
          console.log(jqXHR);
          console.log(textStatus);
          console.log(errorThrown);
          return save_failed_send(data.url, data.payload);
        }));
      }
      return results;
    }
  };

  $('#flip-record').on('change', function() {
    var flip_switch, record_on;
    flip_switch = $(this);
    record_on = flip_switch.val() === 'on';
    if (typeof $('#flip-record2').slider() !== void 0) {
      $('#flip-record2').val(flip_switch.val()).slider('refresh');
    }
    if (record_on) {
      console.log('recording switched to on');
      return start_recording();
    } else {
      console.log('recording switched to off');
      return stop_recording();
    }
  });

  $('#flip-record2').on('change', function() {
    var flip_switch, record_on;
    flip_switch = $(this);
    record_on = flip_switch.val() === 'on';
    $('#flip-record').val(flip_switch.val()).slider('refresh');
    if (record_on) {
      console.log('recording switched to on');
      return start_recording();
    } else {
      console.log('recording switched to off');
      return stop_recording();
    }
  });

  $('#flip-record3').on('change', function() {
    var flip_switch, record_on;
    flip_switch = $(this);
    record_on = flip_switch.val() === 'on';
    $('#flip-record3').val(flip_switch.val()).slider('refresh');
    if (record_on) {
      console.log('recording switched to on');
      return start_recording();
    } else {
      console.log('recording switched to off');
      return stop_recording();
    }
  });

  $(document).on('pagecreate', '#map-page', function() {
    return $('#flip-record').on('slidecreate', function() {
      var current_value, flip_switch, is_rec;
      flip_switch = $(this);
      is_rec = is_recording();
      current_value = flip_switch.val();
      if (is_rec && current_value === 'off') {
        return flip_switch.val('on').slider('refresh');
      } else if ((!is_rec) && current_value === 'on') {
        return flip_switch.val('off').slider('refresh');
      }
    });
  });

  $(document).on('pagecreate', '#navigation-page', function() {
    return $('#flip-record2').on('slidecreate', function() {
      return $('#flip-record2').val($('#flip-record').val()).slider('refresh');
    });
  });

  get_timestamp = function() {
    return (new Date()).toISOString();
  };

  recording_id = null;

  store_recording_id = function(id) {
    var found, j, len, location, record, recordings, recordings_string;
    recording_id = id;
    recordings_string = localStorage['recordings'];
    if (recordings_string != null) {
      recordings = JSON.parse(recordings_string);
    } else {
      recordings = [];
      found = false;
      for (j = 0, len = recordings.length; j < len; j++) {
        record = recordings[j];
        if (record.id === id) {
          found = true;
          break;
        }
      }
    }
    if (!found) {
      if (window.route_dbg != null) {
        recordings.push({
          id: id,
          type: "NAVI",
          date: get_timestamp(),
          endTime: null,
          avgSpeed: 0,
          recordedRouteDistance: 0,
          rawDistance: 0,
          from: {
            name: {
              otp: window.route_dbg.plan.from.name,
              okf: null
            },
            location: {
              lat: window.route_dbg.plan.from.lat,
              lng: window.route_dbg.plan.from.lon
            }
          },
          to: {
            name: {
              otp: window.route_dbg.plan.to.name,
              okf: null
            },
            location: {
              lat: window.route_dbg.plan.to.lat,
              lng: window.route_dbg.plan.to.lon
            }
          },
          mode: window.route_dbg.requestParameters.mode
        });
        reverse_geocode(window.route_dbg.plan.from.lat, window.route_dbg.plan.from.lon, handle_geo_result, [id, 'from']);
        reverse_geocode(window.route_dbg.plan.to.lat, window.route_dbg.plan.to.lon, handle_geo_result, [id, 'to']);
      } else {
        location = citynavi.get_source_location();
        recordings.push({
          id: id,
          type: "RAW",
          date: get_timestamp(),
          endTime: null,
          avgSpeed: -1,
          avgGPSSpeed: 0,
          recordedRouteDistance: -1,
          rawDistance: 0,
          from: {
            name: {
              otp: void 0,
              okf: null
            },
            location: {
              lat: location != null ? location[0] : null,
              lng: location != null ? location[1] : null
            }
          },
          to: {
            name: {
              otp: void 0,
              okf: null
            },
            location: {
              lat: null,
              lng: null
            }
          }
        });
        if (location != null) {
          reverse_geocode(location[0], location[1], handle_geo_result, [id, 'from']);
        }
      }
      return localStorage['recordings'] = JSON.stringify(recordings);
    }
  };

  reverse_geocode = function(lat, lng, callback, callback_params) {
    return $.getJSON(google_url + "geocode.json", {
      lat: lat,
      lng: lng,
      language: "fin"
    }, (function(_this) {
      return function(data) {
        return callback(data, callback_params);
      };
    })(this));
  };

  handle_geo_result = function(result, params) {
    var address, j, record, recordings, recordings_string, ref1, results;
    address = result != null ? (ref1 = result.results) != null ? ref1[0].formatted_address : void 0 : void 0;
    if (address != null) {
      recordings_string = localStorage['recordings'];
      if (recordings_string != null) {
        recordings = JSON.parse(recordings_string);
        results = [];
        for (j = recordings.length - 1; j >= 0; j += -1) {
          record = recordings[j];
          if (record.id === params[0]) {
            if (params[1] === 'to') {
              record.to.name.okf = address;
            } else {
              record.from.name.okf = address;
            }
            localStorage['recordings'] = JSON.stringify(recordings);
            break;
          } else {
            results.push(void 0);
          }
        }
        return results;
      }
    }
  };

  get_recording_id = function() {
    return recording_id;
  };

  delete_recording_id = function() {
    return recording_id = null;
  };

  is_recording = function() {
    return get_recording_id() != null;
  };

  get_recording = function(id) {
    var j, len, record, recordings, recordings_string;
    recordings_string = localStorage['recordings'];
    if (recordings_string != null) {
      recordings = JSON.parse(recordings_string);
      for (j = 0, len = recordings.length; j < len; j++) {
        record = recordings[j];
        if (record.id === id) {
          return record;
        }
      }
    }
    return null;
  };

  update_current_recording_endTime = function(value) {
    var j, len, record, recordings, recordings_string, results;
    recordings_string = localStorage['recordings'];
    if (recordings_string != null) {
      recordings = JSON.parse(recordings_string);
      results = [];
      for (j = 0, len = recordings.length; j < len; j++) {
        record = recordings[j];
        if (record.id === get_recording_id()) {
          record.endTime = value;
          localStorage['recordings'] = JSON.stringify(recordings);
          break;
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  update_current_recording_speed = function(value) {
    var j, len, record, recordings, recordings_string, results;
    recordings_string = localStorage['recordings'];
    if (recordings_string != null) {
      recordings = JSON.parse(recordings_string);
      results = [];
      for (j = 0, len = recordings.length; j < len; j++) {
        record = recordings[j];
        if (record.id === get_recording_id()) {
          record.avgSpeed = value;
          localStorage['recordings'] = JSON.stringify(recordings);
          break;
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  update_current_recording_route_dist = function(value) {
    var j, len, record, recordings, recordings_string, results;
    recordings_string = localStorage['recordings'];
    if (recordings_string != null) {
      recordings = JSON.parse(recordings_string);
      results = [];
      for (j = 0, len = recordings.length; j < len; j++) {
        record = recordings[j];
        if (record.id === get_recording_id()) {
          record.recordedRouteDistance = value;
          localStorage['recordings'] = JSON.stringify(recordings);
          break;
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  update_current_recording_raw_dist = function(value) {
    var j, len, record, recordings, recordings_string, results;
    recordings_string = localStorage['recordings'];
    if (recordings_string != null) {
      recordings = JSON.parse(recordings_string);
      results = [];
      for (j = 0, len = recordings.length; j < len; j++) {
        record = recordings[j];
        if (record.id === get_recording_id()) {
          record.rawDistance = value;
          localStorage['recordings'] = JSON.stringify(recordings);
          break;
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  update_current_recording_to_place = function(lat, lng) {
    var j, len, record, recordings, recordings_string, results;
    recordings_string = localStorage['recordings'];
    if (recordings_string != null) {
      recordings = JSON.parse(recordings_string);
      results = [];
      for (j = 0, len = recordings.length; j < len; j++) {
        record = recordings[j];
        if (record.id === get_recording_id()) {
          record.to.location.lat = lat;
          record.to.location.lng = lng;
          localStorage['recordings'] = JSON.stringify(recordings);
          reverse_geocode(lat, lng, handle_geo_result, [record.id, 'to']);
          break;
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  update_current_recording_gps_speed = function(value) {
    var j, len, record, recordings, recordings_string, results;
    recordings_string = localStorage['recordings'];
    if (recordings_string != null) {
      recordings = JSON.parse(recordings_string);
      results = [];
      for (j = 0, len = recordings.length; j < len; j++) {
        record = recordings[j];
        if (record.id === get_recording_id()) {
          record.avgGPSSpeed = value;
          localStorage['recordings'] = JSON.stringify(recordings);
          break;
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  store_trace = function(trace) {
    var trace_seq;
    if (trace != null) {
      trace_seq = get_trace_seq();
      if (trace_seq != null) {
        trace_seq.push(trace);
        return localStorage['trace_seq'] = JSON.stringify(trace_seq);
      } else {
        return localStorage['trace_seq'] = JSON.stringify([trace]);
      }
    }
  };

  get_trace_seq = function() {
    var trace_seq, trace_seq_str;
    trace_seq_str = localStorage['trace_seq'];
    trace_seq = null;
    if (trace_seq_str != null) {
      return trace_seq = JSON.parse(trace_seq_str);
    }
  };

  delete_trace_seq = function() {
    return window.localStorage.removeItem('trace_seq');
  };

  info = L.control();

  info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
  };

  info.update = function() {
    var color, html, j, len, ref1;
    html = '<div>Avg. speed</div>';
    console.log("creating color divs");
    routeVisualizationColors = window.routeVisualizationColors;
    console.log(routeVisualizationColors);
    ref1 = routeVisualizationColors.cycling;
    for (j = 0, len = ref1.length; j < len; j++) {
      color = ref1[j];
      console.log("creating div");
      html += '<div><span style="color:' + color.color + ';">&#9608; ' + color.lowerSpeedLimit + '-' + (color.higherSpeedLimit != null ? color.higherSpeedLimit : "" + '</span></div>');
    }
    html += '<div><span style="color:' + '#000' + ';">&#9608; GPS';
    console.log(html);
    return this._div.innerHTML = html;
  };

  window.map_dbg.on('locationfound', function(e) {
    var trace;
    if (is_recording()) {
      update_raw_distance(e.latlng);
      trace = form_raw_trace(e);
      store_trace(trace);
      if (window.route_dbg != null) {
        form_route_trace(e);
      }
      window.rawline.addLatLng([trace.location.latlng.lat, trace.location.latlng.lng]);
      return window.rawline.redraw();
    }
  });

  update_raw_distance = function(latlng) {
    var dist, trace_seq;
    trace_seq = get_trace_seq();
    if ((trace_seq != null) && trace_seq.length > 0) {
      dist = get_distance(latlng.lat, latlng.lng, trace_seq[trace_seq.length - 1].location.latlng.lat, trace_seq[trace_seq.length - 1].location.latlng.lng);
      rawDistSum += dist;
      return update_current_recording_raw_dist(rawDistSum);
    }
  };

  form_raw_trace = function(e) {
    var b, ll, trace;
    b = e.bounds;
    ll = e.latlng;
    console.log(ll);
    return trace = {
      timestamp: get_timestamp(),
      speed: e.speed != null ? e.speed : null,
      location: {
        altitude: e.altitude != null ? e.altitude : null,
        aaccuracy: e.altitudeAccuracy != null ? e.altitudeAccuracy : null,
        accuracy: e.accuracy != null ? e.accuracy : null,
        heading: e.heading != null ? e.heading : null,
        latlng: {
          lat: ll.lat,
          lng: ll.lng
        }
      }
    };
  };

  reset_routing_data = function() {
    previous_crossing_latlng = null;
    previous_good_location_timestamp = null;
    timeSum = 0;
    distSum = 0;
    rawDistSum = 0;
    return was_on_route = true;
  };

  form_route_trace = function(e) {
    var crossing_latlng, route_latlng, trace;
    crossing_latlng = find_nearest_route_crossing_point(e.latlng);
    route_latlng = find_nearest_route_point(e.latlng);
    if (previous_crossing_latlng == null) {
      console.log("no previous crossing");
      previous_crossing_latlng = crossing_latlng;
    }
    if (L.GeometryUtil.distance(window.map_dbg, e.latlng, route_latlng) > MAX_TRACK_ERROR_DIST) {
      console.log("too far to track");
      return;
    }
    if (previous_good_location_timestamp != null) {
      if (moment(get_timestamp()).unix() - moment(previous_good_location_timestamp).unix() > MAX_TIME_BETWEEN_ROUTE_POINTS) {
        was_on_route = false;
      }
    }
    previous_good_location_timestamp = get_timestamp();
    console.log("dist to prev crossing: " + L.GeometryUtil.distance(window.map_dbg, e.latlng, previous_crossing_latlng));
    console.log("dist to next crossing: " + L.GeometryUtil.distance(window.map_dbg, e.latlng, crossing_latlng));
    console.log("prev_crossing_latlng: ", previous_crossing_latlng.lat, previous_crossing_latlng.lng);
    console.log("crossing_latlng: ", crossing_latlng.lat, crossing_latlng.lng);
    if (crossing_latlng.lat !== previous_crossing_latlng.lat || crossing_latlng.lng !== previous_crossing_latlng.lng) {
      if (L.GeometryUtil.distance(window.map_dbg, e.latlng, crossing_latlng) < NEAR_CROSSING_MAX_DIST) {
        console.log("very near to crossing");
        create_fluency_data(previous_crossing_latlng, crossing_latlng, was_on_route);
        update_current_recording_endTime(get_timestamp());
        delete_trace_seq();
        trace = form_raw_trace(e);
        store_trace(trace);
        previous_crossing_latlng = crossing_latlng;
        return was_on_route = true;
      }
    }
  };

  create_fluency_data = function(previous_crossing_latlng, crossing_latlng, was_on_route) {
    var avgSpeed, color, dist, endTimeStamp, i, j, k, len, overallSpeed, ref1, ref2, routeLine, routeVisColor, route_points, speedCount, speedSum, startTimeStamp, timeDiff, trace_seq;
    speedSum = 0;
    speedCount = 0;
    trace_seq = get_trace_seq();
    startTimeStamp = trace_seq[0].timestamp;
    endTimeStamp = trace_seq[trace_seq.length - 1].timestamp;
    timeDiff = moment(endTimeStamp).unix() - moment(startTimeStamp).unix();
    console.log(timeDiff);
    route_points = get_route_points(previous_crossing_latlng, crossing_latlng);
    console.log(route_points);
    dist = 0;
    for (i = j = 0, ref1 = route_points.length - 1; 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
      dist += get_distance(route_points[i][0], route_points[i][1], route_points[i + 1][0], route_points[i + 1][1]);
    }
    avgSpeed = -1;
    if (timeDiff > 0) {
      avgSpeed = dist / timeDiff * 3.6;
    }
    console.log(avgSpeed);
    if (avgSpeed >= 0) {
      timeSum += timeDiff;
      distSum += dist;
      overallSpeed = distSum / timeSum * 3.6;
      update_current_recording_speed(overallSpeed);
      update_current_recording_route_dist(distSum);
    }
    color = 'black';
    ref2 = routeVisualizationColors.cycling;
    for (k = 0, len = ref2.length; k < len; k++) {
      routeVisColor = ref2[k];
      if (avgSpeed >= routeVisColor.lowerSpeedLimit) {
        if ((routeVisColor.higherSpeedLimit == null) || avgSpeed < routeVisColor.higherSpeedLimit) {
          color = routeVisColor.color;
          break;
        }
      }
    }
    console.log(color);
    if (avgSpeed > 0) {
      send_data_to_server(avgSpeed, route_points, was_on_route);
    }
    routeLine = new L.Polyline(route_points, {
      color: color,
      opacity: 0.8
    });
    window.routelines.push(routeLine);
    routeLine.addTo(window.map_dbg);
    return routeLine.redraw();
  };

  get_distance = function(lat1, lng1, lat2, lng2) {
    var R, a, c, d, dLat, dLng, sinDLat, sinDLng;
    R = 6371000;
    dLat = deg2rad(lat2 - lat1);
    dLng = deg2rad(lng2 - lng1);
    sinDLat = Math.sin(dLat / 2);
    sinDLng = Math.sin(dLng / 2);
    a = sinDLat * sinDLat + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * sinDLng * sinDLng;
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d = R * c;
  };

  deg2rad = function(deg) {
    return deg * (Math.PI / 180);
  };

  send_data_to_server = function(speed, points, was_on_route) {
    var jqxhr, payload;
    payload = {
      session_id: get_recording_id(),
      timestamp: get_timestamp(),
      speed: speed,
      mode: window.route_dbg.requestParameters.mode,
      points: points,
      was_on_route: was_on_route
    };
    console.log('going to POST data to server');
    console.log(payload);
    jqxhr = $.ajax({
      url: recorder_post_route_url,
      data: JSON.stringify(payload),
      contentType: 'application/json',
      type: 'POST'
    }).done(function(d) {
      console.log('trace response:');
      console.log(d);
      return resend_failed_data_if_any();
    }).fail(function(jqXHR, textStatus, errorThrown) {
      console.log(jqXHR);
      console.log(textStatus);
      console.log(errorThrown);
      return save_failed_send(recorder_post_route_url, payload);
    });
    return send_trace_seq_to_server();
  };

  get_route_points = function(latlng_start, latlng_end) {
    var found_end, found_start, j, len, point, points, route_points;
    route_points = [];
    points = (function() {
      var j, len, ref1, results;
      ref1 = citynavi.itinerary.legs[0].legGeometry.points;
      results = [];
      for (j = 0, len = ref1.length; j < len; j++) {
        point = ref1[j];
        results.push(new L.LatLng(point[0] * 1e-5, point[1] * 1e-5));
      }
      return results;
    })();
    found_start = false;
    found_end = false;
    for (j = 0, len = points.length; j < len; j++) {
      point = points[j];
      if (found_start === true) {
        route_points.push([point.lat, point.lng]);
        if (point.lat === latlng_end.lat && point.lng === latlng_end.lng) {
          break;
        }
      } else if (found_end === true) {
        route_points.push([point.lat, point.lng]);
        if (point.lat === latlng_start.lat && point.lng === latlng_start.lng) {
          route_points.reverse();
          break;
        }
      } else if (point.lat === latlng_start.lat && point.lng === latlng_start.lng) {
        found_start = true;
        route_points.push([point.lat, point.lng]);
        if (point.lat === latlng_end.lat && point.lng === latlng_end.lng) {
          break;
        }
      } else if (point.lat === latlng_end.lat && point.lng === latlng_end.lng) {
        route_points.push([point.lat, point.lng]);
        found_end = true;
      }
    }
    return route_points;
  };

  uniqueId = function(length) {
    var id;
    if (length == null) {
      length = 8;
    }
    id = "";
    while (id.length < length) {
      id += Math.random().toString(36).substr(2);
    }
    return id.substr(0, length);
  };

  find_nearest_route_crossing_point = function(latlng) {
    var ll, point, points;
    points = (function() {
      var j, len, ref1, results;
      ref1 = citynavi.itinerary.legs[0].legGeometry.points;
      results = [];
      for (j = 0, len = ref1.length; j < len; j++) {
        point = ref1[j];
        results.push(new L.LatLng(point[0] * 1e-5, point[1] * 1e-5));
      }
      return results;
    })();
    return ll = L.GeometryUtil.closest(window.map_dbg, points, latlng, true);
  };

  find_nearest_route_point = function(latlng) {
    var ll, point, points;
    points = (function() {
      var j, len, ref1, results;
      ref1 = citynavi.itinerary.legs[0].legGeometry.points;
      results = [];
      for (j = 0, len = ref1.length; j < len; j++) {
        point = ref1[j];
        results.push(new L.LatLng(point[0] * 1e-5, point[1] * 1e-5));
      }
      return results;
    })();
    return ll = L.GeometryUtil.closest(window.map_dbg, points, latlng, false);
  };

}).call(this);

//# sourceMappingURL=record.js.map
