{
    recorder_login_url
    recorder_trace_seq_url
} = citynavi.config

wakelocked = false

# These are for determining route visualization colors
speedBarrier1 = 0
speedBarrier2 = 15
speedBarrier3 = 30
speedBarrier4 = 45

lines = []

#polyline = new L.Polyline([], color: 'red').addTo(window.map_dbg)

document.addEventListener("deviceready", () -> 
        window.powerManagement = cordova.require('org.apache.cordova.plugin.power-management.PowerManagement')
    ,false)

stop_recording = ->
    delete_recording_id()
    delete_trace_seq()
    window.powerManagement.releaseWakeLock () -> 
        wakelocked = false
    #window.map_dbg.removeLayer(polyline)
    for line in lines
        window.map_dbg.removeLayer(line)
    lines = []

start_recording = ->
    #$.getJSON(recorder_login_url
    #).done((data) ->
    #    console.log('sign in success')
    #    console.log(data)
    #    if data?.sessionId?
    #        console.log('sessionID found in data from server')
    #        store_recording_id(data.sessionId)
    #).fail((e, x, y) ->
    #    console.log("sign-in error")
    #    console.log(e)
    #    console.log(x)
    #    console.log(y)
    #)
    store_recording_id(uniqueId(36))
    window.powerManagement.acquireWakeLock () -> 
        wakelocked = true
    #polyline = new L.Polyline([], color: 'red').addTo(window.map_dbg)


# React to user input.
$('#flip-record').on 'change', () ->
    flip_switch = $(@)
    record_on = flip_switch.val() == 'on'
    if typeof $('#flip-record2').slider() != undefined
        $('#flip-record2').val(flip_switch.val()).slider('refresh')
    if record_on
        console.log('recording switched to on')
        start_recording()
    else
        console.log('recording switched to off')
        stop_recording()

$('#flip-record2').on 'change', () ->
    flip_switch = $(@)
    record_on = flip_switch.val() == 'on'
    $('#flip-record').val(flip_switch.val()).slider('refresh')
    if record_on
        console.log('recording switched to on')
        start_recording()
    else
        console.log('recording switched to off')
        stop_recording()

# Update UI to match the state of localStorage.
$(document).on 'pagecreate', '#map-page', () ->
    $('#flip-record').on 'slidecreate', () ->
        flip_switch = $(@)
        is_in = is_signed_in()
        current_value = flip_switch.val()
        if is_in and current_value == 'off'
            flip_switch.val('on').slider('refresh')
        else if (not is_in) and current_value == 'on'
            flip_switch.val('off').slider('refresh')


$(document).on 'pagecreate', '#navigation-page', () ->
    $('#flip-record2').on 'slidecreate', () ->
        $('#flip-record2').val($('#flip-record').val()).slider('refresh')

get_timestamp = -> (new Date()).toISOString()

form_trace = (e) ->
    b = e.bounds
    ne = b?._northEast
    sw = b?._southWest
    ll = e.latlng
    trace =
        timestamp: get_timestamp()
        location:
            accuracy: e.accuracy
            latlng:
                lat: ll.lat
                lng: ll.lng
            bounds:
                northEast:
                    lat: ne.lat
                    lng: ne.lng
                southWest:
                    lat: sw.lat
                    lng: sw.lng
        # FIXME: read the routes from somewhere
        routes:
            num: 0

# Avoid typos in the localStorage key with convenience functions.
store_recording_id = (id) -> localStorage['recording_id'] = id
get_recording_id = -> localStorage['recording_id']
delete_recording_id = -> delete localStorage['recording_id']
is_signed_in = -> get_recording_id()?

# Avoid typos in the localStorage key with convenience functions.
store_trace = (trace) ->
    if trace?
        trace_seq = get_trace_seq()
        if trace_seq?
            trace_seq.push(trace)
            localStorage['trace_seq'] = JSON.stringify(trace_seq)
        else
            localStorage['trace_seq'] = JSON.stringify([trace])
get_trace_seq = ->
    trace_seq_str = localStorage['trace_seq']
    if trace_seq_str?
        trace_seq = JSON.parse(trace_seq_str)
    trace_seq
delete_trace_seq = -> delete localStorage['trace_seq']

wrap_trace = (trace) ->
    trace_seq = get_trace_seq() ? []
    trace_seq.push(trace)
    {
        session_id: get_recording_id()
        trace_seq: trace_seq
    }


window.map_dbg.on 'locationfound', (e) ->
    console.log('locationfound caught')
    console.log(e)
    if is_signed_in()
        trace = form_trace(e)
        payload = wrap_trace(trace)
        console.log('going to POST trace next')
        console.log(payload)
        jqxhr = $.ajax({
            url: recorder_trace_seq_url
            data: JSON.stringify(payload)
            # FIXME: To avoid the preflight request, use text/plain instead.
            contentType: 'application/json'
            type: 'POST'
        }).done((d) ->
            console.log('trace response:')
            console.log(d)
            delete_trace_seq()
        ).fail((jqXHR, textStatus, errorThrown) ->
            console.log(jqXHR)
            console.log(textStatus)
            console.log(errorThrown)
            # FIXME: Only save for sensible errors, like timeout.
            store_trace(trace)
        )

        visualize_route()
        
        #polyline.addLatLng(e.latlng)
        #polyline.redraw()

viusalize_route = ->
    trace_seq = get_trace_seq
    if trace_seq? and trace_seq.length >= 2
        trace1 = trace_seq[trace_seq.length - 2]
        trace2 = trace_seq[trace_seq.length - 1]
        lat1 = trace1.location.latlng.lat
        lng1 = trace1.location.latlng.lng
        lat2 = trace2.location.latlng.lat
        lng2 = trace2.location.latlng.lng
        distance = get_distance(lat1, lng1, lat2, lng2)
        console.log distance
        timeDiff = trace2.timestamp - trace1.timestamp
        speed = distance / timeDiff * 3.6 # kmh

        color = switch
            when speed <= speedBarrier1 then '#f00'
            when speed > speedBarrier1 and speed <= speedBarrier2
                ratio = 1 - (speedBarrier2 - speed) / (speedBarrier2 - speedBarrier1)
                greenAmount = Math.round(ratio * 255).toString(16)
                greenAmount = greenAmount.length == 1 ? '0' + greenAmount : greenAmount
                color = '#ff' + greenAmount + '00'
            when speed > speedBarrier2 and speed <= speedBarrier3
                ratio = (speedBarrier3 - speed) / (speedBarrier3 - speedBarrier2)
                redAmount = Math.round(ratio * 255).toString(16)
                redAmount = redAmount.length == 1 ? '0' + redAmount : redAmount
                color = '#' + redAmount + 'ff00'                                                
            when speed > speedBarrier3 and speed <= speedBarrier4
                ratio = (speedBarrier2 - speed) / (speedBarrier2 - speedBarrier1)
                greenAmount = Math.round(ratio * 255).toString(16)
                greenAmount = greenAmount.length == 1 ? '0' + greenAmount : greenAmount
                blueAmount = Math.round((1 - ratio) * 255).toString(16)
                blueAmount = blueAmount.length == 1 ? '0' + blueAmount : blueAmount
                color = '#00' + greenAmount + blueAmount
            else '#00f'
            
        line = new L.PolyLine([[lat1, lng1], [lat2, lng2]], { color: color }).addTo(window.map_dbg)
        lines.push(line)

# Harvesine distance
get_distance = (lat1, lng1, lat2, lng2) ->
    R = 6371000
    dLat = deg2rad(lat2 - lat1)
    dLng = deg2rad(lng2 - lng1)
    sinDLat = Math.sin(dLat / 2)
    sinDlng = Math.sin(dLng / 2)
    a = sinDLat * sinDLat +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        sinDLng * sinDLng
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    d = R * c

deg2rad = (deg) ->
    deg * (Math.PI / 180)

uniqueId = (length=8) ->
  id = ""
  id += Math.random().toString(36).substr(2) while id.length < length
  id.substr 0, length
