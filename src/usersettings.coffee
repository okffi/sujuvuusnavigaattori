
#
# Settings at the front page
# 

vehicle_mode = localStorage['vehicle_mode']
if vehicle_mode?
    $('input[name=vehiclesettings][value=' + vehicle_mode + ']').prop('checked', true)

$('#vehiclesettings').change () ->
    vehicle_mode = $("input:checked[name=vehiclesettings]").val()
    localStorage['vehicle_mode'] = vehicle_mode
    console.log "changed vehicle mode to", vehicle_mode


usetransit = localStorage['usetransit']
if usetransit?
    if usetransit is 'checked'
        $('[name=usetransit]').prop('checked', true)
    else
        $('[name=usetransit]').prop('checked', false)

$('[name=usetransit]').change () ->
    usetransit = if $('[name=usetransit]').attr('checked') then 'checked' else 'unchecked'
    localStorage['usetransit'] = usetransit
    console.log "changed usetransit to", usetransit

#
# Settings at the settings page
# 

bustransitmode = localStorage['bustransitmode']
if bustransitmode?
    if bustransitmode is 'checked'
        $('#modesettings').find('input[name=BUS]').prop('checked', true)
    else
        $('#modesettings').find('input[name=BUS]').prop('checked', false)
        
$('#modesettings').find('input[name=BUS]').change () ->
    bustransitmode = if $('input[name=BUS]').attr('checked') then 'checked' else 'unchecked'
    localStorage['bustransitmode'] = bustransitmode
    console.log "changed bustransitmode to", bustransitmode

tramtransitmode = localStorage['tramtransitmode']
if tramtransitmode?
    if tramtransitmode is 'checked'
        $('#modesettings').find('input[name=TRAM]').prop('checked', true)
    else
        $('#modesettings').find('input[name=TRAM]').prop('checked', false)

$('#modesettings').find('input[name=TRAM]').change () ->
    tramtransitmode = if $('input[name=TRAM]').attr('checked') then 'checked' else 'unchecked'
    localStorage['tramtransitmode'] = tramtransitmode
    console.log "changed tramtransitmode to", tramtransitmode

railtransitmode = localStorage['railtransitmode']
if railtransitmode?
    if railtransitmode is 'checked'
        $('#modesettings').find('input[name=RAIL]').prop('checked', true)
    else
        $('#modesettings').find('input[name=RAIL]').prop('checked', false)

$('#modesettings').find('input[name=RAIL]').change () ->
    railtransitmode = if $('input[name=RAIL]').attr('checked') then 'checked' else 'unchecked'
    localStorage['railtransitmode'] = railtransitmode
    console.log "changed railtransitmode to", railtransitmode

subwaytransitmode = localStorage['subwaytransitmode']
if subwaytransitmode?
    if subwaytransitmode is 'checked'
        $('#modesettings').find('input[name=SUBWAY]').prop('checked', true)
    else
        $('#modesettings').find('input[name=SUBWAY]').prop('checked', false)

$('#modesettings').find('input[name=SUBWAY]').change () ->
    subwaytransitmode = if $('input[name=SUBWAY]').attr('checked') then 'checked' else 'unchecked'
    localStorage['subwaytransitmode'] = subwaytransitmode
    console.log "changed subwaytransitmode to", subwaytransitmode


usewheelchair = localStorage['usewheelchair']
if usewheelchair?
    if usewheelchair is 'checked'
        $('#wheelchair').prop('checked', true)
    else
        $('#wheelchair').prop('checked', false)

$('#wheelchair').change () ->
    usewheelchair = if $('#wheelchair').attr('checked') then 'checked' else 'unchecked'
    localStorage['usewheelchair'] = usewheelchair
    console.log "changed usewheelchair to", usewheelchair


preferfree = localStorage['preferfree']
if preferfree?
    if preferfree is 'checked'
        $('#prefer-free').prop('checked', true)
    else
        $('#prefer-free').prop('checked', false)

$('#prefer-free').change () ->
    preferfree = if $('#prefer-free').attr('checked') then 'checked' else 'unchecked'
    localStorage['preferfree'] = preferfree
    console.log "changed preferfree to", preferfree


load_me_speak = () ->
    if not meSpeak?
        xhr = $.ajax
            url: "mespeak/mespeak.js"
            dataType: "script"
            cache: true

        xhr.done () ->
            if meSpeak?
                meSpeak?.loadConfig("mespeak/mespeak_config.json");
                #meSpeak?.loadVoice("mespeak/voices/en/en.json");
                meSpeak?.loadVoice("mespeak/voices/fi.json");
                console.log "meSpeak loaded"
            else
                console.log "meSpeak failed"

        xhr.fail (jqXHR, textStatus, errorThrown) ->
            console.log "meSpeak failed to load: #{textStatus} #{errorThrown}"

usespeech = localStorage['use-speech']
if usespeech?
    if usespeech is 'checked'
        $('#use-speech').prop('checked', true)
        load_me_speak()
    else
        $('#use-speech').prop('checked', false)

$('#use-speech').change () ->
    if $('#use-speech').attr('checked')
        load_me_speak()
        localStorage['use-speech'] = 'checked'
    else
        localStorage['use-speech'] = 'unchecked'

