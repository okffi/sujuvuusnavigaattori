# 32 Reaaliaikainen vain katselu -nopeuskarttasivu Oulusta ja Helsingistä
# 31 Nopeustietoa sisältävän reitin katselu lähdettäessä
# 13 Oman toteutuneen reitin, navigaattoriehdotuksen ja suosituimman reitin vertailu kartalla
# 12 (user id jolla omat reitit ja nauhoitukset pääsee katsomaan palvelimelta)
# 11 Perillä katsellun reitin jakaminen
# 10 Reitin katselu perillä
#

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
        for record in recordins by -1 # list the latest recording first
            $list.append("<li><a href='#show_route?" +
                record.id + "'>" +
                moment(record.date).format("MMM D, YYYY ddd h:mm A") +
                "</a></li>")
            # TODO show also start and finish address, length, duration, avg.speed
    else
        $list.append("<li>No recorded routes yet</li>")
