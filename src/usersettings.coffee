
user_settings =
    vehiclemode: "BICYCLE"
    usetransit: false
    bustransitmode: false
    tramtransitmode: false
    railtransitmode: false
    subwaytransitmode: false
    usewheelchair: false
    preferfree: false
    usespeech: false
    firsttime: true
    recordandpublish: false

user_settings_string = localStorage['user_settings']
if user_settings_string?
    # If localStorage did not contain some settings, add them now.
    user_settings = $.extend(user_settings, JSON.parse(user_settings_string))
    localStorage['user_settings'] = JSON.stringify(user_settings)
else
    localStorage['user_settings'] = JSON.stringify(user_settings)

load_me_speak = () ->
    ###
    if not citynavi.config.meSpeak?
        xhr = $.ajax
            url: "mespeak/mespeak.js"
            dataType: "script"
            cache: true

        xhr.done () ->
            if citynavi.config.meSpeak?
                citynavi.config.meSpeak?.loadConfig("mespeak/mespeak_config.json");
                #meSpeak?.loadVoice("mespeak/voices/en/en.json");
                citynavi.config.meSpeak?.loadVoice("mespeak/voices/fi.json");
                console.log "meSpeak loaded"
            else
                console.log "meSpeak failed"

        xhr.fail (jqXHR, textStatus, errorThrown) ->
            console.log "meSpeak failed to load: #{textStatus} #{errorThrown}"
    ###
    
#
# Settings at the front page
# 
$('input[name=vehiclesettings][value=' + user_settings.vehiclemode + ']').prop('checked', true)
if user_settings.usetransit
    $('input[name=usetransit]').prop('checked', true)
else
    $('input[name=usetransit]').prop('checked', false)
#
# Settings at the settings page
# 
if user_settings.bustransitmode
    $('#modesettings').find('input[name=BUS]').prop('checked', true)
else
    $('#modesettings').find('input[name=BUS]').prop('checked', false)
if user_settings.tramtransitmode
    $('#modesettings').find('input[name=TRAM]').prop('checked', true)
else
    $('#modesettings').find('input[name=TRAM]').prop('checked', false)
if user_settings.railtransitmode
    $('#modesettings').find('input[name=RAIL]').prop('checked', true)
else
    $('#modesettings').find('input[name=RAIL]').prop('checked', false)
if user_settings.subwaytransitmode
    $('#modesettings').find('input[name=SUBWAY]').prop('checked', true)
else
    $('#modesettings').find('input[name=SUBWAY]').prop('checked', false)
if user_settings.usewheelchair
    $('#wheelchair').prop('checked', true)
else
    $('#wheelchair').prop('checked', false)
if user_settings.preferfree
    $('#prefer-free').prop('checked', true)
else
    $('#prefer-free').prop('checked', false)
if user_settings.usespeech
    $('#use-speech').prop('checked', true)
    load_me_speak()
else
    $('#use-speech').prop('checked', false)
if user_settings.recordandpublish
    $('#permission-checkbox').prop('checked', true)
else
    $('#permission-checkbox').prop('checked', false)

$('#vehiclesettings').change () ->
    vehiclemode = $("input:checked[name=vehiclesettings]").val()
    user_settings = JSON.parse(localStorage['user_settings'])
    user_settings.vehiclemode = vehiclemode
    localStorage['user_settings'] = JSON.stringify(user_settings)
    console.log "changed vehicle mode to", vehiclemode

$('input[name=usetransit]').change () ->
    usetransit = if $('input[name=usetransit]').attr('checked') then true else false
    user_settings = JSON.parse(localStorage['user_settings'])
    user_settings.usetransit = usetransit
    localStorage['user_settings'] = JSON.stringify(user_settings)
    console.log "changed usetransit to", usetransit

$('#modesettings').find('input[name=BUS]').change () ->
    bustransitmode = if $('input[name=BUS]').attr('checked') then true else false
    user_settings = JSON.parse(localStorage['user_settings'])
    user_settings.bustransitmode = bustransitmode
    localStorage['user_settings'] = JSON.stringify(user_settings)
    console.log "changed bustransitmode to", bustransitmode

$('#modesettings').find('input[name=TRAM]').change () ->
    tramtransitmode = if $('input[name=TRAM]').attr('checked') then true else false
    user_settings = JSON.parse(localStorage['user_settings'])
    user_settings.tramtransitmode = tramtransitmode
    localStorage['user_settings'] = JSON.stringify(user_settings)
    console.log "changed tramtransitmode to", tramtransitmode

$('#modesettings').find('input[name=RAIL]').change () ->
    railtransitmode = if $('input[name=RAIL]').attr('checked') then true else false
    user_settings = JSON.parse(localStorage['user_settings'])
    user_settings.railtransitmode = railtransitmode
    localStorage['user_settings'] = JSON.stringify(user_settings)
    console.log "changed railtransitmode to", railtransitmode

$('#modesettings').find('input[name=SUBWAY]').change () ->
    subwaytransitmode = if $('input[name=SUBWAY]').attr('checked') then true else false
    user_settings = JSON.parse(localStorage['user_settings'])
    user_settings.subwaytransitmode = subwaytransitmode
    localStorage['user_settings'] = JSON.stringify(user_settings)
    console.log "changed subwaytransitmode to", subwaytransitmode

$('#wheelchair').change () ->
    usewheelchair = if $('#wheelchair').attr('checked') then true else false
    user_settings = JSON.parse(localStorage['user_settings'])
    user_settings.usewheelchair = usewheelchair
    localStorage['user_settings'] = JSON.stringify(user_settings)
    console.log "changed usewheelchair to", usewheelchair

$('#prefer-free').change () ->
    preferfree = if $('#prefer-free').attr('checked') then true  else false
    user_settings = JSON.parse(localStorage['user_settings'])
    user_settings.preferfree = preferfree
    localStorage['user_settings'] = JSON.stringify(user_settings)
    console.log "changed preferfree to", preferfree

$('#permission-checkbox').change () ->
    recordandpublish = if $('#permission-checkbox').attr('checked') then true else false
    user_settings = JSON.parse(localStorage['user_settings'])
    user_settings.recordandpublish = recordandpublish
    localStorage['user_settings'] = JSON.stringify(user_settings)
    console.log "changed recordandpublish to", recordandpublish

    if recordandpublish
        # FIXME: Load order requires that this is not imported at init.
        window.citynavi.start_recording()
    else
        # FIXME: Load order requires that this is not imported at init.
        window.citynavi.stop_recording()

$('#use-speech').change () ->
    if $('#use-speech').attr('checked')
        load_me_speak()
        user_settings = JSON.parse(localStorage['user_settings'])
        user_settings.usespeech = true
        localStorage['user_settings'] = JSON.stringify(user_settings)
    else
        user_settings = JSON.parse(localStorage['user_settings'])
        user_settings.usespeech = false
        localStorage['user_settings'] = JSON.stringify(user_settings)
    console.log "changed usespeech to", user_settings.usespeech



# Ask the user for permission to record and publish.
if user_settings.firsttime
    $('#front-page').on 'pageshow', (e) ->
        $('#permission-popup').popup('open')

$('#permission-button-no').on 'click', (e) ->
    user_settings.firsttime = false
    user_settings.recordandpublish = false
    localStorage['user_settings'] = JSON.stringify(user_settings)
    $('#permission-popup').popup('close')
    # FIXME: Load order requires that this is not imported at init.
    window.citynavi.stop_recording()

$('#permission-button-yes').on 'click', (e) ->
    user_settings.firsttime = false
    user_settings.recordandpublish = true
    localStorage['user_settings'] = JSON.stringify(user_settings)
    $('#permission-popup').popup('close')
    # FIXME: Load order requires that this is not imported at init.
    window.citynavi.start_recording()



get_settings = () ->
    user_settings

set_settings = (settings) ->
    user_settings = settings
    localStorage['user_settings'] = JSON.stringify(user_settings)

# Exports
window.citynavi.get_settings = get_settings
window.citynavi.set_settings = set_settings
