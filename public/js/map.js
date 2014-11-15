//L.mapbox.accessToken = 'pk.eyJ1IjoiaGZlZWtpIiwiYSI6IkNxT3o5cW8ifQ.ATvaU961-OXaknsBSSh3kQ';
//var map = L.mapbox.map('map', 'examples.map-i86nkdio')
//    .setView([40, -74.50], 9);

// Provide your access token
L.mapbox.accessToken = 'pk.eyJ1IjoiaGZlZWtpIiwiYSI6IkNxT3o5cW8ifQ.ATvaU961-OXaknsBSSh3kQ';
// Create a map in the div #map
var map = L.mapbox.map('map', 'hfeeki.k6659pgn', { zoomControl: false });
new L.Control.Zoom({ position: 'topright' }).addTo(map);
