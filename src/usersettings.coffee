
vehicle_mode = localStorage['vehicle_mode']
if vehicle_mode?
    $('input[name=vehiclesettings][value=' + vehicle_mode + ']').prop('checked', true)

usetransit = localStorage['usetransit']
if usetransit?
    if usetransit is 'checked'
        $('[name=usetransit]').prop('checked', true)
    else
        $('[name=usetransit]').prop('checked', false)

$('#vehiclesettings').change( ->
    vehicle_mode = $("input:checked[name=vehiclesettings]").val()
    localStorage['vehicle_mode'] = vehicle_mode
    console.log "changed vehicle mode to", vehicle_mode
)

$('[name=usetransit]').change( ->
    usetransit = if $('[name=usetransit]').attr('checked') then 'checked' else 'unchecked'
    localStorage['usetransit'] = usetransit
    console.log "changed usetransit to", usetransit
)    
