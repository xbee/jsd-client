
PeerEvent = {};
PeerEvent.CONNECTING = 'peer:connecting';
PeerEvent.HOLD = 'peer:hold';
PeerEvent.UNHOLD = 'peer:unhold';
PeerEvent.REJECT = 'peer:reject';
PeerEvent.CONNECT = 'peer:connect';
PeerEvent.DISCONNECT = 'peer:disconnect';
PeerEvent.MESSAGE = 'peer:message';
PeerEvent.ADDSTREAM = 'stream:add';

var TIMEOUT_WAIT_TIME = 10000, QUEUE_RETRY_TIME = 75;
var ICE_SERVER_SETTINGS = {
    iceServers: [
        {
            url: 'stun:stun.l.google.com:19302'
        },
        {
            url: 'stun:stun.turnservers.com:3478'
        }
    ]
};

var optionalArgument = {
    optional: [{
        DtlsSrtpKeyAgreement: true
    }]
};

var offerAnswerConstraints = {
    optional: [],
    mandatory: {
        OfferToReceiveAudio: false,
        OfferToReceiveVideo: false
    }
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

var webrtcDetectedBrowser = null;
// Handle vendor prefixes
if (window.webkitRTCPeerConnection) {
    RTCPeerConnection = webkitRTCPeerConnection;
    RTCIceCandidate = window.RTCIceCandidate;
    RTCSessionDescription = window.RTCSessionDescription;
    webrtcDetectedBrowser = "chrome";
} else if (window.mozRTCPeerConnection) {
    RTCPeerConnection = mozRTCPeerConnection;
    RTCIceCandidate = mozRTCIceCandidate;
    RTCSessionDescription = mozRTCSessionDescription;
    webrtcDetectedBrowser = "firefox";
}

;(function (exports) {

    var settings = jsd.util.settings;

    function PeerSession(server, peerId) {

        var _self = this;
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
        // this.isConnected = false;
        /**
         * Whether this peer is the initiator of a connection
         * @property isSource
         * @default false
         * @type {Boolean}
         */
        // this.isSource = false;
        /**
         * Whether this peer is the initiator of a connection
         * @property isTarget
         * @default false
         * @type {Boolean}
         */
        // this.isTarget = false;
        /**
         * List of timers for synchronization
         * @type {Array}
         */
        this.syncTimers = [];

        // peerId not equals uuid, it should be auto increment int
        if (peerId) {
            this.peerId = peerId;
            this.uuid = this.peerId;
        }
        if (server)
            this.server = server;

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

        // Protocol switch SRTP(=default) or SCTP
        if (settings.protocol.toLowerCase() === 'sctp') {
            this.protocol = 'sctp';
            logger.log('Signal '+_self.peerId, 'Using SCTP');

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
            logger.log('Signal '+_self.peerId, 'Using SRTP');
        }
    }

    /**
     * @private
     * @method timerCompleteHandler
     */
    PeerSession.prototype.timerCompleteHandler = function (e) {
        var _self = this;
        if (!this.isConnected) {
            _self.timeout = Date.now();
            _self.emit('peer:timeout', _self);
        } else
            _self.timeout = undefined;
    };

    /* Event Handler Start */
    PeerSession.prototype.iceCandidateHandler = function (e) {
        var self = this;
        //II. The handler is called when network candidates become available.
        if (!e || !e.candidate)
        // end of candidate
            return;

        // III. In the handler, Alice sends stringified candidate data to Eve, via their signaling channel.
        this.server.sendPeerCandidate(self.peerId, e.candidate);
    };

    PeerSession.prototype.dataChannelHandler = function (e) {
        var _self = this;
        logger.log('Peer', _self.peerId, 'Received remote DataChannel');

        _self.channel = e.channel;

        _self.channel.onclose = this.channel_CloseHandler.bind(this);
        _self.channel.onerror = this.channel_ErrorHandler.bind(this);
        _self.channel.onmessage = this.channel_MessageHandler.bind(this);
        _self.channel.onopen = this.channel_OpenHandler.bind(this);
    };

    PeerSession.prototype.iceConnectionStateChangeHandler = function (e) {
        var _self = this;

        // Everything is fine
        if (_self.connection.iceConnectionState === 'connected' && _self.connection.iceGatheringState === 'complete') {
            logger.log('Peer '+_self.peerId, 'Connection established');
            _self.isConnected = true;

        } else if (_self.connection.iceConnectionState === 'disconnected') {
            logger.log('Peer '+_self.peerId, 'Connection closed');

            _self.isConnected = false;
            _self.emit(PeerEvent.DISCONNECT, _self);
        }
    };

    function _makeOffer(self) {
        self.connection.createOffer(function (sessionDescription) {
            //3. Alice calls setLocalDescription() with his offer.)
            self.connection.setLocalDescription(sessionDescription);

            //4. Alice stringifies the offer and uses a signaling mechanism to send it to Eve.
            self.server.sendPeerOffer(self.peerId, sessionDescription);
        }, function (err) {
            logger.error('Peer', self.peerId, err, 'Was using', self.protocol, 'protocol.');
        }, connectionConstraint);
    }

    PeerSession.prototype.negotiationNeededHandler = function (e) {
        var _self = this;
        logger.log('Peer '+_self.peerId, 'Negotiation needed');

        //2. Alice creates an offer (an SDP session description)
        // with the RTCPeerConnection createOffer() method.
        _makeOffer(_self);
    };

    PeerSession.prototype.signalingStateChangeHandler = function (e) {
    };

    PeerSession.prototype.channel_ErrorHandler = function (e) {
        var _self = this;
        logger.log('Peer '+_self.peerId, 'Channel has an error', e);
    };

    PeerSession.prototype.channel_MessageHandler = function (e) {
        var msg;
        var _self = this;

        _self.isConnected = true;

        if (e.data instanceof Blob) {
            msg = { blob: e.data };
        } else {
            try {
                msg = JSON.parse(e.data);
            } catch (err) {
                logger.error('Peer '+_self.peerId, 'Error parsing msg:', e.data);
            }
        }

        _self.emit(PeerEvent.MESSAGE, _.extend(msg, { target: _self }));
    };

    PeerSession.prototype.channel_OpenHandler = function (e) {
        var _self = this;
        logger.log('Peer '+_self.peerId, 'DataChannel is open');

        _self.isConnected = true;
        _self.emit(PeerEvent.CONNECT, _self);
    };

    PeerSession.prototype.channel_CloseHandler = function (e) {
        var _self = this;
        logger.log('Peer', _self.peerId, 'DataChannel is closed', e);
        _self.isConnected = false;
        _self.emit(PeerEvent.DISCONNECT, _self);
    };


    /**
     * Send data via a WebRTC-Channel to a peer
     *
     * @method send
     * @param data
     * @param {Boolean} reliable Should a retry occur if the transmission fails?
     */
    PeerSession.prototype.send = function (data, reliable) {
        if (typeof reliable === "undefined") {
            reliable = false;
        }
        var _self = this;

//      _self.channel = answererDataChannel || offererDataChannel;
        var jsonString;

        if (!_self.isConnected || _self.channel.readyState !== 'open') {
            logger.error('Peer ' + _self.peerId, 'Attempt to send, but channel is not open!');
            return;
        }

        // Actually it should be possible to send a blob, but it isn't
        // https://code.google.com/p/webrtc/issues/detail?id=2276
        if (data instanceof Blob) {
            _self.channel.send(data);
        } else {
            try {
                jsonString = JSON.stringify(data);
            } catch (e) {
                // We won't retry as this always will fail
            }
            try {
                _self.channel.send(jsonString);
            } catch (e) {
                if (reliable) {
                    logger.error('Peer ' + _self.peerId, 'Error while sending reliable msg, queuing data');

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

    exports.PeerSession = PeerSession;

})(typeof exports === 'undefined' ? jsd.core : exports);
