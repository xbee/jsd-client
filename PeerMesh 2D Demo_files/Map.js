var peerManager = new PeerManager("leaflet");
Map = function () {
    if (webrtcDetectedBrowser == null) {
        window.location = "not_found.html";
    }

    var mapDiv = document.getElementById("map");
    this.lastOpenedLayer = null;

    this.featureMap = {};
    this.featurePathMap = {};
    this.vectorIndex = 0;
    this.maxVectorIndex = 100;
    this.lastSelectedPath = null;
    this.isLayManOpened = false;
    this.isLocationOpened = false;

    this.iconIndex = 0;

    this.airportIcon = L.icon({
        iconUrl: 'css/image/airport.png',
        iconSize: [28, 28],
    });

    this.satelliteLayer = this.getBingMapLayer();

    this.rasterLayer = this.getMidnightCommanderLayer();

    this.terrainLayer = this.getTerrainLayer();

    this.softRasterLayer = this.getSoftRasterLayer();

    this.isAirportVisible = false;
    this.airportLayer = null;

    var newStyle = {
        radius: 25,
        weight: 4,
        color: 'rgba(29, 149, 254, 1)',
        fill: true,
        opacity: 0.8
    };
    this.locationWidget = new L.Control.Gps({
        style: newStyle
    });

    var scope = this;
    this.map = L.map('map', {
        zoomControl: false
    }).setView([41.010, 28.971], 15).on('click', function (e) {
        if (scope.lastSelectedPath != null) {
            scope.vectorLayer.removeLayer(scope.lastSelectedPath);
        }
    }).on('zoomend ', function (e) {
        if (scope.map.getZoom() > 6) {
            if (scope.isAirportVisible) {
                scope.map.addLayer(scope.airportLayer);
            }

        } else if (scope.map.getZoom() <= 6) {
            if (scope.airportLayer != null) {
                scope.map.removeLayer(scope.airportLayer);
            }
        }
    });

    this.map.addControl(this.locationWidget);// inizialize control

    this.vectorLayer = L.featureGroup([]).on('click', function (e) {
        // e.layer.options.id
        var path = scope.featurePathMap[e.layer.options.id];
        if (scope.lastSelectedPath != null) {
            scope.vectorLayer.removeLayer(scope.lastSelectedPath);
        }
        scope.lastSelectedPath = path;
        scope.vectorLayer.addLayer(scope.lastSelectedPath);
    });

    this.map.addLayer(this.rasterLayer);

    this.dPeer = this.createGage("downloadPeer", "Percent");
    this.dServer = this.createGage("downloadServer", "Percent");

    setTimeout(this.setConnectionCount, 2000);
    setInterval(this.setConnectionCount, 8000);

};
Map.prototype.setConnectionCount = function () {
    peerManager.getConnectionCount(function (a) {
        document.getElementById("connection_text").innerHTML = a;
    });
};

Map.prototype.zoom = function (isZoom) {
    var zoom = this.map.getZoom();
    zoom = isZoom ? ++zoom : --zoom;
    this.map.setZoom(zoom);
};

Map.prototype.loadFromURL = function (url, callback) {
    peerManager.request(url, function (text) {
        callback(text);
    }, PeerManager.JSON_TYPE);
};

Map.prototype.createIcon = function (scope) {
    var icon = L.icon({
        iconUrl: 'css/image/plane' + scope.iconIndex + '.png',
        iconSize: [24, 24],
    });
    scope.iconIndex = (++scope.iconIndex) % 3;
    return icon;
};
Map.prototype.getAirportLayer = function (callback) {
    if (this.airportLayer != null) {
        callback(this.airportLayer);
    } else {
        var scope = this;
        this.loadFromURL("css/image/airport.json", function (text) {
            scope.airportLayer = L.geoJson(text, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: scope.airportIcon
                    });
                }
            });
            callback(scope.airportLayer);
        });
    }
};
Map.prototype.openLayer = function (layer) {
    if (this.lastOpenedLayer == layer) {
        return;
    }
    this.map.removeLayer(this.satelliteLayer);
    this.map.removeLayer(this.softRasterLayer);
    this.map.removeLayer(this.rasterLayer);
    this.map.removeLayer(this.terrainLayer);
    this.map.removeLayer(this.vectorLayer);

    document.getElementById("layer1").setAttribute("active",
        layer == this.rasterLayer ? "true" : "false");
    document.getElementById("layer2").setAttribute("active",
        layer == this.satelliteLayer ? "true" : "false");
    document.getElementById("layer3").setAttribute("active",
        layer == this.terrainLayer ? "true" : "false");
    document.getElementById("layer4").setAttribute("active",
        layer == this.softRasterLayer ? "true" : "false");

    this.isAirportVisible = false;
    if (this.airportLayer != null) {
        this.map.removeLayer(this.airportLayer);
    }

    this.map.addLayer(layer);

    if (layer == this.softRasterLayer) {
        this.map.addLayer(this.vectorLayer);

        this.map.setView([41.010, 28.971], 10);

        if (this.vectorIndex < this.maxVectorIndex) {
            var obj = this;
            this.getAirportLayer(function (l) {
                obj.isAirportVisible = true;
                obj.map.addLayer(l);
                obj.vectorLayer.bringToFront();
            });
            this.intervalId = setInterval(
                function () {
                    var scope = obj;
                    scope
                        .loadFromURL(
                        "vector/" + scope.vectorIndex + ".json",
                        function (text) {
                            L
                                .geoJson(
                                text,
                                {
                                    onEachFeature: function (feature,
                                                             layer) {
                                        var marker = scope.featureMap[feature.id];
                                        var latlng = new L.LatLng(
                                            feature.geometry.coordinates[1],
                                            feature.geometry.coordinates[0]);
                                        if (marker == null) {
                                            marker = L
                                                .rotatedMarker(
                                                latlng,
                                                {
                                                    icon: scope
                                                        .createIcon(scope)
                                                })
                                                .bindPopup(
                                                feature.properties.name);
                                            marker.options.id = feature.id;
                                            marker.options.name = feature.properties.name;
                                            scope.featureMap[feature.id] = marker;
                                            scope.featurePathMap[feature.id] = L
                                                .polyline(
                                                [latlng],
                                                {
                                                    color: '#3e5ec2'
                                                });
                                            scope.vectorLayer
                                                .addLayer(marker);
                                        } else {
                                            marker.options.angle = GisUtil
                                                .calculateAzimuthAngle(
                                                marker
                                                    .getLatLng().lat,
                                                marker
                                                    .getLatLng().lng,
                                                feature.geometry.coordinates[1],
                                                feature.geometry.coordinates[0]);
                                            marker
                                                .setLatLng(latlng);
                                            scope.featurePathMap[feature.id]
                                                .addLatLng(latlng);

                                        }

                                    }
                                });
                        });
                    scope.vectorIndex++;

                }, 2500);

        }
    } else {
        clearInterval(this.intervalId);
    }

    this.lastOpenedLayer = layer;

};

Map.prototype.changeLocationDisplay = function () {
    this.locationWidget._switchGps();
    this.isLocationOpened = !this.isLocationOpened;
    document.getElementById("locButton").setAttribute("active2",
        this.isLocationOpened);
};

Map.prototype.changeLMDisplay = function (display) {
    if (display == null) {
        this.isLayManOpened = !this.isLayManOpened;
        display = this.isLayManOpened;
    }
    if (!display) {
        this.isLayManOpened = false;
    }
    var el = document.getElementById("panel");
    el.style.right = display ? "0px" : "-"
    + document.getElementById("layerManager").offsetWidth + "px";
    document.getElementById("lmButton").setAttribute("active", display);
};

Map.prototype.createGage = function (id, title) {

    return new JustGage({
        id: id,
        label: "%",
        value: 0,
        min: 0,
        max: 100,
        title: title,
        valueFontColor: "white",
        titleFontColor: "white",
        labelFontColor: "white",
        levelColors: ["#dd5a46", "#ffcc00", "#2ecc71"]
    });
};

Map.prototype.getTerrainLayer = function () {
    //'https://a.tiles.mapbox.com/v4/emreesirik.j2fmbmmi/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZW1yZWVzaXJpayIsImEiOiJHdUl6N0tVIn0.WmFsnfxtNub6pxgxfNM6uA');
    return new L.TileLayer("https://a.tiles.mapbox.com/v4/peermesh.k7c3no6p/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicGVlcm1lc2giLCJhIjoiVjJzTGtPQSJ9.QTCWUtvfkTutnPsJg0Pzog#7/39.373/31.849");
};

Map.prototype.getMidnightCommanderLayer = function () {
    // 'https://b.tiles.mapbox.com/v4/emreesirik.j2h2jiof/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZW1yZWVzaXJpayIsImEiOiJHdUl6N0tVIn0.WmFsnfxtNub6pxgxfNM6uA'

    return new L.TileLayer(
        'https://a.tiles.mapbox.com/v4/peermesh.k7c127ml/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicGVlcm1lc2giLCJhIjoiVjJzTGtPQSJ9.QTCWUtvfkTutnPsJg0Pzog#4/39.91/32.84');
};

Map.prototype.getSoftRasterLayer = function () {
    // var url =
    // "https://a.tiles.mapbox.com/v4/emreesirik.j2h4fj0p/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZW1yZWVzaXJpayIsImEiOiJHdUl6N0tVIn0.WmFsnfxtNub6pxgxfNM6uA"
    // var url =
    // "https://b.tiles.mapbox.com/v4/emreesirik.j3afom66/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZW1yZWVzaXJpayIsImEiOiJHdUl6N0tVIn0.WmFsnfxtNub6pxgxfNM6uA";
    var url = "https://a.tiles.mapbox.com/v4/peermesh.k7c1mmm0/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicGVlcm1lc2giLCJhIjoiVjJzTGtPQSJ9.QTCWUtvfkTutnPsJg0Pzog#9/40.6629/29.0396";
    return new L.TileLayer(url);
};

Map.prototype.getBingMapLayer = function () {
    var bing = new L.BingLayer(
        "AkCYtmOiS4RrNYd5hO2vQfYeCIX3oQtoA1dSRIcgwby9o6uQLgjLXlX0gtADT0zq",
        {
            type: "AerialWithLabels"
        });
    return bing;
};

Map.prototype.getOsmLayer = function () {
    var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', osmAttrib = '&copy; <a  href="http://openstreetmap.org/copyright">OpenStreetMap</a>contributors';
    var osm = L.tileLayer(osmUrl, {
        maxZoom: 18,
        attribution: osmAttrib
    });
    return osm;
};

PeerStatistic.listener = function () {
    document.getElementById('upload_text').innerHTML = PeerBinaryUtil
        .bytesToSize(PeerStatistic.upload, 2);
    document.getElementById('download_text').innerHTML = PeerBinaryUtil
        .bytesToSize(PeerStatistic.totalDownload, 2);
    document.getElementById('download_peer_text').innerHTML = PeerBinaryUtil
        .bytesToSize(PeerStatistic.peerDownload, 2)
    + " <span class='percent_text'> / "
    + PeerStatistic.peerPercent.toFixed(0) + " %</span>";
    document.getElementById('download_server_text').innerHTML = PeerBinaryUtil
        .bytesToSize(PeerStatistic.imageServerDownload, 2)
    + " <span class='percent_text'> / "
    + PeerStatistic.imageServerPercent.toFixed(0) + " %</span>";

    map.dPeer.refresh(PeerStatistic.peerPercent.toFixed(0));
    map.dServer.refresh(PeerStatistic.imageServerPercent.toFixed(0));
};
