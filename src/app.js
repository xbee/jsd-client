
define(["require",
        "exports",
        'module',
        'lodash',
        'q',
        'eventemitter2',
        'node-uuid',
        'observe-js',
        'sockjs'],
function(require, exports, module, _, Q, EventEmitter2, nuuid, SockJS) {

    var logger = console;

    var Uuid = (function () {
        function Uuid() {
        }
        /**
         * Generates an universally unique identifier
         *
         * @method generate
         * @return {String} An Universally unique identifier v4
         * @see http://en.wikipedia.org/wiki/Universally_unique_identifier
         */
        Uuid.generate = function () {
            return nuuid.v4();
        };

        /**
         * Test if a uuid is valid
         *
         * @method isValid
         * @param uuid
         * @returns {boolean}
         */
        Uuid.isValid = function (uuid) {
            return Uuid._format.test(uuid);
        };
        Uuid._format = new RegExp('/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i');
        return Uuid;
    })();

    var SettingModel = (function () {
        //    network:J2T.Network;
        function SettingModel() {
            this.maxPeers = 3;
            this.maxFactories = 4;
            this.maxWorkers = 1;
            this.protocol = 'sctp';
            this.iceServers = [
                {
                    url: 'stun:stun.l.google.com:19302'
                },
                {
                    url: 'stun:stun.turnservers.com:3478'
                }
            ];
            this.signalServers = [
                {
                    host: 'localhost',
                    isSecure: false,
                    port: 3080
                }
            ];
            this.syncInterval = 3600000;
            this.authToken = Uuid.generate();
            this.uuid = Uuid.generate();
        }
        return SettingModel;
    })();

    var Settings = (function () {
        function Settings() {
            this._storeName = 'settings';
            this.settingstore = new SettingModel();
            //Chrome is currently the only one supporting native O_o
            //which would be
            //Object.observe(settingstore, storeSettingsToLocalStorage);
            this._observer = new ObjectObserver(this.settingstore);
            this.settingstore = this.readSettingsFromLocalStorage();
            //        this._observer.open(this.storeSettingsToLocalStorage);
        }
        /**
         * @private
         * @method readSettingsFromLocalStorage
         * @return {Object} Settings
         */
        Settings.prototype.readSettingsFromLocalStorage = function () {
            //        if(typeof(window.localStorage) != 'undefined') {
            //            var data: any;
            //            data = localStorage.getItem (this._storeName);
            //            return JSON.parse(data);
            //        } else{
            //            return {};
            //        }
        };

        /**
         * @private
         * @method storeSettingsToLocalStorage
         */
        Settings.prototype.storeSettingsToLocalStorage = function () {
            //        if(typeof(window.localStorage) != 'undefined') {
            //            window.localStorage.setItem(this._storeName, JSON.stringify(this.settingstore));
            //        }
        };
        return Settings;
    })();
//    exports.Settings = Settings;
    var settingobj = new Settings();
    var settings = settingobj.settingstore;
//    exports.settings = settings;

    var SignalSession = function(config) {
        this.id = 0;
        this.socket = null;
        this.isConnected = false;
        this.localIPs = undefined;
        this._ee = new EventEmitter2({
            wildcard: true, // should the event emitter use wildcards.
            delimiter: ':', // the delimiter used to segment namespaces, defaults to `.`.
            newListener: false, // if you want to emit the newListener event set to true.
            maxListeners: 10 // the max number of listeners that can be assigned to an event, defaults to 10.
        });
        this.emit = this._ee.emit;
        this.on = this._ee.on;
        this.off = this._ee.removeListener;
        this.onAny = this._ee.onAny;
        this.offAny = this._ee.offAny;
        this.removeAllListeners = this._ee.removeAllListeners;

        /*
         *  get all of local ip address
         */
        this.enumLocalIPs = function (cb) {
            var x = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
            if (!x)
                return false;
            var addrs = Object.create(null);
            addrs['0.0.0.0'] = false;
            var addAddress = function (newAddr) {
                if (newAddr in addrs)
                    return;
                addrs[newAddr] = true;
                cb(newAddr);
            };
            var grepSDP = function (sdp) {
                sdp.split('\r\n').forEach(function (line) {
                    if (~line.indexOf('a=candidate')) {
                        var parts = line.split(' '), addr = parts[4], type = parts[7];
                        if (type === 'host')
                            addAddress(addr);
                    } else if (~line.indexOf('c=')) {
                        var parts = line.split(' '), addr = parts[2];
                        addAddress(addr);
                    }
                });
            };

            // typescript do not support polyfill
            //    var rtc = new RTCPeerConnection({iceServers: []});
            var rtc;
            if (window.mozRTCPeerConnection) {
                rtc = new mozRTCPeerConnection({ iceServers: [] });
                rtc.createDataChannel('', { reliable: false });
            } else if (window.webkitRTCPeerConnection) {
                rtc = new webkitRTCPeerConnection({ iceServers: [] });
            }
            rtc.onicecandidate = function (evt) {
                if (evt.candidate)
                    grepSDP(evt.candidate.candidate);
            };
            setTimeout(function () {
                rtc.createOffer(function (offerDesc) {
                    grepSDP(offerDesc.sdp);
                    rtc.setLocalDescription(offerDesc);
                }, function (e) {
                });
            }, 50);
            return true;
        };

        /**
         * @method connect
         * @return {Promise}
         */
        this.connect = function () {
            var self = this;
            var logger = console;
            var deferred = Q.defer();

            try  {
                var url = (this.isSecure ? 'https' : 'http') + '://' + this.host + ':' + this.port;
                this.socket = new SockJS(url, null, { debug: true, devel: true });
                this.url = url;

                //add listeners
                this.socket.onmessage = this.messageHandler;
                this.socket.onopen = function (ev) {
                    logger.log('Server ' + self.id, self.url, 'connected');
                    self.isConnected = true;
                    deferred.resolve(null);
                };

                this.socket.addEventListener('error', function (e) {
                    self.disconnect();
                    logger.log('Server ' + self.id, self.url, 'error');
                });

                this.socket.onclose = function (e) {
                    self.disconnect();
                    logger.log('Server ' + self.id, self.url, 'disconnected', e.code + ' : ' + e.reason);

                    switch (e.code) {
                        case 1011:
                            logger.log('Server ' + self.id, self.url, 'is idle! Please restart it.');
                            break;
                    }
                };
            } catch (e) {
                deferred.reject(null);
                self.disconnect();
            }

            return deferred.promise;
        };

        this.disconnect = function () {
            this.socket = null;
            this.isConnected = false;
            return this;
        };

        this.send = function (cmd, data, waitForResponse) {
            var self = this, deferred = Q.defer();

            if (!this.isConnected) {
                deferred.reject('Not connected to server!');
                return deferred.promise;
            }

            if (!data || !_.isObject(data) || _.isEmpty(data)) {
                deferred.reject('Data is not an object/empty!');
                return deferred.promise;
            }

            if (!cmd) {
                deferred.reject('Command is not defined!');
                return deferred.promise;
            }

            //add cmd to data
            data.cmd = cmd;

            //add auth token
            data.authToken = settings.authToken;

            //send data to websocket as String
            this.socket.send(JSON.stringify(data));

            // If we need to wait for the answer
            if (waitForResponse) {
                function responseHandler(e) {
                    var response = JSON.parse(e.data);
                    if (response.cmd === cmd) {
                        self.socket.removeEventListener('message', responseHandler);
                        deferred.resolve(response.data);
                    }
                }

                this.socket.addEventListener('message', responseHandler);
                // No need to wait
            } else {
                deferred.resolve(null);
            }

            return deferred.promise;
        };

        this.sendAuthentication = function () {
            return this.send('peer:auth', { apiKey: settings.projectUuid, ips: this.localIPs }, true);
        };

        this.sendPeerOffer = function (targetPeerUuid, offer) {
            return this.send('peer:offer', { uuid: settings.uuid, targetPeerUuid: targetPeerUuid, offer: offer, ips: location }, false);
            //        return geo.getGeoLocation()
            //            .then(function (location) {
            //
            //            });
        };

        this.sendPeerAnswer = function (targetPeerUuid, answer) {
            return this.send('peer:answer', { uuid: settings.uuid, targetPeerUuid: targetPeerUuid, answer: answer }, false);
        };

        this.sendPeerCandidate = function (targetPeerUuid, candidate) {
            return this.send('peer:candidate', { uuid: settings.uuid, targetPeerUuid: targetPeerUuid, candidate: candidate }, false);
        };

        this.getAllRelatedPeers = function () {
            return this.send('peer:list', { projectUuid: settings.uuid }, true);
        };

        this.messageHandler = function (e) {
            var self = this;
            var data = JSON.parse(e.data), cmd = data.cmd;

            console.log('Server ' + this.id, 'Received', data);

            switch (cmd.toLowerCase()) {
                case 'peer:offer':
                    this.emit('peer:offer', { nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, offer: data.data.offer, location: data.data.location });
                    break;
                case 'peer:answer':
                    this.emit('peer:answer', { nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, answer: data.data.answer });
                    break;
                case 'peer:candidate':
                    this.emit('peer:candidate', { nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, candidate: data.data.candidate });
                    break;
            }
        };

        this.serialize = function () {
            return {
                host: this.host,
                isSecure: this.isSecure,
                port: this.port
            };
        };

        this.enumLocalIPs(function (datas) {
            this.localIPs = datas;
        });

        // public methods or fields
        return {
            // public fields
            localIPs: [1, 3, 4],
            // public methods
            connect: this.connect,
            disconnect: this.disconnect,
            send: this.send,
            sendAuthentication: this.sendAuthentication,
            sendPeerOffer: this.sendPeerOffer,
            sendPeerAnswer: this.sendPeerAnswer,
            sendPeerCandidate: this.sendPeerCandidate,
            serialize: this.serialize,
            enumLocalIPs: this.enumLocalIPs
        }

    };
    exports.SignalSession = SignalSession;

    var TIMEOUT_WAIT_TIME = 10000, QUEUE_RETRY_TIME = 75, ICE_SERVER_SETTINGS = {
        iceServers: [
            {
                url: 'stun:stun.l.google.com:19302'
            },
            {
                url: 'stun:stun.turnservers.com:3478'
            }
        ]
    };

    var connectionConstraint = {
        optional: [
            { RtpDataChannels: true },
            { DtlsSrtpKeyAgreement: true }
        ],
        mandatory: {
            OfferToReceiveAudio: false,
            OfferToReceiveVideo: false
        }
    };

    var channelConstraint;

    var PeerSession = (function () {

        function PeerSession(server, config) {
            this._self = this;
            /**
             * @property connection
             * @type {RTCPeerCpnnection}
             */
            this.connection = undefined;
            /**
             * @property channel
             * @type {RTCDataChannel}
             */
            this.channel = undefined;
            /**
             * Indicates if there is a stable conenction to this peer
             * @property isConnected
             * @default false
             * @type {Boolean}
             */
            this.isConnected = false;
            /**
             * Whether this peer is the initiator of a connection
             * @property isSource
             * @default false
             * @type {Boolean}
             */
            this.isSource = false;
            /**
             * Whether this peer is the initiator of a connection
             * @property isTarget
             * @default false
             * @type {Boolean}
             */
            this.isTarget = false;
            /**
             * List of timers for synchronization
             * @type {Array}
             */
            this.syncTimers = [];
            //    onAny: (fn: Function) => events.EventEmitter;
            //    offAny: (fn: Function) => events.EventEmitter;
            //    removeAllListeners: (type: string[]) => events.EventEmitter;
//            this._ee = new events.EventEmitter();
            var _self = this;

            this.id = config.id;
            if (server)
                this.server = server;

            this._ee = new EventEmitter2({
                wildcard: true, // should the event emitter use wildcards.
                delimiter: ':', // the delimiter used to segment namespaces, defaults to `.`.
                newListener: false, // if you want to emit the newListener event set to true.
                maxListeners: 10 // the max number of listeners that can be assigned to an event, defaults to 10.
            });

            this.on = this._ee.on;
            this.off = this._ee.removeListener;
            this.onAny = this._ee.onAny;
            this.offAny = this._ee.offAny;
            this.emit = this._ee.emit;

            // Protocol switch SRTP(=default) or SCTP
            if (settings.protocol.toLowerCase() === 'sctp') {
                this.protocol = 'sctp';
                logger.log('Peer ' + _self.id, 'Using SCTP');

                connectionConstraint = {
                    optional: [
                        { RtpDataChannels: false },
                        { DtlsSrtpKeyAgreement: true }
                    ],
                    mandatory: {
                        OfferToReceiveAudio: false,
                        OfferToReceiveVideo: false
                    }
                };

                channelConstraint = {
                    reliable: false,
                    maxRetransmits: 0
                };
            } else {
                this.protocol = 'srtp';
                logger.log('Peer ' + _self.id, 'Using SRTP');
            }
        }
        /**
         * @private
         * @method timerCompleteHandler
         */
        PeerSession.prototype.timerCompleteHandler = function (e) {
            var _self = this;
            if (!this.isConnected) {
                this.timeout = Date.now();
                this.emit('peer:timeout', _self);
            } else
                this.timeout = undefined;
        };

        /* Event Handler Start */
        PeerSession.prototype.iceCandidateHandler = function (e) {
            //II. The handler is called when network candidates become available.
            if (!e || !e.candidate)
                return;

            // III. In the handler, Alice sends stringified candidate data to Eve, via their signaling channel.
            this.server.sendPeerCandidate(this.uuid, e.candidate);
        };

        PeerSession.prototype.dataChannelHandler = function (e) {
            var _self = this;
            logger.log('Peer ' + _self.id, 'Received remote DataChannel');

            _self.channel = e.channel;

            _self.channel.onclose = this.channel_CloseHandler;
            _self.channel.onerror = this.channel_ErrorHandler;
            _self.channel.onmessage = this.channel_MessageHandler;
            _self.channel.onopen = this.channel_OpenHandler;
        };

        PeerSession.prototype.iceConnectionStateChangeHandler = function (e) {
            var _self = this;

            // Everything is fine
            if (_self.connection.iceConnectionState === 'connected' && _self.connection.iceGatheringState === 'complete') {
                logger.log('Peer ' + _self.id, 'Connection established');
            } else if (_self.connection.iceConnectionState === 'disconnected') {
                logger.log('Peer ' + _self.id, 'Connection closed');

                _self.isConnected = false;
                _self.emit('peer:disconnect', _self);
            }
        };

        PeerSession.prototype.negotiationNeededHandler = function (e) {
            var _self = this;
            logger.log('Peer ' + _self.id, 'Negotiation needed');

            //2. Alice creates an offer (an SDP session description) with the RTCPeerConnection createOffer() method.
            _self.connection.createOffer(function (sessionDescription) {
                //3. Alice calls setLocalDescription() with his offer.)
                _self.connection.setLocalDescription(sessionDescription);

                //4. Alice stringifies the offer and uses a signaling mechanism to send it to Eve.
                _self.server.sendPeerOffer(_self.uuid, sessionDescription);
            }, function (err) {
                logger.error('Peer ' + _self.id, err, 'Was using', _self.protocol, 'protocol.');
            }, connectionConstraint);
        };

        PeerSession.prototype.signalingStateChangeHandler = function (e) {
        };

        PeerSession.prototype.channel_ErrorHandler = function (e) {
            var _self = this;
            logger.log('Peer ' + _self.id, 'Channel has an error', e);
        };

        PeerSession.prototype.channel_MessageHandler = function (e) {
            var msg;
            var _self = this;

            _self.isConnected = true;

            if (e.data instanceof Blob) {
                msg = { blob: e.data };
            } else {
                try  {
                    msg = JSON.parse(e.data);
                } catch (err) {
                    logger.error('Peer ' + _self.id, 'Error parsing msg:', e.data);
                }
            }

            _self.emit('peer:message', _.extend(msg, { target: _self }));
        };

        PeerSession.prototype.channel_OpenHandler = function (e) {
            var _self = this;
            logger.log('Peer ' + _self.id, 'DataChannel is open');

            _self.isConnected = true;
            _self.emit('peer:connect', _self);
        };

        PeerSession.prototype.channel_CloseHandler = function (e) {
            var _self = this;
            logger.log('Peer ' + _self.id, 'DataChannel is closed', e);
            _self.isConnected = false;
            _self.emit('peer:disconnect', _self);
        };

        /* Event Handler END */
        /**
         * Create a WebRTC-Connection
         *
         * @method createConnection
         * @return {Promise}
         */
        PeerSession.prototype.createConnection = function () {
            var _self = this;
            var deferred = Q.defer;
            this.isSource = true;
            this.isTarget = false;

            logger.log('Peer ' + _self.id, 'Creating connection');

            //1.Alice creates an RTCPeerConnection object.
            _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);

            //I. Alice creates an RTCPeerConnection object with an onicecandidate handler.
            //Add listeners to connection
            _self.connection.ondatachannel = this.dataChannelHandler;
            _self.connection.onicecandidate = this.iceCandidateHandler;
            _self.connection.oniceconnectionstatechange = this.iceConnectionStateChangeHandler;
            _self.connection.onnegotiationneeded = this.negotiationNeededHandler;
            _self.connection.onsignalingstatechange = this.signalingStateChangeHandler;

            // Start timeout countdown
            _.delay(this.timerCompleteHandler, TIMEOUT_WAIT_TIME);

            try  {
                // Create  data-channel
                _self.channel = _self.connection.createDataChannel('Jiasudu', channelConstraint);
            } catch (e) {
                // If an error occured here, there is a problem about the connection,
                // so lets do a timeout and maybe retry later
                this.isConnected = false;
                this.timerCompleteHandler(null);
                deferred.reject();
            }

            // Add listeners to channel
            _self.channel.onclose = this.channel_CloseHandler;
            _self.channel.onerror = this.channel_ErrorHandler;
            _self.channel.onmessage = this.channel_MessageHandler;
            _self.channel.onopen = this.channel_OpenHandler;
            return deferred.promise;
        };

        /**
         * @method answerOffer
         * @param data
         * @return {Promise}
         */
        PeerSession.prototype.answerOffer = function (data) {
            var _self = this;
            var uuid = this.uuid;
            var deferred = Q.defer;
            var signal = this.server;

            _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);
            _self.connection.ondatachannel = this.dataChannelHandler;
            _self.connection.onicecandidate = this.iceCandidateHandler;
            _self.connection.oniceconnectionstatechange = this.iceConnectionStateChangeHandler;
            _self.connection.onnegotiationneeded = this.negotiationNeededHandler;
            _self.connection.onsignalingstatechange = this.signalingStateChangeHandler;

            this.connection = _self.connection;

            //5. Eve calls setRemoteDescription() with Alice's offer, so that her RTCPeerConnection knows about Alice's setup.
            _self.connection.setRemoteDescription(new RTCSessionDescription(data.offer), function () {
                //6. Eve calls createAnswer(), and the success callback for this is passed a local session description: Eve's answer.
                _self.connection.createAnswer(function (sessionDescription) {
                    //7. Eve sets her answer as the local description by calling setLocalDescription().
                    _self.connection.setLocalDescription(sessionDescription);

                    //8. Eve then uses the signaling mechanism to send her stringified answer back to Alice.
                    signal.sendPeerAnswer(uuid, sessionDescription);
                }, function (err) {
                    logger.log(err);
                }, connectionConstraint);
            });

            return deferred.promise;
        };

        /**
         * Accept a WebRTC-Connection
         *
         * @method acceptConnection
         * @param data
         */
        PeerSession.prototype.acceptConnection = function (data) {
            var _self = this;
            this.isTarget = true;
            this.isSource = false;

            //9. Alice sets Eve's answer as the remote session description using setRemoteDescription().
            _self.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
        };

        /**
         * Add candidate info to connection
         * @method addCandidate
         * @param data
         */
        PeerSession.prototype.addCandidate = function (data) {
            var _self = this;
            _self.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
        };

        /**
         * Send data via a WebRTC-Channel to a peer
         *
         * @method send
         * @param data
         * @param {Boolean} reliable Should a retry occur if the transmission fails?
         */
        PeerSession.prototype.send = function (data, reliable) {
            if (typeof reliable === "undefined") { reliable = false; }
            var _self = this;

            var jsonString;

            if (!_self.isConnected || _self.channel.readyState !== 'open') {
                logger.error('Peer ' + _self.id, 'Attempt to send, but channel is not open!');
                return;
            }

            // Actually it should be possible to send a blob, but it isn't
            // https://code.google.com/p/webrtc/issues/detail?id=2276
            if (data instanceof Blob) {
                _self.channel.send(data);
            } else {
                try  {
                    jsonString = JSON.stringify(data);
                } catch (e) {
                    // We won't retry as this always will fail
                }
                try  {
                    _self.channel.send(jsonString);
                } catch (e) {
                    if (reliable) {
                        logger.error('Peer ' + _self.id, 'Error while sending reliable msg, queuing data');

                        // Retry again
                        _.delay(_self.send, QUEUE_RETRY_TIME, data);
                    }
                }
            }
        };

        PeerSession.prototype.sendFile = function (uuid, chunk, pos) {
            pos = pos || 0;

            // Send as blob, wrapped with info
            if (chunk instanceof Blob) {
                this.send({ type: 'file:push:start', uuid: uuid, pos: pos });
                this.send(chunk);
                this.send({ type: 'file:push:end', uuid: uuid });
            } else {
                this.send({ type: 'file:push', uuid: uuid, chunk: chunk, pos: pos });
            }
        };

        /**
         * @method serialize
         * @return {Object}
         */
        PeerSession.prototype.serialize = function () {
            return {
                uuid: this.uuid,
                server: this.server
            };
        };

        /**
         * @method broadcast
         */
        PeerSession.prototype.broadcast = function (type, data) {
            var _self = this;

            // Add broadcast prefix?
            if (type.indexOf('broadcast:') < 0) {
                type = 'broadcast:' + type;
            }

            _self.send({ type: type, data: data });
        };

        /**
         * @method disconnect
         */
        PeerSession.prototype.disconnect = function () {
            var _self = this;
            _self.isConnected = false;
            _self.channel.close();
            _self.connection.close();
        };
        return PeerSession;
    })();
    exports.PeerSession = PeerSession;

    var TIMEOUT_RETRY_TIME = 60000;
    var MAX_RANDOM_ASSESSMENT_DELAY_TIME = 150;

    var PeerSessionManager = (function () {
        function PeerSessionManager() {
            this._peers = [];
        }
        /**
         * @method add
         * @param peer
         */
        PeerSessionManager.prototype.add = function (peer) {
            if (!this.getPeerByUuid(peer.uuid)) {
                this._peers.push(peer);
            }
        };

        /**
         * @method connect
         * @param {Array} [peers]
         * @return {Promise}
         */
        PeerSessionManager.prototype.connect = function (peers) {
            if (typeof peers === "undefined") { peers = this._peers; }
            var promises = [];

            _.each(peers, function (peer) {
                // Never connect to null or self
                if (!peer || peer.uuid === settings.uuid)
                    return;

                // No need to connect if already connected
                if (!peer.isConnected) {
                    promises.push(peer.createConnection());
                }
            });

            return Q.all(promises);
        };

        /**
         * @method connectToNeighbourPeers
         * @return {Promise}
         */
        PeerSessionManager.prototype.connectToNeighbourPeers = function () {
            return this.connect(this.getNeighbourPeers());
        };

        /**
         * @method getPeerByUuid
         * @param {String} uuid
         * @returns {Peer}
         */
        PeerSessionManager.prototype.getPeerByUuid = function (uuid) {
            return _.find(this._peers, function (peer) {
                return peer.uuid === uuid;
            });
        };

        /**
         * @method getNeighbourPeers
         * @return {Array}
         */
        PeerSessionManager.prototype.getNeighbourPeers = function () {
            // Assuming they are already sorted in a specific way
            // e.g. geolocation-distance
            // Remove all peers that had a timeout shortly
            var peers = this._peers.filter(function (peer) {
                // Timeout at all? && Timeout was long ago
                return !peer.timeout || peer.timeout + TIMEOUT_RETRY_TIME < Date.now();
            });

            return peers.slice(0, settings.maxPeers || 2);
        };

        /**
         * Get all known Peers Uuids as an array
         *
         * @method getPeerUuidsAsArray
         * @return {Array}
         */
        PeerSessionManager.prototype.getPeerUuidsAsArray = function () {
            return _.map(this._peers, function (peer) {
                return peer.uuid;
            });
        };

        /**
         * Broadcast data to peers using a RAD--time.
         * Will exclude originPeerUuid from receivers if passed.
         *
         * @method broadcast
         * @param type
         * @param data
         * @param {String} [originPeerUuid]
         * @param {Boolean} reliable
         */
        PeerSessionManager.prototype.broadcast = function (type, data, originPeerUuid, reliable) {
            if (typeof reliable === "undefined") { reliable = false; }
            var peers = this.getConnectedPeers();

            // Remove own uuid from list and
            // the peer we received the message from
            peers = _.reject(peers, function (peer) {
                return peer.uuid === settings.uuid || peer.uuid === originPeerUuid;
            });

            // Nobody to broadcast to
            if (peers.length === 0) {
                return;
            }

            if (!originPeerUuid) {
                //logger.log('Peers', 'Broadcasting', type, 'to', peers.length, 'peer(s)');
                data.timestamp = Date.now();
            } else {
                //logger.log('Peers', 'Rebroadcasting', type, 'to', peers.length, 'peer(s)');
            }

            // Broadcast to all connected peers
            peers.forEach(function (peer) {
                // Get a RAD before broadcasting
                var rad = Math.random() * MAX_RANDOM_ASSESSMENT_DELAY_TIME;
                _.delay(peer.broadcast, rad, type, data, reliable);
            });
        };

        /**
         * @method update
         * @param {Object} peerData
         */
        PeerSessionManager.prototype.update = function (peerData) {
            // Multidimensional array form multiple nodes needs to be flattened
            peerData = _.flatten(peerData);

            peerData.forEach(function (data) {
                //make sure it's not self
                if (data.uuid === settings.uuid)
                    return;

                //already got this one?
                var peer = this.getPeerByUuid(data.uuid);

                //already got this peer?
                if (peer) {
                    //only add the node uuid
                    peer.addNodes(data.nodes);
                    return;
                }

                // Local id for debugging
                data.id = this._peers.length + 1;

                // Save as new peer
                peer = new PeerSession(this.server, data);
                this.add(peer);

                // Pass-through events
                peer.onAny(function (e) {
                    this.emit(this.event, e);
                });
                // Calculate geolocation distance
                //            peer.distance = geolocation.getDistanceBetweenTwoLocations(peer.location);
            });
            // Sort peers by their geolocation-distance
            //        this._peers = _.sortBy(this._peers, function (peer) {
            //            return peer.distance;
            //        });
            // Update public list
            //        this.list = _peers;
        };

        /**
         * Get a list of all peers to which there is an active connection.
         *
         * @method getConnectedPeers
         *
         * @return {Array}
         */
        PeerSessionManager.prototype.getConnectedPeers = function () {
            return _.where(this._peers, { isConnected: true });
        };
        return PeerSessionManager;
    })();

    exports.PeerSessionManager = PeerSessionManager;

    var App = (function() {
        function App(el) {
            this.el = el;
            this.id = Uuid.generate();
        }

        App.prototype.render = function() {
            this.el.html('require.js up and running');
        };

        App.prototype.id = function() {

        }

        return App
    })();
    exports.App = App;

    return module.exports;
});
