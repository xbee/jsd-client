/// <reference path="../typings/q/Q.d.ts" />
/// <reference path="../settings.ts" />

import jsd = require('../settings');

var settings: jsd.SettingModel = jsd.settings;

export interface Location {
    lat: number;
    long: number;
}

export class GeoLocation {
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
    EARTH_RADIUS:number = 6371;

    /**
     * Internal caching for the location object
     * @private
     * @property location
     * @type Object
     * @default null
     */
    private _location:Location;

    /**
     * Convert angular-value to radian
     * @method deg2grad
     * @private
     * @param deg {Number} Degrees
     * @return {Number}
     */
    private deg2rad(deg:number):number {
        return deg * (Math.PI / 180);
    }

    /**
     * Asynchronously get the latitude/longitude of the device using the W3C-API
     * @method getGeoLocation
     * @return {Promise}
     */
    getGeoLocation():Q.Promise<{}> {
        var deferred = Q.defer();

        //don't return the actual location
        if (!settings.network.useGeoLocation) {
            deferred.resolve(null);
        }
        //already cached?
        else if (settings.network.useGeoLocation && this._location) {
            deferred.resolve(this._location);
        }

        //ask for it
        else {
            navigator.geolocation.getCurrentPosition(
                function success(position:Position) {
                    //caching
                    this._location.lat = position.coords.latitude;
                    this._location.long = position.coords.longitude;

                    deferred.resolve(this._location);
                },
                function error() {
                    deferred.resolve(this._location ? this._location : null);
                },
                { enableHighAccuracy: false }
            );
        }

        return deferred.promise;
    }

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
    getDistanceBetweenTwoLocations(position1:Location, position2:Location):number {

        position2 = position2 || this._location;

        var dLat = this.deg2rad(position2.lat - position2.lat),
            dLon = this.deg2rad(position2.long - position1.long),

            a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(this.deg2rad(position2.lat)) * Math.cos(this.deg2rad(position2.lat))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2),

            c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return this.EARTH_RADIUS * c;
    }
}