{
    recorder_login_url
    recorder_trace_seq_url
} = citynavi.config

# Determines how far a way the user's location can be from the navigation route to be used in fluency calculation
MAX_TRACK_ERROR_DIST = 20 # meters
# If the user position cannot not be used for navigation route fluency calculation for a duration that is larger
# than the defined max time then don't calculate fluency for that time period 
MAX_TIME_BETWEEN_ROUTE_POINTS = 20  # seconds

wakelocked = false

routeVisualizationColors = {
    cycling: [{
        lowerSpeedLimit: 0,
        higherSpeedLimit: 10,
        color: '#f00' #red
        },{
        lowerSpeedLimit: 10,
        higherSpeedLimit: 12,
        color: '#ffa500' #orange
        },{
        lowerSpeedLimit: 12,
        higherSpeedLimit: 15,
        color: '#ffff00' #yellow
        },{
        lowerSpeedLimit: 15,
        higherSpeedLimit: 20,
        color: '#90ee90' #light green
        },{
        lowerSpeedLimit: 20,
        higherSpeedLimit: 25,
        color: '#0f0' #green
        },{
        lowerSpeedLimit: 25,
        higherSpeedLimit: 30,
        color: '#40e0d0' #turquoise
        },{
        lowerSpeedLimit: 30,
        higherSpeedLimit: 35,
        color: '#00f' #blue
        },{
        lowerSpeedLimit: 35,
        higherSpeedLimit: 45,
        color: '#ee82ee' #violet
        },{
        lowerSpeedLimit: 45,
        higherSpeedLimit: undefined,
        color: '#800080' #purple
        }],
    walking: []
}


document.addEventListener("deviceready", () -> 
        window.powerManagement = cordova.require('org.apache.cordova.plugin.power-management.PowerManagement')
    ,false)

stop_recording = ->
    send_data()
    delete_recording_id()
    delete_trace_seq()
    window.powerManagement.releaseWakeLock () -> 
        wakelocked = false
    window.map_dbg.removeLayer(window.rawline)
    window.map_dbg.removeLayer(window.routeline)

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
    delete_trace_seq()
    store_recording_id(uniqueId(36))
    window.rawline = new L.Polyline([], color: 'red').addTo(window.map_dbg)
    window.routelines = []
    window.routelines.push(new L.Polyline([], color: 'blue').addTo(window.map_dbg))

    window.powerManagement.acquireWakeLock () -> 
        wakelocked = true
    
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
        is_rec = is_recording()
        current_value = flip_switch.val()
        if is_rec and current_value == 'off'
            flip_switch.val('on').slider('refresh')
        else if (not is_rec) and current_value == 'on'
            flip_switch.val('off').slider('refresh')


$(document).on 'pagecreate', '#navigation-page', () ->
    $('#flip-record2').on 'slidecreate', () ->
        $('#flip-record2').val($('#flip-record').val()).slider('refresh')

get_timestamp = -> (new Date()).toISOString()

recording_id = null

store_recording_id = (id) ->
    recording_id = id
    
    recordings_string = localStorage['recordings']

    if recodings_string?
        recordings = JSON.parse(recordings_string)
    else
        recordings = []
        found = false
        for record in recordings
            if record.id is id
                found = true
                break

    if not found
        recordings.push({
            id: id
            date: get_timestamp()
        })
        localStorage['recordings'] = JSON.stringify(recordings)

# Avoid typos in the localStorage key with convenience functions.
get_recording_id = -> recording_id
delete_recording_id = -> recording_id = null
is_recording = -> get_recording_id()?

store_trace_pair = (trace_pair) ->
    if trace_pair?
        trace_seq = get_trace_seq()
        if trace_seq?
            trace_seq.push(trace_pair)
            localStorage['trace_seq'] = JSON.stringify(trace_seq)
        else
            localStorage['trace_seq'] = JSON.stringify([trace_pair])
get_trace_seq = ->
    trace_seq_str = localStorage['trace_seq']
    trace_seq = null
    if trace_seq_str?
        trace_seq = JSON.parse(trace_seq_str)

delete_trace_seq = -> delete localStorage['trace_seq']


window.map_dbg.on 'locationfound', (e) ->
    console.log('locationfound caught')
    console.log(e)
    if is_recording()
        trace_pair = form_trace_pair(e)
        store_trace_pair(trace_pair)
        console.log trace_pair.raw_trace
        window.rawline.addLatLng([trace_pair.raw_trace.location.latlng.lat, trace_pair.raw_trace.location.latlng.lng])
        window.rawline.redraw()
        
        if trace_pair.route_trace?
            for latlng in get_route_latlngs(trace_pair.route_trace)
                window.routelines[window.routelines.length - 1].addLatLng(latlng)
            window.routelines[window.routelines.length - 1].redraw()

get_route_latlngs = (route_trace) ->
    route_trace.points

form_trace_pair = (e) ->
    raw_trace = form_raw_trace(e)
    route_trace = form_route_trace(e, raw_trace)

    trace_pair =
        raw_trace: raw_trace
        route_trace: route_trace

form_raw_trace = (e) ->
    b = e.bounds
    ll = e.latlng
    console.log ll
    trace =
        timestamp: get_timestamp()
        speed: if e.speed? then e.speed else null
        location:
            altitude: if e.altitude? then e.altitude else null
            aaccuracy: if e.altitudeAccuracy? then e.altitudeAccuracy else null
            accuracy: if e.accuracy? then e.accuracy else null
            latlng:
                lat: ll.lat
                lng: ll.lng

form_route_trace = (e, raw_trace) ->
    route_latlng = find_nearest_route_point(e.latlng)
    trace_seq = get_trace_seq()
    route_trace = null
    if L.GeometryUtil.distance(window.map_dbg, e.latlng, route_latlng) < MAX_TRACK_ERROR_DIST
        if trace_seq?
            for trace_pair in trace_seq by -1
                if trace_pair.route_trace?
                    if moment(raw_trace.timestamp).unix() - moment(trace_pair.raw_trace.timestamp).unix() > MAX_TIME_BETWEEN_ROUTE_POINTS
                        break
                    
                    prevPoints = trace_pair.route_trace.points
                    route_trace = {
                        points: get_route_points(
                            prevPoints[prevPoints.length-1],
                            [route_latlng.lat, route_latlng.lng])} 
                    break
            if not route_trace? # either first route point to be tracked or due to MAX_TIME... start again
                window.routelines.push(new L.Polyline([], color: 'blue').addTo(window.map_dbg)) # TODO better solution for routelines drawing
                route_trace = { points: [[route_latlng.lat, route_latlng.lng]] }
        else # first route point to be tracked
            route_trace = { points: [[route_latlng.lat, route_latlng.lng]] }
    route_trace

get_route_points = (latlng_start, latlng_end) ->
    route_points = []
    points = (new L.LatLng(point[0]*1e-5, point[1]*1e-5) for point in citynavi.itinerary.legs[0].legGeometry.points)
    found_start = false
    found_end = false
    for point in points # find route_points, start_latlng can be before or after end_latlng in the points
        if found_start is true
            route_points.push([point.lat, point.lng])
            if (point.lat is latlng_end[0] and point.lng is latlng_end[1])
                break
        else if found_end is true
            route_points.push([point.lat, point.lng])
            if (point.lat is latlng_start[0] and point.lng is latlng_start[1])
                route_points.reverse()
                break
        else if (point.lat is latlng_start[0] and point.lng is latlng_start[1])
             found_start = true
             route_points.push([point.lat, point.lng])
             # latlng_start and latlng_end can be equal
             if (point.lat is latlng_end[0] and point.lng is latlng_end[1])
                break
        else if (point.lat is latlng_end[0] and point.lng is latlng_end[1])
             route_points.push([point.lat, point.lng])
             found_end = true
    route_points

send_data = ->
        ###
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
        ###

uniqueId = (length=8) ->
    id = ""
    id += Math.random().toString(36).substr(2) while id.length < length
    id.substr 0, length


find_nearest_route_point = (latlng) ->
    #console.log citynavi.itinerary.legs[0].legGeometry.points

    points = (new L.LatLng(point[0]*1e-5, point[1]*1e-5) for point in citynavi.itinerary.legs[0].legGeometry.points)

    ll = L.GeometryUtil.closest(window.map_dbg, points, latlng, true)

    #latlng

