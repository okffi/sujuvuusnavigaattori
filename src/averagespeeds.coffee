# Imports
map = window.map_dbg

add_speeds_to_itinerary = window.citynavi.add_speeds_to_itinerary



route_layer = null

background_geojson = null
background_featuregroup = null

selected_linestring = null
selected_featurecollection = null
selected_featuregroup = null

outline_color = '#000000'
selected_gloss_color = '#ffffff'
selected_unknown_color = '#8e8e8e'

default_opacity = 1.0
gloss1_opacity = 0.3
gloss2_opacity = 0.6
outline_width_addition = 0.8
selected_width_multiplier = 1.7
gloss1_width_multiplier = 0.5
gloss2_width_multiplier = 0.25
selected_outline_width_addition = 3.0

get_speed_color = (speed_in_ms) ->
    if speed_in_ms?
        speed_in_kmh = speed_in_ms * 3.6
        return '#f46b6b' if speed_in_kmh < 8
        return '#f79f34' if speed_in_kmh < 12
        return '#ffff7d' if speed_in_kmh < 18
        return '#5bdeb1' if speed_in_kmh < 24
        return '#5899fa'
    return selected_unknown_color

get_base_fill_width = (zoom_level) ->
    return  3 if zoom_level  < 11
    return  4 if zoom_level == 11
    return  4 if zoom_level == 12
    return  4 if zoom_level == 13
    return  6 if zoom_level == 14
    return  8 if zoom_level == 15
    return  8 if zoom_level == 16
    return  9 if zoom_level == 17
    return 14

create_background_outline = (zoom, geojson) ->
    base_fill_width = get_base_fill_width(zoom)
    L.geoJson(geojson,
        style: (f) ->
            stroke: true
            color: outline_color
            weight: base_fill_width + outline_width_addition
            opacity: default_opacity
            fill: false
            lineCap: 'round'
    )

create_background_fill = (zoom, geojson) ->
    base_fill_width = get_base_fill_width(zoom)
    L.geoJson(geojson,
        style: (f) ->
            stroke: true
            color: get_speed_color(f.properties?.speed)
            weight: base_fill_width
            opacity: default_opacity
            fill: false
            lineCap: 'round'
    )

create_selected_outline = (zoom, geojson) ->
    base_fill_width = get_base_fill_width(zoom)
    L.geoJson(geojson,
        style: (f) ->
            stroke: true
            color: outline_color
            weight: selected_width_multiplier * base_fill_width +
                    outline_width_addition + selected_outline_width_addition
            opacity: default_opacity
            fill: false
            lineCap: 'round'
    )

create_selected_fill = (zoom, geojson) ->
    base_fill_width = get_base_fill_width(zoom)
    L.geoJson(geojson,
        style: (f) ->
            stroke: true
            color: get_speed_color(f.properties?.speed)
            weight: selected_width_multiplier * base_fill_width
            opacity: default_opacity
            fill: false
            lineCap: 'round'
    )

create_selected_gloss1 = (zoom, geojson) ->
    base_fill_width = get_base_fill_width(zoom)
    L.geoJson(geojson,
        style: (f) ->
            stroke: true
            color: selected_gloss_color
            weight: gloss1_width_multiplier * base_fill_width
            opacity: gloss1_opacity
            fill: false
            lineCap: 'round'
    )

create_selected_gloss2 = (zoom, geojson) ->
    base_fill_width = get_base_fill_width(zoom)
    L.geoJson(geojson,
        style: (f) ->
            stroke: true
            color: selected_gloss_color
            weight: gloss2_width_multiplier * base_fill_width
            opacity: gloss2_opacity
            fill: false
            lineCap: 'round'
    )

update_background_speeds = () ->
    zoom = map.getZoom()

    if route_layer?.hasLayer(background_featuregroup)
        route_layer.removeLayer(background_featuregroup)

    if map.hasLayer(route_layer)
        background_outline = create_background_outline(zoom, background_geojson)
        background_fill = create_background_fill(zoom, background_geojson)

        background_featuregroup = L.featureGroup([background_outline,
                                                  background_fill])
        route_layer.addLayer(background_featuregroup)

update_selected_itinerary = () ->
    zoom = map.getZoom()

    if route_layer?.hasLayer(selected_featuregroup)
        route_layer.removeLayer(selected_featuregroup)

    if map.hasLayer(route_layer)
        selected_outline = create_selected_outline(zoom, selected_linestring)
        selected_fill = create_selected_fill(zoom, selected_featurecollection)
        selected_gloss1 = create_selected_gloss1(zoom, selected_linestring)
        selected_gloss2 = create_selected_gloss2(zoom, selected_linestring)

        selected_featuregroup = L.featureGroup([selected_outline,
                                                selected_fill,
                                                selected_gloss1,
                                                selected_gloss2])
        route_layer.addLayer(selected_featuregroup)

update_background_speeds_and_selected_itinerary = () ->
    update_background_speeds()
    update_selected_itinerary()

draw_background_speeds = (layer, geojson) ->
    map.off('zoomend', update_background_speeds_and_selected_itinerary)

    background_geojson = geojson
    route_layer = layer

    update_background_speeds()
    map.on('zoomend', update_background_speeds_and_selected_itinerary)
    layer

draw_selected_itinerary = (layer, itinerary_linestring) ->
    map.off('zoomend', update_background_speeds_and_selected_itinerary)

    selected_linestring = itinerary_linestring
    selected_featurecollection = add_speeds_to_itinerary(background_geojson,
                                                         itinerary_linestring)
    route_layer = layer

    update_selected_itinerary()
    map.on('zoomend', update_background_speeds_and_selected_itinerary)
    layer



# Exports.
window.citynavi.draw_selected_itinerary = draw_selected_itinerary
window.citynavi.draw_background_speeds = draw_background_speeds
