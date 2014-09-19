/// <reference path="../typings/q/Q.d.ts" />
/// <reference path="../settings.ts" />
var jsd = require('../settings');

var settings = jsd.settings;

var GeoLocation = (function () {
    function GeoLocation() {
        /**
        * Earth-radius in kilometers
        *
        * @private
        * @property EARH_RADIUS
        * @type {Number}
        * @readOnly
        * @static
        * @final
        */
        this.EARTH_RADIUS = 6371;
    }
    /**
    * Convert angular-value to radian
    * @method deg2grad
    * @private
    * @param deg {Number} Degrees
    * @return {Number}
    */
    GeoLocation.prototype.deg2rad = function (deg) {
        return deg * (Math.PI / 180);
    };

    /**
    * Asynchronously get the latitude/longitude of the device using the W3C-API
    * @method getGeoLocation
    * @return {Promise}
    */
    GeoLocation.prototype.getGeoLocation = function () {
        var deferred = Q.defer();

        //don't return the actual location
        if (!settings.network.useGeoLocation) {
            deferred.resolve(null);
        } else if (settings.network.useGeoLocation && this._location) {
            deferred.resolve(this._location);
        } else {
            navigator.geolocation.getCurrentPosition(function success(position) {
                //caching
                this._location.lat = position.coords.latitude;
                this._location.long = position.coords.longitude;

                deferred.resolve(this._location);
            }, function error() {
                deferred.resolve(this._location ? this._location : null);
            }, { enableHighAccuracy: false });
        }

        return deferred.promise;
    };

    /**
    * Uses the Haversine formula to calculate the distance between two geoLocations
    *
    * @method getDistanceBetweenTwoLocations
    * @see http://en.wikipedia.org/wiki/Haversine_formula
    *
    * @param {Object} position1
    * @param {Number} position1.lat
    * @param {Number} position1.long
    * @param {Object} [position2]
    * @param {Number} position2.lat
    * @param {Number} position2.long
    *
    * @return [Number] distance in kilometers
    */
    GeoLocation.prototype.getDistanceBetweenTwoLocations = function (position1, position2) {
        position2 = position2 || this._location;

        var dLat = this.deg2rad(position2.lat - position2.lat), dLon = this.deg2rad(position2.long - position1.long), a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.deg2rad(position2.lat)) * Math.cos(this.deg2rad(position2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2), c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return this.EARTH_RADIUS * c;
    };
    return GeoLocation;
})();
exports.GeoLocation = GeoLocation;
//# sourceMappingURL=geolocation.js.map
