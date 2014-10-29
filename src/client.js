
;(function (exports) {
    var logger = jsd.util.logger;
    var settings = jsd.util.settings;

    function Client() {

        this.settings = jsd.util.settings;
        this.session = {};

        jsd.util.settings.uuid = jsd.util.getUid();
        logger.log('Signal', 'Uuid', jsd.util.settings.uuid);

        try {
            var device = getDeviceCapabilities();

            if (!device.isCompatible) {
                var msg = 'The following features are required but not supported by your browser: ' + device.missingRequirements.join('\n');
                logger.warn('Jiasudu', msg);
                return;
            }

            /**
             * Event-Handler, called when Network state changes
             *
             * @private
             * @method networkConnectivityStateChangeHandler
             * @param {Object} e
             */
            function networkConnectivityStateChangeHandler(e) {
                if (e.type === 'online') {
                    logger.log('Network', 'online!');
                    logger.log('Network', 'try to reconnecting ...');
                    app.start();
                }
                else {
                    logger.warn('Network', 'offline!');
                    app.stop();
                }
            }

            window.addEventListener('offline', networkConnectivityStateChangeHandler);
            window.addEventListener('online', networkConnectivityStateChangeHandler);

        }
        catch (e) {
            logger.warn('Jiasudu', 'Your browser is not supported.');
        }
    }

    /**
     * Simple feature testing of the application requirements
     * as a lot of the used technologies are still working drafts
     * and for from standard
     *
     * @private
     * @method getDeviceCapabilities
     * @return {Object}
     */
    function getDeviceCapabilities() {
        var requirements = [
                { name: 'JSON', test: JSON },
                { name: 'Blob', test: Blob },
                { name: 'localStorage', test: localStorage },
                { name: 'indexedDB', test: indexedDB },
                { name: 'GeoLocation API', test: navigator.geolocation },
                { name: 'WebRTC API', test: (window.mozRTCPeerConnection || window.webkitRTCPeerConnection || RTCPeerConnection) }
                //{ name: 'FileSystem API', test: (navigator.webkitPersistentStorage || window.webkitStorageInfo) }
            ],
            features = [
                { name: 'Object.observe', test: Object.observe }
            ],
            result = {
                isCompatible: false,
                missingFeatures: [],
                missingRequirements: []
            };

        // These are really needed!
        requirements.forEach(function (requirement) {
            if (!requirement.test) result.missingRequirements.push(requirement.name);
        });

        // Those features could be compensated by (polyfills/shims/shivs)
        // if the browser doesn't support them
        features.forEach(function (feature) {
            if (!feature.test) result.missingFeatures.push(feature.name);
        });

        // Finally set a single compatibility flag
        result.isCompatible = result.missingRequirements.length === 0;

        return result;

    }

    Client.prototype.createSignalSession = function () {
        var session = new jsd.core.SignalSession(settings.uuid, settings.apiKey);
        return session;
    };

    Client.prototype.createPeerConnection = function(peerid) {
        this.session.sendParticipantRequest(peerid);
    };

    Client.prototype.getPeerById = function(peerid) {
        if (this.session && this.session.psm)
            return this.session.psm.getPeerByUuid(peerid);
        else
            return null;
    };

    Client.prototype.getDataChannelByPeerId = function(peerid) {
        var peer = this.getPeerById(peerid);
        if (peer) {
            return peer.channel;
        } else {
            return null;
        }
    };

    /**
     * Start
     *
     * @method start
     * @chainable
     * @param config Configuration-Object
     * @returns {Object}
     */
    Client.prototype.start = function (config) {
        // 1. create session
        this.session = this.createSignalSession();
        // 2. session connect
        // connect to signal server
        this.session.connect();

        return this;
    };

    /**
     * Stop clent
     * @method stop
     * @chainable
     */
    Client.prototype.stop = function () {

        this.session.disconnect();
        return this;

    };

    exports.Client = Client;

})(typeof exports === 'undefined' ? jsd : exports);
