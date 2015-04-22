# FIXME: Plan:
# - store fixes with journey id
# - store itineraries with journey id
# - use segmentanalyst
# - if a journey seems to have ended, figure out how to ask the user for permission, if it has not been granted.
# - if the user seems to have abandoned the itinerary, perhaps ask the user to confirm another itinerary
# - export some functions:
#   - start
#   - stop
#
# Get first journey id at init
# Start recording from init
# Button in settings to purge fix history
# Buttons in settings to allow or disallow sending fixes
#   - "Send my itineraries to the server:"
#       - "Never"
#       - "Ask"
#       - "Always"
#   - "Send my movements to the server:"
#       - "Never"
#       - "Ask"
#       - "Always"
# Start checking for the end of the journey immediately at init.
# If journey end found, ask about sending fixes. Start a new journey anyway.
# If the user does not want to send the data, destroy it?
# Remove functionality to see old mobility data.

# Imports.

{maas_server_url} = citynavi.config

maas = window.maas
kulku = window.kulku

map = window.map_dbg

transform_locationevent_to_fix = window.citynavi.transform_locationevent_to_fix
transform_itinerary_to_linestring = window.citynavi.transform_itinerary_to_linestring



FIX_STORAGE_KEY = 'navigator_fixes'
SEGMENT_STORAGE_KEY = 'navigator_segments'

# For communicating with maas-server.
connector = maas.createConnector(maas_server_url)

get_connector = () ->
    connector

fix_storage = null
segment_storage = null

journey_id = null
is_journey_over = null

is_itinerary_given = false
segment_analyst = null
is_on_itinerary = null

get_journey_id = () ->
    journey_id

separate_by_key = (separator_key, value_key, memo, obj) ->
    id = obj[separator_key]
    value = obj[value_key]
    previous_values = memo[id]
    if previous_values
        memo[id] = previous_values.concat(value)
    else
        memo[id] = [value]
    memo

# FIXME: This could be more efficient by e.g. using a separate localStorage key
#        for each journey. Or even better, store a dictionary in localStorage.
# FIXME: Also we do should not touch the same localStorage key that syncStorage
#        is using. In this case I expect it to be fine.
purge_for_journey = (journey_id, storage_key) ->
    objs = JSON.parse(localStorage[storage_key])
    filtered = _.filter(objs, (obj) -> obj.journey_id != journey_id)
    localStorage[storage_key] = JSON.stringify(filtered)

deepClone = (obj) ->
    $.extend(true, {}, obj)

# Expect an extended GeoJSON object and change properties.timestamp to a string.
stringify_timestamp = (feature) ->
    copy = deepClone(feature)
    copy.properties.timestamp = feature.properties.timestamp.toISOString()
    copy

# Expect an extended GeoJSON object and change properties.timestamp to a Date.
dateify_timestamp = (feature) ->
    copy = deepClone(feature)
    copy.properties.timestamp = new Date(feature.properties.timestamp)
    copy

store_fix = (journey_id, fix) ->
    storable_fix = stringify_timestamp(fix)
    obj =
        journey_id: journey_id,
        fix: storable_fix
    fix_storage.store(obj)

separate_fixes_by_journey = (memo, obj) ->
    separate_by_key('journey_id', 'fix', memo, obj)

get_all_fixes = (fix_storage) ->
    objs = fix_storage.getAll()
    dateified = _.map(objs, (obj) ->
        obj.fix = dateify_timestamp(obj.fix)
        obj
    )

get_fixes_by_journey = (fix_storage) ->
    objs = get_all_fixes(fix_storage)
    _.reduce(objs, separate_fixes_by_journey, {})

send_fixes_for_journey = (fixes, id, list) ->
    if _.has(list, id)
        connector.sendFixes(id, fixes)
            .then((res) -> purge_for_journey(id, FIX_STORAGE_KEY))
            .catch(console.log)

# Send the fixes AND purge the sent fixes from localStorage.
send_fixes = () ->
    fixes_by_journey = get_fixes_by_journey(fix_storage)
    _.each(fixes_by_journey, send_fixes_for_journey)

fixes_for_current_journey = (journey_id, fix_storage) ->
    objs = get_all_fixes(fix_storage)
    _.map(_.filter(objs, (obj) -> obj.journey_id == journey_id),
          _.property('fix'))

store_segments = (journey_id, segments) ->
    _.each(segments, (segment) ->
        storable_segment = deepClone(segment)
        storable_segment.start = stringify_timestamp(segment.start)
        storable_segment.end = stringify_timestamp(segment.end)
        obj =
            journey_id: journey_id,
            segment: storable_segment
        segment_storage.store(obj)
    )

separate_segments_by_journey = (memo, obj) ->
    separate_by_key('journey_id', 'segment', memo, obj)

get_all_segments = (segment_storage) ->
    objs = segment_storage.getAll()
    dateified = _.map(objs, (obj) ->
        obj.segment.start = dateify_timestamp(obj.segment.start)
        obj.segment.end = dateify_timestamp(obj.segment.end)
        obj
    )

get_segments_by_journey = (segment_storage) ->
    objs = get_all_segments(segment_storage)
    _.reduce(objs, separate_segments_by_journey, {})

send_segments_by_journey = (segments, id, list) ->
    if _.has(list, id)
        # FIXME: Hardcoded values. 'averageSpeed' is current default in
        # kulku.js. 'BICYCLE' is the expected mode of transport.
        connector.sendSegments(id, segments,
            _.times(_.size(segments), _.constant('averageSpeed')),
            _.times(_.size(segments), _.constant('BICYCLE')))
            .then((res) ->
                # FIXME: Race condition. If we handle an OK response after
                # another segment has been stored for the same journey, the
                # new segment will be thrown away without sending it.
                #
                # Suggested fix: Keep score of which segments have been
                # sent. Purge only those.
                purge_for_journey(id, SEGMENT_STORAGE_KEY)
            )
            .catch(console.log)

send_segments = () ->
    segments_by_journey = get_segments_by_journey(segment_storage)
    # FIXME: We do not have that setting at the moment.
    ## FIXME: Hardcoded source
    #settings = localStorage['user_settings']
    #if settings.allowsending
    _.each(segments_by_journey, send_segments_by_journey)

handle_locationevent = (locationevent) ->
    fix = transform_locationevent_to_fix(locationevent)
    store_fix(journey_id, fix)

    if is_itinerary_given
        if is_on_itinerary(fix)
            segments = analyse_segments(fix)
            if segments.length > 0
                store_segments(journey_id, segments)
                send_segments()
        else
            # FIXME: Offer a new itinerary.
            # FIXME: Must solve.
            send_segments()
            is_itinerary_given = false

    if is_journey_over(fix)
        finish_journey()

finish_journey = () ->
    send_fixes()
    # FIXME: Is this enough to synchronize itinerary change?
    is_itinerary_given = false
    journey_id = maas.createJourneyId()
    is_journey_over = kulku.createJourneyWatcher()
    # FIXME: Perhaps do something in the UI? Suggest a new itinerary?
    # FIXME: What about sending segments?

start_following_itinerary = (otp_itinerary) ->
    itinerary = transform_itinerary_to_linestring(otp_itinerary)
    ## FIXME: Possibly feed some fixes already in fix_storage into
    ## segment_analyst and itinerary watcher and start feeding fresh fixes as
    ## well.
    #fixes = fixes_for_current_journey(journey_id, fix_storage)
    # FIXME: Hacky approach: Take e.g. 5 or 10 previous fixes.
    segment_analyst = kulku.createSegmentAnalyst(itinerary)
    is_on_itinerary = kulku.createItineraryWatcher(itinerary)
    is_itinerary_given = true

start_recording = () ->
    fix_storage = maas.createSyncStorage('navigator_fixes')

    segment_storage = maas.createSyncStorage('navigator_segments')
    journey_id = maas.createJourneyId()
    is_journey_over = kulku.createJourneyWatcher()
    map.on('locationfound', handle_locationevent)

stop_recording = () ->
    # FIXME: Should we purge?
    fix_storage.purgeAll()
    segment_storage.purgeAll()
    map.off('locationfound', handle_locationevent)

# Start recording at init.
start_recording()

# Exports.
window.citynavi.get_journey_id = get_journey_id
window.citynavi.get_connector = get_connector
