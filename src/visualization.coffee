# 32 Reaaliaikainen vain katselu -nopeuskarttasivu Oulusta ja Helsingistä
# 31 Nopeustietoa sisältävän reitin katselu lähdettäessä
# 13 Oman toteutuneen reitin, navigaattoriehdotuksen ja suosituimman reitin vertailu kartalla
# 12 (user id jolla omat reitit ja nauhoitukset pääsee katsomaan palvelimelta)
# 11 Perillä katsellun reitin jakaminen
# 10 Reitin katselu perillä
#

{
    recorder_get_trace_url
    recorder_get_route_url
    recorder_get_fluency_url
    recorder_get_traces_url
} = citynavi.config

info = L.control()
info.onAdd = (map) ->
    @._div = L.DomUtil.create('div', 'info')
    @.update()
    @._div
    
info.update =  ->
    html = '<div style="padding: 3px 0">Speed</div>'
    console.log "creating color divs"
    routeVisualizationColors = window.routeVisualizationColors
    console.log routeVisualizationColors
    for color in routeVisualizationColors.cycling
        console.log "creating div"
        html += '<div><span style="color:' + color.color + ';">&#9608;</span><span> ' +
            color.lowerSpeedLimit + if color.higherSpeedLimit? then '-'+color.higherSpeedLimit else "+" + '</span></div>'

    console.log html

    @._div.innerHTML = html
                                    

geoJsonFeatureGroup = null
tracesJsonFeatureGroup = null
traceLine = null

BAD_NAMES = [ "", " " ]

get_good_name = (okf_name, otp_name, lat, lng) ->
    name = if okf_name? then okf_name.split(',')[0] else ""
    if name in BAD_NAMES
        if otp_name?
            name = otp_name.charAt(0).toUpperCase() + otp_name.slice(1) + " "
        name += "(" + lat.toFixed(4) + ", " + lng.toFixed(4) + ")"
    name

$('#my-routes').bind 'pageinit', (e, data) ->
    $list = $('#my-routes ul')
    $list.empty()
    $list.listview()

$('#my-routes').bind 'pageshow', (e, data) ->
    $list = $('#my-routes ul')
    $list.empty()

    recordings_string = localStorage['recordings']
    if recordings_string?
        recordings = JSON.parse(recordings_string)
        
        for record in recordings by -1 # list the latest recording first
            # show start and finish address via okf.fi if avail otherwise fall back to otp if avail            
            name_from = get_good_name record.from.name.okf, record.from.name.otp, record.from.location.lat, record.from.location.lng
            name_to = get_good_name record.to.name.okf, record.to.name.otp, record.to.location.lat, record.to.location.lng
            durationText = ""
            if record.endTime?
                diff = moment(record.endTime).unix() - moment(record.date).unix()
                duration = moment().startOf('day').add('s', diff)
                format = ""
                if duration.hour() > 0
                    format += "H [hours] "
                if duration.minute() > 0
                    format += "m [min] "
                durationText = duration.format(format)
            li_content = null
            if record.type? and record.type is "RAW" # recording without navigation route
                #console.log record
                li_content = "<li><a data-rel='close' href='#my-route?id=" + record.id + "'>" +
                    "<p><b>" + name_from + " &#8594; " + name_to +
                    ", Duration: " + durationText +
                    "</b></p>" +
                    "<p>" + moment(record.date).format("MMM D, YYYY ddd h:mm A") + "</p>" +
                    "<p>" + 
                    "Avg. speed: " + record.avgGPSSpeed.toFixed(1) + "km/h" +
                    ", GPS distance: " +
                    (record.rawDistance / 1000).toFixed(1) +
                    " km" +
                    "</p></a></li>"                    
            else            
                li_content = "<li><a data-rel='close' href='#my-route?id=" + record.id + "'>" +
                    "<p><b>" + name_from + " &#8594; " + name_to +
                    ", Duration: " + durationText +
                    "</b></p>" +
                    "<p>" + moment(record.date).format("MMM D, YYYY ddd h:mm A") + "</p>" +
                    "<p>" + 
                    "Avg. speed: " + record.avgSpeed.toFixed(1) + "km/h" +
                    ", on route / GPS distance: " +
                    (record.recordedRouteDistance / 1000).toFixed(1) +
                    " / " + (record.rawDistance / 1000).toFixed(1) +
                    " km" +
                    "</p></a></li>"
            console.log li_content
            $list.append(li_content)
            # TODO show also name given by user if any
    else
        $list.append("<li>No recorded routes yet</li>")

    $list.listview("refresh")


$(document).bind 'pagebeforechange', (e, data) ->
    # load data via ajax and draw to map
    if typeof data.toPage != "string"
        return
    console.log data
    u = $.mobile.path.parseUrl(data.toPage)
    console.log "url ", u
    if u.hash.indexOf("my-route?id=") != -1
        id = u.hash.split('?')[1].split('=')[1]
        console.log id

        recordings_string = localStorage['recordings']
        if recordings_string?
            recordings = JSON.parse(recordings_string)
            for record in recordings
                if record.id is id
                    if recording?.type is "RAW"
                        get_trace_data(id)
                    else            
                        get_route_data(id)
                        get_trace_data(id)
                    break

        if not window.speedLegend?
            info.addTo(window.map_dbg)
            window.speedLegend = info

        $('#my-route').bind 'pagebeforehide', (e, o) ->
            console.log "removing geoJsonLayers"
            if geoJsonFeatureGroup?
                window.map_dbg.removeLayer geoJsonFeatureGroup
                geoJsonFeatureGroup = null
            if traceLine?
                window.map_dbg.removeLayer traceLine
                traceLine = null
            if window.speedLegend?
                window.map_dbg.removeControl window.speedLegend
                window.speedLegend = undefined


get_trace_data = (id) ->
    $.getJSON recorder_get_trace_url, { id: id }, (data) ->
        if data?
            console.log data
            #TODO draw trace
            traceLine = L.polyline([], { color: 'black', transparency: 0.5 })
            for trace in data
                traceLine.addLatLng([trace.geom.coordinates[1], trace.geom.coordinates[0]])
            traceLine.addTo(window.map_dbg).bringToBack()

            $('#my-route').bind 'pagebeforehide', (e, o) ->
        else console.log "no trace data"
        
get_route_data = (id) ->
    $.getJSON recorder_get_route_url, { id: id }, (data) ->
        if data?
            console.log data
            geoJsonFeatureGroup = L.featureGroup();
                
            for route_vector in data
                color = 'black'
                routeVisualizationColors = window.routeVisualizationColors
                for routeVisColor in routeVisualizationColors.cycling
                    if route_vector.speed >= routeVisColor.lowerSpeedLimit
                        if !routeVisColor.higherSpeedLimit? or route_vector.speed < routeVisColor.higherSpeedLimit
                            color = routeVisColor.color
                            break
                    
                geoJsonLayer = L.geoJson(route_vector.geom,
                    style:
                        "color": color,
                        "opacity": 0.8
                )
                geoJsonFeatureGroup.addLayer(geoJsonLayer);

            geoJsonFeatureGroup.addTo(window.map_dbg)

$('#my-route').bind 'pageshow', (e, data) ->
    console.log "my-route pageshow"

    if geoJsonFeatureGroup?
        window.map_dbg.fitBounds(geoJsonFeatureGroup.getBounds())
    #window.map_dbg.setView(citynavi.config.center, citynavi.config.min_zoom)

$(document).bind 'pagebeforechange', (e, data) ->
    if typeof data.toPage != "string"
        return
    console.log data
    u = $.mobile.path.parseUrl(data.toPage)
    console.log "url ", u
    if u.hash.indexOf("fluency-page") != -1
        $.getJSON recorder_get_traces_url, (data) =>
            console.log "traces", data
            if data?
                # data = cleanUpTraces(data)
                tracesJsonFeatureGroup = L.featureGroup();
                for trace_vector in data
                    routeVisualizationColors = window.routeVisualizationColors
                    if trace_vector.speed == 0
                        color='#777'
                    else
                        for routeVisColor in routeVisualizationColors.cycling
                            if trace_vector.speed >= routeVisColor.lowerSpeedLimit
                                if !routeVisColor.higherSpeedLimit? or trace_vector.speed < routeVisColor.higherSpeedLimit
                                    color = routeVisColor.color
                                    break
    
                    geoJsonLayer = L.geoJson(trace_vector.geom,
                        style:
                            "color": color,
                            "dasharray": "8.16",
                            "opacity": 0.5
                    )
                    tracesJsonFeatureGroup.addLayer(geoJsonLayer)
                tracesJsonFeatureGroup.addTo(window.map_dbg).bringToBack()
                                                                                                
        console.log "making fluency data request to " + recorder_get_fluency_url
        $.getJSON recorder_get_fluency_url, (data) =>
            console.log data
            if data?
                geoJsonFeatureGroup = L.featureGroup();

                for route_vector in data
                    color = 'gray'
                    routeVisualizationColors = window.routeVisualizationColors
                    if route_vector.speed == 0
                        color='#777'
                    else
                        for routeVisColor in routeVisualizationColors.cycling
                            if route_vector.speed >= routeVisColor.lowerSpeedLimit
                                if !routeVisColor.higherSpeedLimit? or route_vector.speed < routeVisColor.higherSpeedLimit
                                    color = routeVisColor.color
                                    break
    
                    geoJsonLayer = L.geoJson(route_vector.geom,
                        style:
                            "color": color,
                            "opacity": 0.9
                    )
                    geoJsonFeatureGroup.addLayer(geoJsonLayer)
                geoJsonFeatureGroup.addTo(window.map_dbg).bringToFront()

$('#fluency-page').bind 'pageshow', (e, data) ->
    console.log "fluency-page pageshow"
    #window.map_dbg.setView(citynavi.config.center, citynavi.config.min_zoom)
    if not window.speedLegend?
        info.addTo(window.map_dbg)
        window.speedLegend = info

    location = citynavi.get_source_location()
    if location?
        window.map_dbg.setView(location, 12)
    else
        window.map_dbg.setView([62.32, 24.75], 6)

$('#fluency-page').bind 'pagebeforehide', (e, o) ->
    console.log "removing geoJsonLayers"
    if tracesJsonFeatureGroup?
        window.map_dbg.removeLayer tracesJsonFeatureGroup
        tracesJsonFeatureGroup = null
    if geoJsonFeatureGroup?
        window.map_dbg.removeLayer geoJsonFeatureGroup
        geoJsonFeatureGroup = null

    if window.speedLegend?
        window.map_dbg.removeControl window.speedLegend
        window.speedLegend = undefined

cleanUpCoords = (coords) ->
    
    if coords[0] > coords[1]
        coords = [coords[0], coords[1]]
    else
        coords = [coords[1], coords[0]]

    coords

cleanUpTraces = (data) ->
    newData = []
    for trace in data
        newTrace =
            type: "LineString"
            coordinates: []
        prevCoordinate = trace.coordinates[0]
        if prevCoordinate[0] < prevCoordinate[1]
            prevCoordinate = [prevCoordinate[1], prevCoordinate[0]]
        for i in [1...trace.coordinates.length - 1]
            coordinate = trace.coordinates[i]
            if coordinate[0] < coordinate[1]
                coordinate = [coordinate[1], coordinate[0]]
            nextCoordinate = trace.coordinates[i + 1]
            if nextCoordinate[0] < nextCoordinate[1]
                nextCoordinate = [nextCoordinate[1], nextCoordinate[0]]
            if L.GeometryUtil.distance(window.map_dbg, L.latLng(coordinate), L.latLng(prevCoordinate)) < 20 and
                L.GeometryUtil.distance(window.map_dbg, L.latLng(coordinate), L.latLng(nextCoordinate)) < 20
                    newTrace.coordinates.push(swapCoordinate(coordinate))
            prevCoordinate = coordinate

        if newTrace.coordinates.length >= 2
            newData.push(newTrace)

    newData

swapCoordinate = (coordinate) ->
    [coordinate[1], coordinate[0]]
