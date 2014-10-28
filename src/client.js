
;(function (exports) {
    var logger = jsd.util.logger;
    var settings = jsd.util.settings;

    function App() {

        this.settings = jsd.util.settings;
        this.session = {};
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

    App.prototype.session_onConnected = function (event) {
        //var id = this.session.id;
        logger.log('Signal', 'Server ' + this.session.uuid, this.session.url, 'connected');
        logger.log('Signal', 'session_onConnected');
        //this.session.authenticate();
    };

    App.prototype.session_onConnecting = function (event) {
        logger.log('Signal', 'session_onConnecting');
    };

    App.prototype.session_onAuthenticating = function (event) {
        logger.log('Signal', 'session_onAuthenticating');
    };

    App.prototype.session_onAuthenticated = function (event) {
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
                        // handle the peer list datas
                        logger.log('Signal', 'peers: ', JSON.stringify(pls));
                    }
                }
            }
        }

        this.session.socket.addEventListener('message', peerlistHandler);
        // get the peer list
        this.session.getAllRelatedPeers();
    };

    App.prototype.session_onOffer = function(event) {
        logger.log('Peer '+this.settings.uuid, 'Received offer, need to answer', event);
        // add peer to peers
        //event.from
//      this.session.peers.add(peer);
        var peer = this.session.peers.getPeerByUuid(event.to);
        if (!peer) {
            // does not exists, so we add it
            peer = this.session.createPeer(event.to);
            peer.isSource = false;
            peer.isTarget = true;
            this.session.peers.add(peer);
        }

        if (!peer) {
            logger.log('Peer '+this.settings.uuid, 'Create PeerSession failed.');
            return;
        }
        peer.answerOffer(event);
    };

    App.prototype.createSignalSession = function () {
        var session = new jsd.core.SignalSession(settings.uuid, settings.apiKey);
        return session;
    };

    App.prototype.createPeerConnection = function(peerid) {
        this.session.sendParticipantRequest(peerid);
    };

    App.prototype.init = function () {
        jsd.util.settings.uuid = jsd.util.getUid();
        logger.log('Signal', 'Uuid', jsd.util.settings.uuid);

        try {
            var device = getDeviceCapabilities();

            if (!device.isCompatible) {
                var msg = 'The following features are required but not supported by your browser: ' + device.missingRequirements.join('\n');
                logger.warn('Jiasudu', msg);
                return;
            }
        }
        catch (e) {
            logger.warn('Jiasudu', 'Your browser is not supported.');
        }

        return this;
    };

    /**
     * Start
     *
     * @method start
     * @chainable
     * @param config Configuration-Object
     * @returns {Object}
     */
    App.prototype.start = function (config) {
        // 1. create session
        this.session = this.createSignalSession();
        // 2. set session callbacks
        if (this.session) {
            this.session.on(SignalEvent.CONNECTED, this.session_onConnected.bind(this));
            this.session.on(SignalEvent.BEFORECONNECT, this.session_onConnecting.bind(this));
            this.session.on(SignalEvent.BEFOREAUTHENTICATE, this.session_onAuthenticating.bind(this));
            this.session.on(SignalEvent.AUTHENTICATED, this.session_onAuthenticated.bind(this));
            //this.session.on(CMD.OFFER, this.session_onOffer.bind(this));
        }
        // 3. session connect
        // connect to signal server
        this.session.connect();

        return this;
    };

    /**
     * Stop muskepeer
     * @method stop
     * @chainable
     */
    App.prototype.stop = function () {

        this.session.disconnect();
        return this;

    };

    exports.App = App;

})(typeof exports === 'undefined' ? jsd : exports);
