

J.Rtc.PeerEvent = {
    CONNECTING : 'peer:connecting',
    HOLD : 'peer:hold',
    UNHOLD : 'peer:unhold',
    REJECT : 'peer:reject',
    CONNECT : 'peer:connect',
    DISCONNECT : 'peer:disconnect',
    MESSAGE : 'peer:message',
    ADDSTREAM : 'stream:add'
};


var channelConstraint;



J.Rtc.PeerSession = J.Evented.extend({

    settings : jsd.util.settings,

    options : {
        TIMEOUT_WAIT_TIME : 10000,
        QUEUE_RETRY_TIME : 75,
        optionalArgument : {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        },

        offerAnswerConstraints : {
            optional: [],
            mandatory: {
                OfferToReceiveAudio: false,
                OfferToReceiveVideo: false
            }
        },

        connectionConstraint : {
            optional: [
                { RtpDataChannels: true },
                { DtlsSrtpKeyAgreement: true }
            ],
            mandatory: {
                OfferToReceiveAudio: false,
                OfferToReceiveVideo: false
            }
        }

    },

    initialize: function(server, peerId) {

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

        // Protocol switch SRTP(=default) or SCTP
        if (settings.protocol.toLowerCase() === 'sctp') {
            this.protocol = 'sctp';
            logger.debug('Signal '+this.peerId, 'Using SCTP');

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
            logger.debug('Signal '+this.peerId, 'Using SRTP');
        }
    },

    /**
     * @private
     * @method timerCompleteHandler
     */
    timerCompleteHandler : function (e) {
        var _self = this;
        if (!this.isConnected) {
            _self.timeout = Date.now();
            _self.emit('peer:timeout', _self);
        } else
            _self.timeout = undefined;
    },

    /* Event Handler Start */

    /**
     * Send data via a WebRTC-Channel to a peer
     *
     * @method send
     * @param data
     * @param {Boolean} reliable Should a retry occur if the transmission fails?
     */
    send : function (data, reliable) {
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
    },

    sendFile : function (uuid, chunk, pos) {
        pos = pos || 0;

        // Send as blob, wrapped with info
        if (chunk instanceof Blob) {
            this.send({ type: 'file:push:start', uuid: uuid, pos: pos });
            this.send(chunk);
            this.send({ type: 'file:push:end', uuid: uuid });
        } else {
            this.send({ type: 'file:push', uuid: uuid, chunk: chunk, pos: pos });
        }
    },

    /**
     * @method serialize
     * @return {Object}
     */
    serialize : function () {
        return {
            uuid: this.uuid,
            server: this.server
        };
    },

    /**
     * @method broadcast
     */
    broadcast : function (type, data) {
        var _self = this;

        // Add broadcast prefix?
        if (type.indexOf('broadcast:') < 0) {
            type = 'broadcast:' + type;
        }

        _self.send({ type: type, data: data });
    },

    /**
     * @method disconnect
     */
    disconnect : function () {
        var _self = this;
        _self.isConnected = false;
        _self.channel.close();
        _self.connection.close();
    }
});

