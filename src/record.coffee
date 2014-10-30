{
    recorder_login_url
    recorder_trace_seq_url
} = citynavi.config

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


polyline = new L.Polyline([], color: 'red').addTo(window.map_dbg)

document.addEventListener("deviceready", () -> 
        window.powerManagement = cordova.require('org.apache.cordova.plugin.power-management.PowerManagement')
    ,false)

stop_recording = ->
    delete_recording_id()
    delete_trace_seq()
    window.powerManagement.releaseWakeLock () -> 
        wakelocked = false
    window.map_dbg.removeLayer(polyline)

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
    polyline = new L.Polyline([], color: 'red').addTo(window.map_dbg)


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
        speed: if e.speed? then e.speed else null
        location:
            accuracy: e.accuracy
            latlng:
                lat: ll.lat
                lng: ll.lng
        # FIXME: read the routes from somewhere
        routes:
            num: 0

recording_id = null

# Avoid typos in the localStorage key with convenience functions.
store_recording_id = (id) ->
    recording_id = id
    recordings_string = localStorage['recordings']
    if recodings_string?
        recordings = JSON.parse(recordings_string)
    else
        recordings = []
    
    recordings.push({
        id: id
        date: get_timestamp()
    })
    localStorage['recordings'] = JSON.stringify(recordings)

get_recording_id = -> recording_id
delete_recording_id = -> recording_id = null
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

        
        ###
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
        polyline.addLatLng(e.latlng)
        polyline.redraw()
        ###

        visualize_fluency(e)

uniqueId = (length=8) ->
    id = ""
    id += Math.random().toString(36).substr(2) while id.length < length
    id.substr 0, length

visualize_fluency = (e) ->
    if citynavi.itinerary?
        # TODO location matching to itinerary if cycling itinerary
        # send to server after matching
        #
        # TODO also add a page that can show routes individually and all together
        # 
