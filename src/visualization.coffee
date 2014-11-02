# 32 Reaaliaikainen vain katselu -nopeuskarttasivu Oulusta ja Helsingistä
# 31 Nopeustietoa sisältävän reitin katselu lähdettäessä
# 13 Oman toteutuneen reitin, navigaattoriehdotuksen ja suosituimman reitin vertailu kartalla
# 12 (user id jolla omat reitit ja nauhoitukset pääsee katsomaan palvelimelta)
# 11 Perillä katsellun reitin jakaminen
# 10 Reitin katselu perillä
#

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
            li_content = "<li><a href='#show_route?" + record.id + "'>" +
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
