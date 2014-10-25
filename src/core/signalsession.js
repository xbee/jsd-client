
CMD = {};
CMD.AUTH = 'signal:auth';
CMD.LIST = 'peer:list';
CMD.PARTICIPANT = 'peer:participant';
CMD.OFFER = 'peer:offer';
CMD.ANSWER = 'peer:answer';
CMD.SDP = 'peer:sdp'; // include offer and answer
CMD.CANDIDATE = 'peer:candidate';


SignalEvent = {};
SignalEvent.CONNECTED = 'signal:onenterconnected';
SignalEvent.DETECTED = 'signal:onenterdetected';
SignalEvent.DISCONNECTED = 'signal:onenterdisconnected';
SignalEvent.AUTHENTICATED = 'signal:onenterauthenticated';
SignalEvent.BEFORECONNECT = 'signal:onbeforeconnect';
SignalEvent.BEFOREAUTHENTICATE = 'signal:onbeforeauthenticate';
//  SignalEvent.CONNECTING = 'signal:connecting';
//  SignalEvent.AUTHENTICATING = 'signal:authenticating';
SignalEvent.ERROR = 'signal:error';

;(function (exports) {

    var settings = jsd.util.settings;
    var logger = jsd.util.logger;

    function SignalSession() {
        var _self = this;
        this.host = settings.signalServer.host;
        this.port = settings.signalServer.port;
        this.isSecure = settings.signalServer.isSecure;
        this.uuid = settings.uuid;
        this.socket = null;
        //this.isConnected = false;
        this.localIPs = [];
        this.peers = null;
        this.psm = null;
        this.fileBufferReader = new FileBufferReader();

        this.emitter = new EventEmitter2({
            wildcard: true, // should the event emitter use wildcards.
            delimiter: ':', // the delimiter used to segment namespaces, defaults to `.`.
            newListener: false, // if you want to emit the newListener event set to true.
            maxListeners: 10 // the max number of listeners that can be assigned to an event, defaults to 10.
        });
        // emitter.emit(event, [arg1], [arg2], [...])
        this.emit = this.emitter.emit;
        this.on = this.emitter.on;
        this.off = this.emitter.removeListener;
        this.onAny = this.emitter.onAny;
        this.offAny = this.emitter.offAny;
        this.removeAllListeners = this.emitter.removeAllListeners;

        //this.on(CMD.OFFER, this.peerOfferHandler.bind(this));
        //this.on(CMD.ANSWER, this.peerAnswerHandler.bind(this));
        //this.on(CMD.CANDIDATE, this.peerCandidateHandler.bind(this));

        //this.on(PeerEvent.CONNECT, this.peerConnectedHandler.bind(this));
        //this.on(PeerEvent.DISCONNECT, this.peerDisconnectHandler.bind(this));
        //this.on(PeerEvent.MESSAGE, this.peerMessageHandler.bind(this));

        var socket = this.socket;
        var self = this;
        // it is passed over Offer/Answer objects for reusability
        this.events = {
            // rtcpeerconnection events
            onsdp: function (peerId, sdp) {
                self.send(CMD.SDP,
                    {
                        from: settings.uuid,
                        sdp: sdp, // {type: 'offer', data: sdp-content}
                        to: peerId
                    }
                );
            },
            onicecandidate: function(peerId, candidate) {
                self.send(CMD.CANDIDATE,
                    {
                        from: settings.uuid,
                        candidate: candidate,
                        to: peerId
                    }
                );
            },
            // rtcdatachannel events
            ondata: function(data) {
                if (self.ondata) {
                    self.ondata(data);
                } else {
                    logger.log('Channel', 'Received data: ', data);
                }
            },
            onopen: function() {
                self.peerConnectedHandler();
            },
            onclose: function(e) {
                if (self.peerDisconnectHandler) self.peerDisconnectHandler(e);
            },
            onerror: function(e) {
                if (self.onerror) self.onerror(e);
            }
        };

        this.psm = this.createPeerManager();
        // for fsm to initialize
        this.startup();

    };

    var root = this.psm;

    SignalSession.prototype = {
        //------------------ begin of events ------------------
        onbeforestartup: function(event, from, to) {
            logger.log('Signal', "START   EVENT: startup!");
        },
        onbeforeconnect: function(event, from, to) {
            logger.log('Signal', "START   EVENT: connect!");
            this.triggerEvent(SignalEvent.BEFORECONNECT);
        },
        onbeforedetect: function(event, from, to) {
            logger.log('Signal', "START   EVENT: detect!");
        },
        onbeforedisconnect: function(event, from, to) {
            logger.log('Signal', "START   EVENT: disconnect!");
        },
        onbeforeauthenticate: function(event, from, to) {
            logger.log('Signal', "START   EVENT: authenticate!");
            this.triggerEvent(SignalEvent.BEFOREAUTHENTICATE);
        },

        onleavedisconnected: function(event, from, to) {
            logger.log('Signal', "LEAVE   STATE: disconnected");
            var self = this;

            try {
                var url = (self.isSecure ? 'wss' : 'ws') + '://' + self.host + ':' + self.port;
                self.socket = new WebSocket(url, null, { debug: true, devel: true });
                self.url = url;

                //add listeners
                this.socket.addEventListener('message', this.messageHandler.bind(this));
                this.socket.addEventListener('open', function (ev) {
                    // enter connected state
                    // NOTE: If you decide to cancel the ASYNC event, you can call fsm.transition.cancel();
                    self.transition();
                });

                this.socket.addEventListener('error', function (e) {
                    logger.log('Server ' + self.uuid, self.url, 'error: ', e.code + ' : ' + e.reason);
                    self.disconnect();
                });

                this.socket.addEventListener('close', function (e) {
                    self.disconnect();
                    logger.log('Server ' + self.uuid, self.url, 'disconnected', 'error: ' + e.code + ' : ' + e.reason);

                    switch (e.code) {
                        case 1011:
                            logger.log('Server ' + self.uuid, self.url, 'is idle! Please restart it.');
                            break;
                    }
                });

            } catch (e) {
                logger.error(e);
                self.disconnect();
                return false;
            }

            // tell StateMachine to defer next state until we call transition
            return StateMachine.ASYNC;
        },
        onleaveconnected:  function(event, from, to) {
            logger.log('Signal', "LEAVE   STATE: connected");
            var self = this;

            // start to detect local ips
            function Detected(ips) {
                // save ips
                self.localIPs = ips;
                logger.log('Detected', 'all addr: ', ips);
                self.transition();
            }

            detectLocalIPs(self, Detected);
            return StateMachine.ASYNC;
        },
        onleavedetected: function(event, from, to) {
            logger.log('Signal', "LEAVE   STATE: detected");
            var self = this;

            // set callback for auth message
            function responseHandler(e) {
                var response = JSON.parse(e.data);
                if (response.cmd === CMD.AUTH) {
                    self.socket.removeEventListener('message', responseHandler);
                    // received response of auth
                    if (response['data']['success'] && (response['data']['success'] === true)) {
                        // get the authToken
                        if (response['data']['authToken']) {
                            logger.log('Signal', 'Got auth token: ', response['data']['authToken']);
                            settings.authToken = response['data']['authToken'];
                            settings.tokenExpiresAt = parseInt(response['data']['expiresAt']);
                        }
                        self.transition();
                    } else {
                        self.transition().cancel();
                    }
                }
            }

            self.socket.addEventListener('message', responseHandler);
            // need to check if token have existed
//          var isExisted = ((settings.authToken === null) || (settings.tokenExpiresAt <= Date.now()))
//                          ? false : true;
            self.sendAuthentication();
            return StateMachine.ASYNC;
        },
        onleaveauthenticated: function(event, from, to) {
            logger.log('Signal', "LEAVE   STATE: authenticated");
        },

        onconnected: function(event, from, to) {
            logger.log('Signal', "ENTER   STATE: connected");
        },
        ondetected: function(event, from, to) {
            logger.log('Signal', "ENTER   STATE: detected");
        },
        ondisconnected: function(event, from, to) {
            logger.log('Signal', "ENTER   STATE: disconnected");
        },
        onauthenticated: function(event, from, to) {
            logger.log('Signal', "ENTER   STATE: authenticated");
        },

        onstartup: function(event, from, to) {
            logger.log('Signal', "FINISH  EVENT: startup!");
        },
        // onconnect = on after connect event
        onconnect: function(event, from, to) {
            logger.log('Signal', "FINISH  EVENT: connect!");
            if (this.is('connected')) {
                this.triggerEvent(SignalEvent.CONNECTED);
                // now start detect event
                this.detect();
            }
        },
        // on after detect event
        ondetect: function(event, from, to) {
            logger.log('Signal', "FINISH  EVENT: detect!");
            if (this.is('detected')) {
                this.triggerEvent(SignalEvent.DETECTED);
                // now start authenticate event
                this.authenticate();
            }
        },
        ondisconnect: function(event, from, to) {
            var self = this;
            logger.log('Signal', "FINISH  EVENT: disconnect!");
            if (this.is('disconnected')) {
                this.socket = null;
                setTimeout(function () {
                    self.triggerEvent(SignalEvent.DISCONNECTED);
                }, 300);
            }
        },
        onauthenticate: function(event, from, to) {
            logger.log('Signal', "FINISH  EVENT: authenticate!");
            if (this.is('authenticated')) {
                this.triggerEvent(SignalEvent.AUTHENTICATED);
            }
        },

        onchangestate: function(event, from, to) {
            logger.log('Signal', "CHANGED STATE: " + from + " to " + to);
        },

        // if someone shared SDP
        // message include: from, to, sdp.type, sdp.sdp
        onsdp: function(message) {
            var sdp = message.sdp;
            var from = message.from;

            if (sdp.type === 'offer') {
                this.psm._peers[message.from] = new jsd.core.Answer(from, sdp, this.events);
            }

            if (sdp.type === 'answer') {
                this.psm._peers[message.from].setRemoteDescription(sdp);
            }
        },

        ondata: function(event) {
            var self = this;
            var chunk = event.data;

            if (chunk instanceof ArrayBuffer || chunk instanceof DataView) {
                // array buffers are passed using WebRTC data channels
                // need to convert data back into JavaScript objects

                self.fileBufferReader.convertToObject(chunk, function(object) {
                    self.ondata({
                        data: object
                    });
                });
                return;
            }

            // if target user requested next chunk
            if(chunk.readyForNextChunk) {
                self.fileBufferReader.getNextChunk(chunk.uuid, getNextChunkCallback);
                return;
            }

            // if chunk is received
            self.fileBufferReader.addChunk(chunk, function(promptNextChunk) {
                // request next chunk
                peerConnection.send(promptNextChunk);
            });
        },

        //------------------ end of events ------------------

        acceptPartitipantRequest: function(data) {
            var from = data.from;
            if (data.to && (data.to === settings.uuid)) {
                // TODO: need to judge can we create new offer
                logger.log('Peer '+settings.uuid, 'Received invite from ', data.from);
                // create the offer
                if (from) {
                    this.psm._peers[from] = new jsd.core.Offer(from, this.events);
                }
            }
        },

        triggerEvent: function (status, peer) {
            var eventInfo = {}, i;
            if (peer) {
                eventInfo.peer = peer;
                this.peers.push(peer);
            } else {
                if (this.is('disconnected')) {
                    // TODO: need to do something
//            for (i = 0; i < this.peers.length; i += 1) {
//              this.peers[i].parallel.triggerEvent(PeerEvent.DISCONNECT);
//              this.peers[i].triggerEvent(PeerEvent.DISCONNECT);
//            }
                }
            }
            // can not use this.emitter.emit , why ?
            // next line is ok
            // (this.emitter.emit.bind(this))(status, eventInfo, this.callback);
            this.emit(status, eventInfo);
        },

        // private function
        send: function (cmd, data) {
            var self = this;

            try {
                if (!self.is('connected') && !self.is('authenticated') && !self.is('detected')) {
                    throw new Error('Not connected to server, current status: ' + self.inStatus);
                }

                if (!data || !_.isObject(data) || _.isEmpty(data)) {
                    throw new Error('Data is not an object/empty!');
                }

                if (!cmd) {
                    throw new Error('Command is not defined!');
                }

                // add cmd to data
                data.cmd = cmd;

                // add auth token
                data.authToken = settings.authToken;

                //send data to websocket as String
                this.socket.send(JSON.stringify(data));
                logger.log('Signal ' + this.uuid, 'Sent ', data.cmd, data);

                return true;
            } catch (e) {
                logger.error(e);
                return false;
            }
        },

        sendAuthentication: function () {
            var self = this;
            return this.send(CMD.AUTH, { from: settings.uuid, apiKey: settings.apiKey, ips: self.localIPs, host: window.location.host });
        },

        sendPeerOffer: function (targetPeerUuid, offer) {
            return this.send(CMD.OFFER, { from: settings.uuid, to: targetPeerUuid, offer: offer });
        },

        sendPeerAnswer: function (targetPeerUuid, answer) {
            return this.send(CMD.ANSWER, { from: settings.uuid, to: targetPeerUuid, answer: answer });
        },

        sendPeerCandidate: function (target, candidate) {
            return this.send(CMD.CANDIDATE, { from: settings.uuid, to: target, candidate: candidate });
        },

        sendParticipantRequest: function(target) {
            return this.send(CMD.PARTICIPANT, { from: settings.uuid, to: target });
        },

        getAllRelatedPeers: function () {
            return this.send(CMD.LIST, { from: settings.uuid });
        },

        messageHandler: function (e) {
            var self = this;
            var data = JSON.parse(e.data), cmd = data.cmd;

            logger.log('Signal ' + this.uuid, 'Received', data.cmd, data.data);

            switch (cmd.toLowerCase()) {
//          case CMD.OFFER:
//            this.emit(CMD.OFFER, { from: self.uuid, to: data.data.to, offer: data.data.offer });
//            break;
//          case CMD.ANSWER:
//            this.emit(CMD.ANSWER, { from: self.uuid, to: data.data.to, answer: data.data.answer });
//            break;
                case CMD.CANDIDATE:
                    this.emit(CMD.CANDIDATE, { from: self.uuid, to: data.data.to, candidate: data.data.candidate });
                    break;
                case CMD.SDP:
                    //this.emit(CMD.SDP, { from: self.uuid, to: data.data.to, sdp: data.data.sdp });
                    this.onsdp(data.data); // include: from, to, sdp.type, sdp.sdp
                    break;
                case CMD.PARTICIPANT:
                    this.acceptPartitipantRequest(data.data);
                    //this.emit(CMD.PARTICIPANT, { from: self.uuid, to: data.data.to });
                    break;
            }
        },

        serialize: function () {
            return {
                host: this.host,
                isSecure: this.isSecure,
                port: this.port
            };
        },

        getStatus: function () {
            return this.current;
        },

        saveIPs: function (ips) {
            var self = this;
            self.localIPs = ips;
            logger.log('DetectIPs', 'all addr: ', ips);
        },

        // connect to peer
        createPeer: function(peerId) {
            return new jsd.core.PeerSession(this, peerId);
        },

        createPeerManager: function() {
            return new jsd.core.PeerSessionManager(this);
        },

        /**
         * Event-Handler, gets called when another Peer sends an offer
         * If the Peer is not yet in the Peers-Collection, it will be created and added.
         * Then the answering process gets initialized.
         *
         * @private
         * @method peerOfferHandler
         * @param {Object} data
         */
        peerOfferHandler: function(data) {
            logger.log('Peer '+this.uuid, 'Received offer: ', data);

            var self = this;
            var peer = self.peers.getPeerByUuid(data.to);

            if (!peer) {
                peer = this.createPeer(data.to);
                peer.isSource = false;
                peer.isTarget = true;

                self.peers.add(peer);
                //peer = self.peers.getPeerByUuid(data.to);
            }

            peer.answerOffer(data);
        },

        /**
         * Event-Handler, gets called when another Peer sends an answer to an offer
         *
         * @private
         * @method peerAnswerHandler
         * @param {Object} data
         */
        peerAnswerHandler: function(data) {
            logger.log('Peer '+this.uuid, 'Received answer: ', data);
            var peer = this.peers.getPeerByUuid(data.to);
            if (!peer) {
                logger.error('Signal '+this.uuid, 'Unknown peer answer: ', data);
                return;
            }
            peer.acceptConnection(data);
        },

        /**
         * Event-Handler, gets called when another Peer sends candidate-data.
         * Adds the candidate-data to the Peer it came from
         *
         * @private
         * @method peerCandidateHandler
         * @param {Object} data
         */
        peerCandidateHandler: function(data) {
            logger.info('Peer '+this.uuid, 'Received candidate: ', data);
            var peer = this.peers.getPeerByUuid(data.to);
            if (!peer) {
                logger.error('Signal '+this.uuid, 'Unknown peer candidate: ', data);
                return;
            }
            peer.addCandidate(data);
        },

        /**
         * Event-Handler, gets called when a Peer-connection is completely established.
         *
         * @private
         * @method peerConnectedHandler
         * @param {Peer} peer
         */
        peerConnectedHandler: function() {
            logger.info('Channel '+this.uuid, 'Peer connection established.');
            // peer.synchronize();

        },

        /**
         * Event-Handler, gets called when a Peer-connection is closed.
         * Causes a reconnect to nearest Peers if needed.
         *
         * @private
         * @method peerDisconnectHandler
         * @param {Object} e
         */
        peerDisconnectHandler: function(e) {
            logger.info('Channel', 'Channel disconnected: ', e);

            // BUG: TypeError: this.peers is null
            // Need for more connected peers?
            if (this.peers.getConnectedPeers().length < this.settings.maxPeers) {
                this.peers.connectToNeighbourPeers();
            }
        },

        /**
         * Event-Handler, gets called when a Peer-connection
         * can't be established after a specific time interval and a timeout occured.
         *
         * @private
         * @method peerTimeoutHandler
         * @param {Object} e
         */
        peerTimeoutHandler: function(e) {
            logger.log('Peer ' + e.peerId, 'Time-out occured trying to connect!');
            this.peerDisconnectHandler(e);
        },

        /**
         * Event-Handler, gets called when a Peer receives a message.
         *
         * @param {Object} e
         */
        peerMessageHandler: function(e) {
            logger.log('Peer '+e.target.id, 'Received', e.type);

            if (!e || !e.type) {
                logger.log('Network', 'Peer-message without type received');
                return;
            }
            // Seems to be a master-message
            if (e.data && e.data.message && e.data.signature) {
//          masterMessageHandler(e);
            }
            else {
                // Message is still valid? Or has expired? Without data will always be valid
                if (!e.data || e.data.timestamp + project.network.broadcast.messageTtl < Date.now()) {
                    // Pass-through events, that will be caught by mediator
                    module.emit(e.type, e);
                }
            }
        }

    };

    StateMachine.create({
        target: SignalSession.prototype,
        error: function(eventName, from, to, args, errorCode, errorMessage) {
            return 'event ' + eventName + ' was naughty :- ' + errorMessage;
        },
        events: [
            { name: 'startup', from: 'none', to: 'disconnected' },
            { name: 'connect', from: 'disconnected', to: 'connected' },
            { name: 'detect',  from: 'connected', to: 'detected' },
            { name: 'authenticate', from: 'detected',  to: 'authenticated' },
            { name: 'disconnect', from: ['connected', 'detected', 'authenticated'], to: 'disconnected' }
        ]
    });

    exports.SignalSession = SignalSession;

})(typeof exports === 'undefined' ? jsd.core : exports);

// call exampel: var singnal = new jsd.SignalSession();
