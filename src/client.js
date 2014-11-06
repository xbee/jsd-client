
;(function (exports) {
    var logger = jsd.util.logger;
    var settings = jsd.util.settings;

    function FileInfo() {
        this.chunkRead = 0; // current readed chunks
        this.hasEntireFile = false;
        this.numOfChunksInFile = 0;
    };

    function Client() {

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

        this.settings = jsd.util.settings;
        this.signaler = {};
        this.files = [];
        // key: filename, value: fileinfo obj
        this.fileInfos = {};

        this.clientId = jsd.util.settings.uuid = jsd.util.getUid();
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

    Client.prototype = {
        fileBufferReader : new jsd.data.FileBufferReader(),

        createSignalSession : function () {
            var signaler = new jsd.core.SignalSession(settings.uuid, settings.apiKey);
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

        prepareToReadFile:function (fileName, fileSize) {
            this.originator = true;
            this.statsCalculator = new jsd.stats.StatsCalculator(fileSize, fileName, '');
            jsd.data.BlockCache.add(fileName, new jsd.datastructure.BlockMap(fileSize, fileName));
            var blockMap = jsd.data.BlockCache.get(fileName);
            this.fileInfos[fileName] = new FileInfo();
//            blockMap.addMetadata({name:fileName});
//            if (jsd.config.USE_FS) {
//                jsd.data.FSio.createResource(fileName,function(succ) {
//                    if (succ) {
//                        blockMap.fs = true;
//                    } else {
//                        blockMap.fs = false;
//                    }
//                });
//            }
        },

        addChunks : function(fileName, binarySlice, cb) {
            var blockMap = jsd.data.BlockCache.get(fileName);
            var numOfChunksInSlice = Math.ceil(binarySlice.byteLength / jsd.config.CHUNK_SIZE);
            var fileInfo = this.fileInfos[fileName];
            for (var i = 0; i < numOfChunksInSlice; i++) {
                var start = i * jsd.config.CHUNK_SIZE;
                var newChunk = new Uint8Array(binarySlice.slice(start, Math.min(start + jsd.config.CHUNK_SIZE, binarySlice.byteLength)));
                var blockId = blockMap.setChunk(fileInfo.chunkRead, newChunk);
                blockMap.verifyBlock(blockId);
                radio('chunkAddedToBlockMap').broadcast();
                fileInfo.chunkRead++;
            }
            //if (this.chunkRead == this.numOfChunksInFile) {
            //    this.hasEntireFile = true;
            //}
            if (jsd.config.USE_FS)
                jsd.data.FSio.notifyFinishWrite(cb);
            else
                cb()
        },

        setOptions : function(options) {
            if (this.signaler && options) {
                options.signaler_onConnected        &&
                    this.signaler.on(SignalEvent.CONNECTED, options.signaler_onConnected.bind(this));
                options.signaler_onConnecting       &&
                    this.signaler.on(SignalEvent.BEFORECONNECT, options.signaler_onConnecting.bind(this));
                options.signaler_onAuthenticating   &&
                    this.signaler.on(SignalEvent.BEFOREAUTHENTICATE, options.signaler_onAuthenticating.bind(this));
                options.signaler_onAuthenticated    &&
                    this.signaler.on(SignalEvent.AUTHENTICATED, options.signaler_onAuthenticated.bind(this));
                options.signaler_onOffer            &&
                    this.signaler.on(CMD.OFFER, options.signaler_onOffer.bind(this));
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
            // TODO: need to removed to bootstrap.js
            this.setOptions(config);
            //if (this.signaler) {
            //    //this.signaler.on(SignalEvent.CONNECTED, this.signaler_onConnected.bind(this));
            //    //this.signaler.on(SignalEvent.BEFORECONNECT, this.signaler_onConnecting.bind(this));
            //    //this.signaler.on(SignalEvent.BEFOREAUTHENTICATE, this.signaler_onAuthenticating.bind(this));
            //    this.signaler.on(SignalEvent.AUTHENTICATED, this.signaler_onAuthenticated.bind(this));
            //    //this.signaler.on(CMD.OFFER, this.signaler_onOffer.bind(this));
            //}
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

    };




    exports.Client = Client;

})(typeof exports === 'undefined' ? jsd : exports);
