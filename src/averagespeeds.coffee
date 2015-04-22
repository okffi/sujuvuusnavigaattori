# Import map
map = window.map_dbg

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

#create_general_leaflet_object = (zoom, geojson, color, weight, opacity) ->
#    base_fill_width = get_base_fill_width(zoom)
#    L.geoJson(geojson,
#        style: (f) ->
#            stroke: true
#            color: color
#            weight: weight
#            opacity: opacity
#            fill: false
#            lineCap: 'round'
#    )
#
#create_general_style_function = (color, weight, opacity) ->
#    (f) ->
#        stroke: true
#        color: color
#        weight: weight
#        opacity: opacity
#        fill: false
#        lineCap: 'round'

create_background_outline = (zoom, geojson) ->
    #base_fill_width = get_base_fill_width(zoom)
    #create_general_leaflet_object(zoom, geojson, outline_color,
    #                              base_fill_width + outline_width_addition,
    #                              default_opacity)
    #
    #base_fill_width = get_base_fill_width(zoom)
    #style = create_general_style_function(
    #    outline_color, base_fill_width + outline_width_addition,
    #    default_opacity)
    #L.geoJson(geojson, { style: style })

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

is_components_approx_equal = (c1, c2) ->
    # FIXME: Comment does not make sense anymore.
    # OTP results have seven digits of accuracy.
    epsilon = 1e-5
    Math.abs(c1 - c2) < epsilon

# FIXME: Remove if not needed.
#is_equal_pair = (f, x1, x2) -> f(x1[0], x2[0]) && f(x1[1], x2[1])
#is_coordinates_equal = _.partial(is_equal_pair, is_components_approx_equal)
#is_segments_equal = _.partial(is_equal_pair, is_coordinates_equal)

segmentize = (coordinates) ->
    _.zip(_.initial(coordinates), _.rest(coordinates))

initialize_array = (size, value) ->
    _.times(size, _.constant(value))

zip_speeds = (feature) ->
    coords = feature.geometry.coordinates
    segments = segmentize(coords)
    speeds = initialize_array(_.size(segments), feature.properties.speed)
    _.zip(segments, speeds)

stringify = (num) ->
    # OTP results have five decimals of accuracy.
    Math.round(1e5 * num).toString()

node_to_string = (node) ->
    # Discard altitude as OTP does not provide altitudes.
    node_2d = _.first(node, 2)
    _.map(node_2d, stringify).join(',')

segment_to_string = (segment) ->
    _.map(segment, node_to_string).join(';')

add_segment_to_search_structure = (memo, segment_speed_pair) ->
    [segment, speed] = segment_speed_pair
    memo[segment_to_string(segment)] = speed

    # FIXME: Add reverse direction for now. Perhaps later we have speeds on
    #        directed segments, instead.
    #
    # Avoid changing segment with .reverse().
    first_node = _.first(segment)
    last_node = _.last(segment)
    memo[segment_to_string([last_node, first_node])] = speed

    memo

create_search_structure = (segment_speed_pairs) ->
    _.reduce(segment_speed_pairs, add_segment_to_search_structure, {})

search_speed = (search_structure, string) ->
    if _.has(search_structure, string)
        search_structure[string]
    else
        null

pick_speeds = (speeds_featurecollection, itinerary_segments) ->
    segment_speed_pairs = _.flatten(
        _.map(speeds_featurecollection.features, zip_speeds),
        true)
    search_structure = create_search_structure(segment_speed_pairs)
    itinerary_coordinate_strings = _.map(itinerary_segments, segment_to_string)
    speeds = _.map(itinerary_coordinate_strings, _.partial(search_speed,
                                                           search_structure))

is_speed_approx_equal = (speed_pair) ->
    first = _.first(speed_pair)
    last = _.last(speed_pair)
    is_first_null = _.isNull(first)
    is_last_null = _.isNull(last)
    if is_first_null
        if is_last_null
            true
        else
            false
    else
        if is_last_null
            false
        else
            is_components_approx_equal(first, last)

group_by_consecutively_equal_speeds = (segments, speeds) ->
    speed_pairs = segmentize(speeds)
    is_next_same = _.map(speed_pairs, is_speed_approx_equal)

    sections_and_speeds = []
    current_section = [_.first(segments)]
    for is_same, index in is_next_same
        to_add = segments[index + 1]
        if is_same
            current_section.push(to_add)
        else
            obj =
                speed: speeds[index]
                segments: current_section
            sections_and_speeds.push(obj)
            current_section = [to_add]
    last_obj =
        speed: _.last(speeds)
        segments: current_section
    sections_and_speeds.push(last_obj)

    sections_and_speeds

format_into_linestring = (section_and_speed) ->
    {segments, speed} = section_and_speed
    first_coordinates = _.first(_.first(segments))
    coordinates = [first_coordinates].concat(_.map(segments, _.last))
    feature =
        type: 'Feature'
        properties:
            speed: speed
        geometry:
            type: 'LineString'
            coordinates: coordinates

split_into_linestrings = (segments, speeds) ->
    sections_and_speeds = group_by_consecutively_equal_speeds(segments, speeds)
    features = _.map(sections_and_speeds, format_into_linestring)
    featurecollection =
        type: 'FeatureCollection'
        features: features

add_speeds_to_itinerary = (background_featurecollection, itinerary_linestring) ->
    if background_featurecollection
        itinerary_coordinates = itinerary_linestring.geometry.coordinates
        itinerary_segments = segmentize(itinerary_coordinates)
        speeds = pick_speeds(background_featurecollection, itinerary_segments)
        itinerary_featurecollection = split_into_linestrings(itinerary_segments,
                                                             speeds)
    else
        itinerary_linestring

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
