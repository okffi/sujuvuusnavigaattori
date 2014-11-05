# 32 Reaaliaikainen vain katselu -nopeuskarttasivu Oulusta ja Helsingistä
# 31 Nopeustietoa sisältävän reitin katselu lähdettäessä
# 13 Oman toteutuneen reitin, navigaattoriehdotuksen ja suosituimman reitin vertailu kartalla
# 12 (user id jolla omat reitit ja nauhoitukset pääsee katsomaan palvelimelta)
# 11 Perillä katsellun reitin jakaminen
# 10 Reitin katselu perillä
#

{
    recorder_get_route_url
    recorder_get_fluency_url
} = citynavi.config

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

    console.log html

    @._div.innerHTML = html
                                    

geoJsonFeatureGroup = null

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
            # show start and finish address via okf.fi if avail otherwise fall back to otp
            name_from = get_good_name record.from.name.okf, record.from.name.otp, record.from.location.lat, record.from.location.lng
            name_to = get_good_name record.to.name.okf, record.to.name.otp, record.to.location.lat, record.to.location.lng
            li_content = "<li><a data-rel='close' href='#my-route?id=" + record.id + "'>" +
                "<h3>" + name_from + " &#8594; " +
                name_to + "</h3>" +
                "<p>" + moment(record.date).format("MMM D, YYYY ddd h:mm A") +
                "</p></a></li>"
            console.log li_content
            $list.append(li_content)
            # TODO show also length, duration, avg.speed, name given by user if any
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
        $.getJSON recorder_get_route_url, { id: id }, (data) =>
            if data?
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
                            "color": color
                        )
                    geoJsonFeatureGroup.addLayer(geoJsonLayer);

                geoJsonFeatureGroup.addTo(window.map_dbg)

            $('#my-route').bind 'pagebeforehide', (e, o) ->
                console.log "removing geoJsonLayers"
                if geoJsonFeatureGroup?
                    window.map_dbg.removeLayer geoJsonFeatureGroup
                    geoJsonFeatureGroup = null
                if window.speedLegend?
                    window.map_dbg.removeControl window.speedLegend
                    window.speedLegend = undefined

        if not window.speedLegend?
            info.addTo(window.map_dbg)
            window.speedLegend = info

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
        console.log "making fluency data request to " + recorder_get_fluency_url
        $.getJSON recorder_get_fluency_url, (data) =>
            console.log data
            if data?
                geoJsonFeatureGroup = L.featureGroup();
#                for i in [0..data.length-1] by 1
#                    for j in [i+1..data.length-1] by 1
#                        if data[i].geom.coordinates[0][0] is data[j].geom.coordinates[0][0] and
#                            data[i].geom.coordinates[0][1] is data[j].geom.coordinates[0][1] and
#                            data[i].geom.coordinates[1][0] is data[j].geom.coordinates[1][0] and
#                            data[i].geom.coordinates[1][1] is data[j].geom.coordinates[1][1]
#                                console.log "found duplicate route vector"

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
                    geoJsonFeatureGroup.addLayer(geoJsonLayer)
                geoJsonFeatureGroup.addTo(window.map_dbg)

$('#fluency-page').bind 'pageshow', (e, data) ->
    console.log "fluency-page pageshow"
    #window.map_dbg.setView(citynavi.config.center, citynavi.config.min_zoom)
    if not window.speedLegend?
        info.addTo(window.map_dbg)
        window.speedLegend = info

    location = citynavi.get_source_location_or_area_center()
    window.map_dbg.setView(location, 12)

$('#fluency-page').bind 'pagebeforehide', (e, o) ->
    console.log "removing geoJsonLayers"
    if geoJsonFeatureGroup?
        window.map_dbg.removeLayer geoJsonFeatureGroup
        geoJsonFeatureGroup = null

    if window.speedLegend?
        window.map_dbg.removeControl window.speedLegend
        window.speedLegend = undefined
