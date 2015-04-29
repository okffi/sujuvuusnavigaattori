# FIXME: For when we handle modules and dependencies:
# import underscore

# Given an itinerary from an OpenTripPlanner response, return the GeoJSON
# LineString corresponding to the combined geometry of all the legs in the
# itinerary.
transform_itinerary_to_linestring = (itinerary, coordinate_scale = 1e-5) ->
    otp_points = _.flatten(_.pluck(_.pluck(itinerary.legs, 'legGeometry'),
                                   'points'),
                           true)
    coordinates = _.map(otp_points, (p) -> [coordinate_scale * p[1],
                                            coordinate_scale * p[0]])
    type: 'Feature'
    geometry:
        type: 'LineString'
        coordinates: coordinates
    properties: {}

transform_locationevent_to_fix = (locationevent) ->
    latlng = locationevent.latlng
    coordinates = [latlng.lng, latlng.lat]
    altitude = locationevent.altitude
    if altitude?
        coordinates.push(altitude)

    properties =
        timestamp: new Date(locationevent.timestamp)
    speed = locationevent.speed
    if speed?
        properties.speed = speed
    # FIXME: Required by maas-server, speed must exist.
    else
        properties.speed = null
    accuracy = locationevent.accuracy
    if accuracy?
        properties.accuracy = accuracy
    altitude_accuracy = locationevent.altitude_accuracy
    if altitude_accuracy?
        # Fixes use camelCase.
        properties.altitudeAccuracy = altitude_accuracy
    heading = locationevent.heading
    if heading?
        properties.heading = heading

    fix =
        type: 'Feature'
        geometry:
            type: 'Point'
            coordinates: coordinates
        properties: properties

# Exports.
window.citynavi.transform_itinerary_to_linestring = transform_itinerary_to_linestring
window.citynavi.transform_locationevent_to_fix = transform_locationevent_to_fix
