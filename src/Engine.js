
(function() {
    /**
     * Simple feature testing of the application requirements
     * as a lot of the used technologies are still working drafts
     * and for from standard
     *
     * @private
     * @method getDeviceCapabilities
     * @return {Object}
     */
    J.Util.getDeviceCapabilities = function() {
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
})();

J.FileInfo = J.Evented.extend({

    initialize: function() {
        this.chunkRead = 0; // current readed chunks
        this.hasEntireFile = false;
        this.numOfChunksInFile = 0;
    }
});

J.Engine = J.Evented.extend({

    logger : J.logger,
    settings : J.settings,

    initialize: function(sandbox) {

        this.pendingSwarms = [];
        this.clientId;
        //this.initiateClient();
        //this.registerEvents();
        this.chunkRead = 0;
        this.BW_INTERVAL = 500;
        this.lastDownCycleTime = Date.now();
        this.lastUpCycleTime;
        this.totalUpSinceLastCycle = 0;
        this.lastCycleUpdateSizeInBytes = 0;
        this.firstTime = true;
        this.startTime;
        this.totalAvarageBw;
        this.lastReportTime = 0;
        this.lastStatCalcTime = 0;
        this.statsCalculator = null;
        //peer5.setLogLevel(peer5.config.LOG_LEVEL);

        //monitor the sendQueues
        this.cron_interval_id = window.setInterval(this.cron, jsd.config.MONITOR_INTERVAL, this);

        this.settings = J.settings;
        this.signaler = {};
        this.files = [];
        // key: filename, value: fileinfo obj
        this.fileInfos = {};

        this.clientId = J.settings.uuid = jsd.util.getUid();
        logger.log('Signal', 'Uuid', J.settings.uuid);

        try {
            var device = J.Util.getDeviceCapabilities();

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
    },

    createSignalSession : function () {
        var signaler = new J.Signaler(J.settings.uuid, J.settings.apiKey);
        return signaler;
    },

    createPeerConnection : function(peerid) {
        this.signaler.sendParticipantRequest(peerid);
    },

    getPeerById : function(peerid) {
        if (this.signaler && this.signaler.psm)
            return this.signaler.psm.getPeerByUuid(peerid);
        else
            return null;
    },

    getDataChannelByPeerId : function(peerid) {
        var peer = this.getPeerById(peerid);
        if (peer) {
            return peer.channel;
        } else {
            return null;
        }
    },

    setOptions : function(options) {
        if (this.signaler && options) {
            options.signaler_onConnected        &&
            this.signaler.on(J.SignalEvent.CONNECTED, options.signaler_onConnected.bind(this));
            options.signaler_onConnecting       &&
            this.signaler.on(J.SignalEvent.BEFORECONNECT, options.signaler_onConnecting.bind(this));
            options.signaler_onAuthenticating   &&
            this.signaler.on(J.SignalEvent.BEFOREAUTHENTICATE, options.signaler_onAuthenticating.bind(this));
            options.signaler_onAuthenticated    &&
            this.signaler.on(J.SignalEvent.AUTHENTICATED, options.signaler_onAuthenticated.bind(this));
            options.signaler_onOffer            &&
            this.signaler.on(J.CMD.OFFER, options.signaler_onOffer.bind(this));
        }
    },

    /**
     * Start
     *
     * @method start
     * @chainable
     * @param config Configuration-Object
     * @returns {Object}
     */
    start : function (config) {
        // 1. create signaler
        this.signaler = this.createSignalSession();
        // 2. set signaler callbacks
        this.setOptions(config);
        // 3. signaler connect
        // connect to signal server
        this.signaler.connect();

        return this;
    },

    /**
     * Stop clent
     * @method stop
     * @chainable
     */
    stop : function () {

        this.signaler.disconnect();
        return this;

    }
});


