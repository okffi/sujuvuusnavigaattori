(function() {
  var delete_recording_id, delete_trace_seq, form_trace, get_recording_id, get_timestamp, get_trace_seq, is_signed_in, polyline, recorder_login_url, recorder_trace_seq_url, start_recording, stop_recording, store_recording_id, store_trace, uniqueId, wakelocked, wrap_trace, _ref;

  _ref = citynavi.config, recorder_login_url = _ref.recorder_login_url, recorder_trace_seq_url = _ref.recorder_trace_seq_url;

  wakelocked = false;

  polyline = new L.Polyline([], {
    color: 'red'
  }).addTo(window.map_dbg);

  document.addEventListener("deviceready", function() {
    return window.powerManagement = cordova.require('org.apache.cordova.plugin.power-management.PowerManagement');
  }, false);

  stop_recording = function() {
    delete_recording_id();
    delete_trace_seq();
    window.powerManagement.releaseWakeLock(function() {
      return wakelocked = false;
    });
    return window.map_dbg.removeLayer(polyline);
  };

  start_recording = function() {
    store_recording_id(uniqueId(36));
    window.powerManagement.acquireWakeLock(function() {
      return wakelocked = true;
    });
    return polyline = new L.Polyline([], {
      color: 'red'
    }).addTo(window.map_dbg);
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

  $(document).on('pagecreate', '#map-page', function() {
    return $('#flip-record').on('slidecreate', function() {
      var current_value, flip_switch, is_in;
      flip_switch = $(this);
      is_in = is_signed_in();
      current_value = flip_switch.val();
      if (is_in && current_value === 'off') {
        return flip_switch.val('on').slider('refresh');
      } else if ((!is_in) && current_value === 'on') {
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

  form_trace = function(e) {
    var b, ll, ne, sw, trace;
    b = e.bounds;
    ne = b != null ? b._northEast : void 0;
    sw = b != null ? b._southWest : void 0;
    ll = e.latlng;
    return trace = {
      timestamp: get_timestamp(),
      location: {
        accuracy: e.accuracy,
        latlng: {
          lat: ll.lat,
          lng: ll.lng
        },
        bounds: {
          northEast: {
            lat: ne.lat,
            lng: ne.lng
          },
          southWest: {
            lat: sw.lat,
            lng: sw.lng
          }
        }
      },
      routes: {
        num: 0
      }
    };
  };

  store_recording_id = function(id) {
    return localStorage['recording_id'] = id;
  };

  get_recording_id = function() {
    return localStorage['recording_id'];
  };

  delete_recording_id = function() {
    return delete localStorage['recording_id'];
  };

  is_signed_in = function() {
    return get_recording_id() != null;
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
    if (trace_seq_str != null) {
      trace_seq = JSON.parse(trace_seq_str);
    }
    return trace_seq;
  };

  delete_trace_seq = function() {
    return delete localStorage['trace_seq'];
  };

  wrap_trace = function(trace) {
    var trace_seq, _ref1;
    trace_seq = (_ref1 = get_trace_seq()) != null ? _ref1 : [];
    trace_seq.push(trace);
    return {
      session_id: get_recording_id(),
      trace_seq: trace_seq
    };
  };

  window.map_dbg.on('locationfound', function(e) {
    var jqxhr, payload, trace;
    console.log('locationfound caught');
    console.log(e);
    if (is_signed_in()) {
      trace = form_trace(e);
      payload = wrap_trace(trace);
      console.log('going to POST trace next');
      console.log(payload);
      jqxhr = $.ajax({
        url: recorder_trace_seq_url,
        data: JSON.stringify(payload),
        contentType: 'application/json',
        type: 'POST'
      }).done(function(d) {
        console.log('trace response:');
        console.log(d);
        return delete_trace_seq();
      }).fail(function(jqXHR, textStatus, errorThrown) {
        console.log(jqXHR);
        console.log(textStatus);
        console.log(errorThrown);
        return store_trace(trace);
      });
      polyline.addLatLng(e.latlng);
      return polyline.redraw();
    }
  });

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

}).call(this);

//# sourceMappingURL=record.js.map
