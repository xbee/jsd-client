
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
        this.session = {};
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
            var session = new jsd.core.SignalSession(settings.uuid, settings.apiKey);
            return session;
        },

        createPeerConnection : function(peerid) {
            this.session.sendParticipantRequest(peerid);
        },

        getPeerById : function(peerid) {
            if (this.session && this.session.psm)
                return this.session.psm.getPeerByUuid(peerid);
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

        /**
         * Start
         *
         * @method start
         * @chainable
         * @param config Configuration-Object
         * @returns {Object}
         */
        start : function (config) {
            // 1. create session
            this.session = this.createSignalSession();
            // 2. set session callbacks
            // TODO: need to removed to bootstrap.js
            if (this.session) {
                //this.session.on(SignalEvent.CONNECTED, this.session_onConnected.bind(this));
                //this.session.on(SignalEvent.BEFORECONNECT, this.session_onConnecting.bind(this));
                //this.session.on(SignalEvent.BEFOREAUTHENTICATE, this.session_onAuthenticating.bind(this));
                this.session.on(SignalEvent.AUTHENTICATED, this.session_onAuthenticated.bind(this));
                //this.session.on(CMD.OFFER, this.session_onOffer.bind(this));
            }
            // 3. session connect
            // connect to signal server
            this.session.connect();

            return this;
        },

        /**
         * Stop clent
         * @method stop
         * @chainable
         */
        stop : function () {

            this.session.disconnect();
            return this;

        },

        //
        // ----------------- event handlers ----------------------
        //
        // TODO: need to removed to api caller code
        session_onAuthenticated : function (event) {
            logger.log('Signal', 'session_onAuthenticated');
            var self = this;

            function peerlistHandler(e) {
                var response = JSON.parse(e.data);
                if (response.cmd === CMD.LIST) {
                    self.session.socket.removeEventListener('message', peerlistHandler);
                    // received response of auth
                    if (response['data']['success'] && (response['data']['success'] === true)) {
                        if (response['data']['peers']) {
                            var pls = response['data']['peers'];
                            logger.log('Signal', 'peers: ', JSON.stringify(pls));
                            // handle the peer list datas
                            for (x in pls) {
                                $('#target').append($('<option>', {
                                    value: pls[x].id,
                                    text: pls[x].id
                                }));
                            }

                        }
                    }
                }
            }

            this.session.socket.addEventListener('message', peerlistHandler);
            // get the peer list
            this.session.getAllRelatedPeers();
        }
    };




    exports.Client = Client;

})(typeof exports === 'undefined' ? jsd : exports);
