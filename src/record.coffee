{
    recorder_login_url
    recorder_post_route_url
    recorder_post_plan_url
    google_url
} = citynavi.config

# Determines how far a way the user's location can be from the navigation route to be used in fluency calculation
MAX_TRACK_ERROR_DIST = 20 # meters
MAX_LOCATION_ACCURACY_ERROR = 20
# If the user position cannot not be used for navigation route fluency calculation for a duration that is larger
# than the defined max time then don't calculate fluency for that time period 
MAX_TIME_BETWEEN_ROUTE_POINTS = 20  # seconds

NEAR_CROSSING_MAX_DIST = 10

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
window.routeVisualizationColors = routeVisualizationColors

document.addEventListener("deviceready", () -> 
        window.powerManagement = cordova.require('org.apache.cordova.plugin.power-management.PowerManagement')
    ,false)

stop_recording = ->
    if info?
        window.map_dbg.removeControl info
    window.speedLegend = undefined
    send_trace_seq_to_server()
    if not window.route_dbg?
        finish_trace_recording()
    delete_recording_id()
    reset_routing_data()
    delete_trace_seq()
    window.map_dbg.removeLayer(window.rawline)
    for routeline in window.routelines
        window.map_dbg.removeLayer(routeline)
    window.routelines = []
    window.powerManagement.releaseWakeLock () -> 
        wakelocked = false

start_recording = ->
    reset_routing_data()
    delete_trace_seq()
    store_recording_id(uniqueId(36))
    if window.route_dbg?
        info.addTo(window.map_dbg)
        window.speedLegend = info
        send_plan_to_server()
    window.rawline = new L.Polyline([], { color: 'black', opacity: 0.4 }).addTo(window.map_dbg)
    window.routelines = []

    window.powerManagement.acquireWakeLock () -> 
        wakelocked = true

finish_trace_recording = ->
    update_current_recording_endTime(get_timestamp())
    # store and geolocate end place now
    trace_seq = get_trace_seq()
    if trace_seq?
        trace = trace_seq[trace_seq.length - 1]
        if trace?
            update_current_recording_to_place(trace.location.latlng.lat, trace.location.latlng.lng)

        # store avg GPS speed for the recording
        speedSum = 0
        speedCount = 0
        for trace in trace_seq
            if trace?.speed?
                speedSum += trace.speed
                speedCount++
        if speedCount > 0
            avgGPSSpeed = speedSum / speedCount * 3.6
            update_current_recording_gps_speed(avgGPSSpeed)
            
    # TODO    
    # - show speed data as coloring for the raw trace
    # - test

send_trace_seq_to_server = ->
    payload =
        session_id: get_recording_id()
        trace_seq: get_trace_seq()

    jqxhr = $.ajax({
        url: recorder_post_trace_seq_url
        data: JSON.stringify(payload)
        contentType: 'application/json'
        type: 'POST'
    }).done((d) ->
        console.log('trace response:')
        console.log(d)
        resend_failed_data_if_any()
    ).fail((jqXHR, textStatus, errorThrown) ->
        console.log(jqXHR)
        console.log(textStatus)
        console.log(errorThrown)
        save_failed_send(recorder_post_trace_seq_url, payload)
    )
    

send_plan_to_server = ->
    from_latlng = window.route_dbg.requestParameters.fromPlace.split(',')
    to_latlng = window.route_dbg.requestParameters.toPlace.split(',')
    payload =
        session_id: get_recording_id()
        max_walk_distance: window.route_dbg.requestParameters.maxWalkDistance
        from_place:
            lat: parseFloat(from_latlng[0])
            lng: parseFloat(from_latlng[1])
        to_place:
            lat: parseFloat(to_latlng[0])
            lng: parseFloat(to_latlng[1])
        min_transfer_time: window.route_dbg.requestParameters.minTransferTime
        walk_speed: window.route_dbg.requestParameters.walkSpeed
        mode: window.route_dbg.requestParameters.mode
        timestamp: window.route_dbg.plan.date
    
    console.log('going to POST data to server')
    console.log(payload)
    jqxhr = $.ajax({
        url: recorder_post_plan_url
        data: JSON.stringify(payload)
        contentType: 'application/json'
        type: 'POST'
        }).done((d) ->
            console.log('plan response:')
            console.log(d)
            resend_failed_data_if_any()
        ).fail((jqXHR, textStatus, errorThrown) ->
            console.log(jqXHR)
            console.log(textStatus)
            console.log(errorThrown)
            save_failed_send(recorder_post_plan_url, payload)
         )
         
# If cannot send data to server, store it to later sending
save_failed_send = (url, payload) ->
    failed_send_data_string = localStorage['failed_send_data']

    failed_send_data = null
    if failed_send_data_string?
        failed_send_data = JSON.parse(failed_send_data_string)
    else
        failed_send_data = []
    failed_send =
        url: url
        payload: payload
    failed_send_data.push(failed_send)
    localStorage['failed_send_data'] = JSON.stringify(failed_send_data)

resend_failed_data_if_any = ->
    failed_send_data_string = localStorage['failed_send_data']

    if failed_send_data_string?
        failed_send_data = JSON.parse(failed_send_data_string)
        localStorage.removeItem('failed_send_data')
        for data in failed_send_data
            jqxhr = $.ajax({
                url: data.url
                data: JSON.stringify(data.payload)
                contentType: 'application/json'
                type: 'POST'
            }).done((d) ->
            ).fail((jqXHR, textStatus, errorThrown) ->
                console.log(jqXHR)
                console.log(textStatus)
                console.log(errorThrown)
                save_failed_send(data.url, data.payload)
            )                                       
        
    
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

# Front page switch
$('#flip-record3').on 'change', () ->
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
        if window.route_dbg?
            recordings.push({
                id: id
                type: "NAVI"
                date: get_timestamp()
                endTime: null
                avgSpeed: 0
                recordedRouteDistance: 0
                rawDistance: 0
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
            reverse_geocode(window.route_dbg.plan.from.lat, window.route_dbg.plan.from.lon, handle_geo_result, [id, 'from'])
            reverse_geocode(window.route_dbg.plan.to.lat, window.route_dbg.plan.to.lon, handle_geo_result, [id, 'to'])
        else
            location = citynavi.get_source_location()
            recordings.push({
                id: id
                type: "RAW"
                date: get_timestamp()
                endTime: null
                rawDistance: 0
                avgGPSSpeed: 0
                from:
                    name:
                        otp: null
                        okf: null
                    location:
                        lat: if location? then location[0] else null
                        lng: if location? then location[1] else null
                to:
                    name:
                        otp: null
                        okf: null
                    location:
                        lat: null
                        lng: null
                
            })
            if location?
                reverse_geocode(location[0], location[1], handle_geo_result, [id, 'from'])
        localStorage['recordings'] = JSON.stringify(recordings)

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
get_recording = (id) ->
    recordings_string = localStorage['recordings']
    if recordings_string?
        recordings = JSON.parse(recordings_string)
        for record in recordings
            if record.id is id
                return record
    return null

update_current_recording_endTime = (value) ->
    recordings_string = localStorage['recordings']
    if recordings_string?
        recordings = JSON.parse(recordings_string)
        for record in recordings
            if record.id is get_recording_id()                                
                record.endTime = value
                localStorage['recordings'] = JSON.stringify(recordings)
                break

update_current_recording_speed = (value) ->
    recordings_string = localStorage['recordings']
    if recordings_string?
        recordings = JSON.parse(recordings_string)
        for record in recordings
            if record.id is get_recording_id()                                
                record.avgSpeed = value
                localStorage['recordings'] = JSON.stringify(recordings)
                break

update_current_recording_route_dist = (value) ->
    recordings_string = localStorage['recordings']
    if recordings_string?
        recordings = JSON.parse(recordings_string)
        for record in recordings
            if record.id is get_recording_id()                                
                record.recordedRouteDistance = value
                localStorage['recordings'] = JSON.stringify(recordings)
                break

update_current_recording_raw_dist = (value) ->
    recordings_string = localStorage['recordings']
    if recordings_string?
        recordings = JSON.parse(recordings_string)
        for record in recordings
            if record.id is get_recording_id()                                
                record.rawDistance = value
                localStorage['recordings'] = JSON.stringify(recordings)
                break

update_current_recording_to_place = (lat, lng) ->
    recordings_string = localStorage['recordings']
    if recordings_string?
        recordings = JSON.parse(recordings_string)
        for record in recordings
            if record.id is get_recording_id()
                record.to.location.lat = lat
                record.to.location.lng = lng
                localStorage['recordings'] = JSON.stringify(recordings)
                reverse_geocode(lat, lng, handle_geo_result, [id, 'to'])
                break

update_current_recording_gps_speed = (value) ->
    recordings_string = localStorage['recordings']
    if recordings_string?
        recordings = JSON.parse(recordings_string)
        for record in recordings
            if record.id is get_recording_id()
                record.avgGPSSpeed = value
                localStorage['recordings'] = JSON.stringify(recordings)
                break
    

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

delete_trace_seq = -> window.localStorage.removeItem('trace_seq')

info = L.control()
info.onAdd = (map) ->
    @._div = L.DomUtil.create('div', 'info')
    @.update()
    @._div

info.update =  ->
    html = '<div>Avg. speed</div>'
    console.log "creating color divs"
    routeVisualizationColors = window.routeVisualizationColors
    console.log routeVisualizationColors
    for color in routeVisualizationColors.cycling
        console.log "creating div"
        html += '<div><span style="color:' + color.color + ';">&#9608; ' +
            color.lowerSpeedLimit + '-' + if color.higherSpeedLimit? then color.higherSpeedLimit else "" + '</span></div>'
    html += '<div><span style="color:' + '#000' + ';">&#9608; GPS'
    console.log html

    @._div.innerHTML = html
                                                                
#info.update = (props) ->
#    if props?
#        @._div.innerHTML = '<b>s: ' + props.speed + '</b><br />a: ' + props.accuracy

#info.addTo(window.map_dbg)

window.map_dbg.on 'locationfound', (e) ->
    #console.log('locationfound caught')
    #console.log(e)

    #props = {
    #    speed: -1
    #    accuracy: -1
    #}
    #props.speed = if e.speed? then e.speed else -1
    #props.accuracy = if e.accuracy? then e.accuracy else -1
    #info.update props 
    
    if is_recording()
        #if e.accuracy? and e.accuracy <=20 # TODO enable!
        update_raw_distance(e.latlng)
        trace = form_raw_trace(e)
        store_trace trace
        if window.route_dbg?
            form_route_trace(e)
        window.rawline.addLatLng([trace.location.latlng.lat, trace.location.latlng.lng])
        window.rawline.redraw()

update_raw_distance = (latlng) ->
    trace_seq = get_trace_seq()
    if trace_seq? and trace_seq.length > 0
        dist = get_distance(latlng.lat, latlng.lng,
            trace_seq[trace_seq.length - 1].location.latlng.lat, trace_seq[trace_seq.length - 1].location.latlng.lng)
        rawDistSum += dist
        update_current_recording_raw_dist(rawDistSum)
        
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


reset_routing_data = ->
    previous_crossing_latlng = null
    previous_good_location_timestamp = null
    timeSum = 0
    distSum = 0
    rawDistSum = 0
    was_on_route = true
    

form_route_trace = (e) ->
    # If current location past crossing then calculate avg. speed between that crossing and previous one and send to server
    # - Past crossing when distance has been small enough to that crossing and it is getting larger
    # If user location too far away from the legGeometry too long time then don't calculate speed for route between crossing A and B
    # If user location too far away from the legGeometry don't use the location for speed calculation

    crossing_latlng = find_nearest_route_crossing_point(e.latlng)
    route_latlng = find_nearest_route_point(e.latlng)

    if not previous_crossing_latlng?
        console.log "no previous crossing"
        previous_crossing_latlng = crossing_latlng

    if L.GeometryUtil.distance(window.map_dbg, e.latlng, route_latlng) > MAX_TRACK_ERROR_DIST
        console.log "too far to track"
        return

    if previous_good_location_timestamp?
        if moment(get_timestamp()).unix() - moment(previous_good_location_timestamp).unix() > MAX_TIME_BETWEEN_ROUTE_POINTS
            was_on_route = false
                
    previous_good_location_timestamp = get_timestamp()

    console.log "dist to prev crossing: " + L.GeometryUtil.distance(window.map_dbg, e.latlng, previous_crossing_latlng)
    console.log "dist to next crossing: " + L.GeometryUtil.distance(window.map_dbg, e.latlng, crossing_latlng)
    console.log "prev_crossing_latlng: ", previous_crossing_latlng.lat, previous_crossing_latlng.lng
    console.log "crossing_latlng: ", crossing_latlng.lat, crossing_latlng.lng
 
    if crossing_latlng.lat isnt previous_crossing_latlng.lat or crossing_latlng.lng isnt previous_crossing_latlng.lng
        if L.GeometryUtil.distance(window.map_dbg, e.latlng, crossing_latlng) < NEAR_CROSSING_MAX_DIST
            console.log "very near to crossing"
            create_fluency_data(previous_crossing_latlng, crossing_latlng, was_on_route)
            update_current_recording_endTime(get_timestamp())
            delete_trace_seq()
            trace = form_raw_trace(e)
            store_trace trace
            previous_crossing_latlng = crossing_latlng
            was_on_route = true

create_fluency_data = (previous_crossing_latlng, crossing_latlng, was_on_route) ->
    speedSum = 0
    speedCount = 0
    trace_seq = get_trace_seq()
    startTimeStamp = trace_seq[0].timestamp
    endTimeStamp = trace_seq[trace_seq.length - 1].timestamp
    timeDiff = moment(endTimeStamp).unix() - moment(startTimeStamp).unix()
    console.log timeDiff
    route_points = get_route_points(previous_crossing_latlng, crossing_latlng)
    console.log route_points
    dist = 0
    for i in [0...route_points.length - 1]
        dist += get_distance(route_points[i][0], route_points[i][1], route_points[i+1][0], route_points[i+1][1]) 
    avgSpeed = -1
    if timeDiff > 0
        avgSpeed = dist / timeDiff * 3.6 # kmh
    console.log avgSpeed
    if avgSpeed >= 0
        timeSum += timeDiff
        distSum += dist
        overallSpeed = distSum / timeSum * 3.6
        update_current_recording_speed(overallSpeed)
        update_current_recording_route_dist(distSum)
    
    #avgSpeed = Math.random() * 50
    color = 'black'
    for routeVisColor in routeVisualizationColors.cycling
        if avgSpeed >= routeVisColor.lowerSpeedLimit
            if !routeVisColor.higherSpeedLimit? or avgSpeed < routeVisColor.higherSpeedLimit
                color = routeVisColor.color
                break

    console.log color
    # Send to server if speed succesfully calculated
    if avgSpeed > 0
        send_data_to_server(avgSpeed, route_points, was_on_route)
    # Draw speed to user
    routeLine = new L.Polyline(route_points, { color: color, opacity: 0.8 })
    window.routelines.push(routeLine)
    routeLine.addTo(window.map_dbg)
    routeLine.redraw()

# Harvesine distance
get_distance = (lat1, lng1, lat2, lng2) ->
    R = 6371000
    dLat = deg2rad(lat2 - lat1)
    dLng = deg2rad(lng2 - lng1)
    sinDLat = Math.sin(dLat / 2)
    sinDLng = Math.sin(dLng / 2)
    a = sinDLat * sinDLat +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        sinDLng * sinDLng
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    d = R * c
        
deg2rad = (deg) ->
    deg * (Math.PI / 180)
                                                            
send_data_to_server = (speed, points, was_on_route) ->
    payload =
        session_id: get_recording_id()
        timestamp: get_timestamp()
        speed: speed
        mode: window.route_dbg.requestParameters.mode
        points: points
        was_on_route: was_on_route
    
    console.log('going to POST data to server')
    console.log(payload)
    jqxhr = $.ajax({
        url: recorder_post_route_url
        data: JSON.stringify(payload)
        contentType: 'application/json'
        type: 'POST'
        }).done((d) ->
            console.log('trace response:')
            console.log(d)
            resend_failed_data_if_any()
        ).fail((jqXHR, textStatus, errorThrown) ->
            console.log(jqXHR)
            console.log(textStatus)
            console.log(errorThrown)
            save_failed_send(recorder_post_route_url, payload)
        )
    send_trace_seq_to_server()
    
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
