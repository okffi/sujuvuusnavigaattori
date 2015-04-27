# This module adds speed information into an itinerary linestring from the
# collected average speeds of the nearby street network.
#
# This module does NOT:
# - act asynchronously
# - change global state
# - do networking
# - draw on the screen



# Imports
# - underscore



is_components_approx_equal = (c1, c2) ->
    epsilon = 1e-5
    Math.abs(c1 - c2) < epsilon

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
    # Avoid mutating segment with .reverse().
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
    if is_first_null or is_last_null
        is_first_null == is_last_null
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

# Add speed information into itinerary where available.
#
# @param The collected average speeds as a GeoJSON FeatureCollection with
#     property 'speed' in each contained LineString.
# @param The itinerary as a GeoJSON LineString.
# @return The itinerary as a GeoJSON FeatureCollection of LineStrings each
#     containing a property 'speed'. If no speed information was found for a
#     LineString, its 'speed' is set to null.
add_speeds_to_itinerary = (background_featurecollection,
                           itinerary_linestring) ->
    itinerary_coordinates = itinerary_linestring.geometry.coordinates
    itinerary_segments = segmentize(itinerary_coordinates)
    speeds = pick_speeds(background_featurecollection, itinerary_segments)
    itinerary_featurecollection = split_into_linestrings(itinerary_segments,
                                                         speeds)



# Exports
window.citynavi.add_speeds_to_itinerary = add_speeds_to_itinerary
