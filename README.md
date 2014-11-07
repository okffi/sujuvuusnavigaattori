# Sujuvuusnavigaattori

A bit like a car navigator but for cycling and for finding the best cycling routes in realtime, based on Open Data.

Sujuvuusnavigaattori helps one to find the best cycling routes, for example from home to work place. To do this it records location data from mobile phone client application to server when one is cycling. The cycler as well as other cyclers can then see fluency visualization that is formed from the cyclers' recorded data in realtime. The cycler can also see her/his own recorded routes later. The client application includes navigator and is heavily based on City Navigator proto https://github.com/HSLdevcom/navigator-proto by HSLdevcom.

To see the Sujuvuusnavigaattori running visit: http://sujuvuusnavigaattori.okf.fi/
There is also more general info in Finnish available at [Sujuvuuspilotti](http://fi.okfn.org/projects/sujuvuuspilotti/) page.

Main use cases:

1. While navigating cycler records cycled route with speed data and shares it, so that cyclers can use the data to plan cycling routes.
2. Cycler wants to share fluency data on streets from the navigator in realtime, so that cyclers can use the data for route planning right a way.

The project is directly connected to two other projects:
* https://github.com/okffi/sujuvuusnavigaattori-server
* https://github.com/okffi/sujuvuusnavigaattori-wrapper

Open Data used:
<ul>
<li>OpenStreetMap
<li>Public transport timetables by
    <ul>
    <li>[Oulunliikenne](http://www.oulunjoukkoliikenne.fi/english)
    <li>[Helsinki Region Transport](https://www.hsl.fi/en)
    <li>[Tampereen Joukkoliikenne](http://joukkoliikenne.tampere.fi/en/) via [ITS Factory](http://www.hermiagroup.fi/its-factory/)
    </ul>
<li>Geocoding / street address data via [OKF.fi Geocoder API](https://github.com/rekola/okffi-geocoder) utilizing
    <ul>
    <li>[The National Land Survey (NLS) topographic data](http://www.maanmittauslaitos.fi/en/opendata)
    <li>[Itella basic address file](http://www.itella.fi/english/servicesandproducts/postalcodeservices/basicaddressfile.html)
    </ul>
</ul>

Technologies used: HTML5, Geolocation, Local storage

Libraries used: jQuery Mobile, Leaflet, Backbone.js, Moment.js


## Getting started ##

Node.js with NPM 1.2 or newer is required to build the project. For
Ubuntu 14.04 LTS, this can be acquired with
`sudo add-apt-repository ppa:chris-lea/node.js` followed by `sudo apt-get install nodejs`.
If for some reason you want to build and install Node.js from sources see:
https://github.com/HSLdevcom/hsl-navigator/wiki/Building-node-from-sources

After installing Node.js go to the directory where you want to install the City Navigator.
There, run `git clone https://github.com/okffi/sujuvuusnavigaattori.git`. 

In the navigator-proto directory install dependencies with `npm install`.

Install build tool with `sudo npm install -g grunt-cli`. Run
`grunt server` and if everything goes well open
http://localhost:9001/ with your web browser.

Or, install build tool with `npm install grunt-cli` and run dev server with
`node_modules/.bin/grunt server`.

## Github use best practice for Sujuvuusnavigaattori project

1. Fork the repo 
2. Create a new feature branch for your work 
3. Submit an empty pull request from your branch to the main repo to show you have work in progress. Start the name of the pull request with "WIP: " 
4. Push your commits to your branch as you work
5. With last push, remove "WIP"-comment, and give unit test result instead.

Detail info at https://help.github.com/articles/fork-a-repo/

## Database schema ##

The [Sujuvuusnavigaattori server](https://github.com/okffi/sujuvuusnavigaattori-server) stores fluency related data in following db tables:

Routes:

name | type | notnull | pk
--------| ------ | --------- | --------
id | integer | true | true
session_id | text | true | false
timestamp | text | true | false
speed | real | true | false
geom | linestring | true | false
mode | text | true | false

Traces:

name | type | notnull | pk
-------- | ----- | --------- | ---------
id | integer | true | true
session_id | text | true | false
timestamp | text | true | false
geom| point | true | false
accuracy| integer | false | false
speed| real | false | false
altitude|real| false | false
alt_accuracy | real | false | false
heading | real | false | false

Plans:

name | type | notnull | pk
---- | ---- | ------- | ---
id | integer | true | true
session_id | text | true | false
max_walk_distance | integer | true | false
from_place | real | true | false
min_transfer_time | real | true | false
walk_speed | real | true | false
mode | text | true | false
timestamp | text | true | false
