{
    recorder_login_url
    recorder_trace_seq_url
    google_url
} = citynavi.config

# Determines how far a way the user's location can be from the navigation route to be used in fluency calculation
MAX_TRACK_ERROR_DIST = 20 # meters
MAX_LOCATION_ACCURACY_ERROR = 20
# If the user position cannot not be used for navigation route fluency calculation for a duration that is larger
# than the defined max time then don't calculate fluency for that time period 
MAX_TIME_BETWEEN_ROUTE_POINTS = 20  # seconds

NEAR_CROSSING_MAX_DIST = 5

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
    window.map_dbg.removeLayer(window.rawline)
    for routeline in window.routelines
        window.map_dbg.removeLayer(routeline)
    window.routelines = []
    window.powerManagement.releaseWakeLock () -> 
        wakelocked = false

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
    window.rawline = new L.Polyline([], { color: 'red', opacity: 0.2 }).addTo(window.map_dbg)
    window.routelines = []

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

    if recordings_string?
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
            from:
                name:
                    otp: window.route_dbg.plan.from.name
                    okf: null
                location:
                    lat: window.route_dbg.plan.from.lat
                    lng: window.route_dbg.plan.from.lon
            to:
                name:
                    otp: window.route_dbg.plan.to.name
                    okf: null
                location:
                    lat: window.route_dbg.plan.to.lat
                    lng: window.route_dbg.plan.to.lon
            mode: window.route_dbg.requestParameters.mode                
        })
        localStorage['recordings'] = JSON.stringify(recordings)

        reverse_geocode(window.route_dbg.plan.from.lat, window.route_dbg.plan.from.lon, handle_geo_result, [id, 'from'])
        reverse_geocode(window.route_dbg.plan.to.lat, window.route_dbg.plan.to.lon, handle_geo_result, [id, 'to'])

reverse_geocode = (lat, lng, callback, callback_params) ->
    $.getJSON google_url + "geocode.json", { lat: lat, lng: lng, language: "fin" }, (data) =>
        callback data, callback_params
        
handle_geo_result = (result, params) ->
    address = result?.results?[0].formatted_address
    if address?
        recordings_string = localStorage['recordings']
        if recordings_string?
            recordings = JSON.parse(recordings_string)
            for record in recordings by -1
                if record.id is params[0]
                    if params[1] is 'to'
                        record.to.name.okf = address
                    else
                        record.from.name.okf = address

                    localStorage['recordings'] = JSON.stringify(recordings)
                    break
                

# Avoid typos in the localStorage key with convenience functions.
get_recording_id = -> recording_id
delete_recording_id = -> recording_id = null
is_recording = -> get_recording_id()?

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
    trace_seq = null
    if trace_seq_str?
        trace_seq = JSON.parse(trace_seq_str)

delete_trace_seq = -> delete localStorage['trace_seq']

info = L.control()
info.onAdd = (map) ->
    @._div = L.DomUtil.create('div', 'info')
    @.update()
    @._div

info.update = (props) ->
    if props?
        @._div.innerHTML = '<b>s: ' + props.speed + '</b><br />a: ' + props.accuracy

info.addTo(window.map_dbg)


window.map_dbg.on 'locationfound', (e) ->
    #console.log('locationfound caught')
    #console.log(e)

    props = {
        speed: -1
        accuracy: -1
    }
    props.speed = if e.speed? then e.speed else -1
    props.accuracy = if e.accuracy? then e.accuracy else -1
    info.update props 
    
    if is_recording()
        trace = form_raw_trace(e)
        store_trace trace
        form_route_trace(e)
        window.rawline.addLatLng([trace.location.latlng.lat, trace.location.latlng.lng])
        window.rawline.redraw()
        
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
            heading: if e.heading? then e.heading else null
            latlng:
                lat: ll.lat
                lng: ll.lng

        
previous_crossing_latlng = null
previous_good_location_timestamp = null

form_route_trace = (e) ->
    # If current location past crossing then calculate avg. speed between that crossing and previous one and send to server
    # - Past crossing when distance has been small enough to that crossing and it is getting larger
    # If user location too far away from the legGeometry too long time then don't calculate speed for route between crossing A and B
    # If user location too far away from the legGeometry don't use the location for speed calculation

    crossing_latlng = find_nearest_route_crossing_point(e.latlng)
    route_latlng = find_nearest_route_point(e.latlng)

    if L.GeometryUtil.distance(window.map_dbg, e.latlng, route_latlng) > MAX_TRACK_ERROR_DIST
        console.log "too far to track"
        return

    if not previous_crossing_latlng?
        console.log "no previous crossing"
        previous_crossing_latlng = crossing_latlng

    if previous_good_location_timestamp?
        if L.GeometryUtil.distance(window.map_dbg, e.latlng, crossing_latlng) < NEAR_CROSSING_MAX_DIST
            if moment(get_timestamp()).unix() - moment(previous_good_location_timestamp).unix() > MAX_TIME_BETWEEN_ROUTE_POINTS
                console.log "was too far too long, resetting crossing"
                previous_good_location_timestamp = get_timestamp()
                previous_crossing_latlng = crossing_latlng
                delete_trace_seq()
                return
                
    previous_good_location_timestamp = get_timestamp()

    console.log "dist to prev crossing: " + L.GeometryUtil.distance(window.map_dbg, e.latlng, previous_crossing_latlng)
    console.log "dist to next crossing: " + L.GeometryUtil.distance(window.map_dbg, e.latlng, crossing_latlng)
    console.log "prev_crossing_latlng: ", previous_crossing_latlng.lat, previous_crossing_latlng.lng
    console.log "crossing_latlng: ", crossing_latlng.lat, crossing_latlng.lng
 
    if crossing_latlng.lat isnt previous_crossing_latlng.lat or crossing_latlng.lng isnt previous_crossing_latlng.lng
        dist = L.GeometryUtil.distance(window.map_dbg, e.latlng, crossing_latlng)
        console.log "nearing next crossing, dist: " + dist        
        if L.GeometryUtil.distance(window.map_dbg, e.latlng, crossing_latlng) < NEAR_CROSSING_MAX_DIST
            console.log "very near to crossing"
            create_fluency_data(previous_crossing_latlng, crossing_latlng)
            previous_crossing_latlng = crossing_latlng

create_fluency_data = (previous_crossing_latlng, crossing_latlng) ->
    speedSum = 0
    speedCount = 0
    trace_seq = get_trace_seq()
    for trace in trace_seq
        ll = find_nearest_route_point([trace.location.latlng.lat, trace.location.latlng.lng])
        dist = L.GeometryUtil.distance(window.map_dbg, ll, [trace.location.latlng.lat, trace.location.latlng.lng])
        console.log "ll, dist, trace.location.accuracy, trace.speed", ll, dist, trace.location.accuracy, trace.speed
        if dist <= MAX_TRACK_ERROR_DIST and trace.speed?
                speedSum += trace.speed
                speedCount++
                console.log "trace.speed, speedSum, speedCount", trace.speed, speedSum, speedCount
    avgSpeed = -1
    if speedSum > 0
        avgSpeed = speedSum / speedCount * 3.6
    console.log avgSpeed
    #avgSpeed = Math.random() * 50 # TODO Comment out or remove!
    color = 'black'
    for routeVisColor in routeVisualizationColors.cycling
        if avgSpeed >= routeVisColor.lowerSpeedLimit
            if !routeVisColor.higherSpeedLimit? or avgSpeed < routeVisColor.higherSpeedLimit
                color = routeVisColor.color
                break

    console.log color
    route_points = get_route_points(previous_crossing_latlng, crossing_latlng)
    console.log route_points
    # Send to server if speed succesfully calculated
    if avgSpeed > 0
        send_data_to_server(avgSpeed, route_points)
    # Draw speed to user
    routeLine = new L.Polyline(route_points, { color: color, opacity: 0.8 })
    window.routelines.push(routeLine)
    routeLine.addTo(window.map_dbg)
    routeLine.redraw()
    delete_trace_seq()

send_data_to_server = (speed, points) ->

    payload =
        session_id: get_recording_id()
        timestamp: get_timestamp()
        speed: speed
        points: points
    
    console.log('going to POST data to server')
    console.log(payload)
    jqxhr = $.ajax({
        url: recorder_trace_seq_url
        data: JSON.stringify(payload)
        contentType: 'application/json'
        type: 'POST'
        }).done((d) ->
            console.log('trace response:')
            console.log(d)
        ).fail((jqXHR, textStatus, errorThrown) ->
            console.log(jqXHR)
            console.log(textStatus)
            console.log(errorThrown)
            # TODO store
            # FIXME: Only save for sensible errors, like timeout.
            # store_trace(trace)
         )
 
    
get_route_points = (latlng_start, latlng_end) ->
    route_points = []
    points = (new L.LatLng(point[0]*1e-5, point[1]*1e-5) for point in citynavi.itinerary.legs[0].legGeometry.points)
    found_start = false
    found_end = false
    for point in points # find route_points, start_latlng can be before or after end_latlng in the points
        if found_start is true
            route_points.push([point.lat, point.lng])
            if (point.lat is latlng_end.lat and point.lng is latlng_end.lng)
                break
        else if found_end is true
            route_points.push([point.lat, point.lng])
            if (point.lat is latlng_start.lat and point.lng is latlng_start.lng)
                route_points.reverse()
                break
        else if (point.lat is latlng_start.lat and point.lng is latlng_start.lng)
             found_start = true
             route_points.push([point.lat, point.lng])
             # latlng_start and latlng_end can be equal
             if (point.lat is latlng_end.lat and point.lng is latlng_end.lng)
                break
        else if (point.lat is latlng_end.lat and point.lng is latlng_end.lng)
             route_points.push([point.lat, point.lng])
             found_end = true
    route_points

uniqueId = (length=8) ->
    id = ""
    id += Math.random().toString(36).substr(2) while id.length < length
    id.substr 0, length


find_nearest_route_crossing_point = (latlng) ->
    #TODO user Overpass API to make sure that the point is for crossing
    points = (new L.LatLng(point[0]*1e-5, point[1]*1e-5) for point in citynavi.itinerary.legs[0].legGeometry.points)
    ll = L.GeometryUtil.closest(window.map_dbg, points, latlng, true)

find_nearest_route_point = (latlng) ->
    points = (new L.LatLng(point[0]*1e-5, point[1]*1e-5) for point in citynavi.itinerary.legs[0].legGeometry.points)
    ll = L.GeometryUtil.closest(window.map_dbg, points, latlng, false)
