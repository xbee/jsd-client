
;(function(exports) {
    function setChannelEvents(channel, config) {
        channel.binaryType = 'arraybuffer';
        channel.onmessage = function(event) {
            config.ondata(event);
        };
        channel.onopen = function() {
            config.onopen();
        };

        channel.onerror = function(e) {
            logger.error('channel.onerror', JSON.stringify(e, null, '\t'));
            config.onerror(e);
        };

        channel.onclose = function(e) {
            logger.warn('channel.onclose', JSON.stringify(e, null, '\t'));
            config.onclose(e);
        };
    };

    var dataChannelDict = {};

    function Offer(peerId, config) {
        jsd.core.PeerSession.call(this);

        var peer = new RTCPeerConnection(ICE_SERVER_SETTINGS, optionalArgument);

        var self = this;
        self.type = 'offer';
        self.config = config;
        self.peerId = peerId;
        self.fileBufferReader = new FileBufferReader();

        // this means we get local candidate
        // so need to send it to peer
        peer.onicecandidate = function(event) {
            if (event.candidate) {
                config.onicecandidate(peerId, event.candidate.candidate);
            } else {
                // emit on end of candidate event
                logger.log('Offer', 'end of candidate', JSON.stringify({
                    iceGatheringState: peer.iceGatheringState,
                    signalingState: peer.signalingState,
                    iceConnectionState: peer.iceConnectionState
                }));
            }
        };

        peer.onsignalingstatechange = function() {
            logger.log('Offer', 'onsignalingstatechange:', JSON.stringify({
                iceGatheringState: peer.iceGatheringState,
                signalingState: peer.signalingState,
                iceConnectionState: peer.iceConnectionState
            }));
        };
        peer.oniceconnectionstatechange = function() {
            logger.log('Offer', 'oniceconnectionstatechange:', JSON.stringify({
                iceGatheringState: peer.iceGatheringState,
                signalingState: peer.signalingState,
                iceConnectionState: peer.iceConnectionState
            }));
        };

        self.channel = self.createDataChannel(peer);

//      window.peer = peer;
        peer.createOffer(function(sdp) {
            peer.setLocalDescription(sdp);
            config.onsdp(peerId, sdp);
        }, onSdpError, offerAnswerConstraints);

        self.peer = peer;

//    return self;
    };

    Offer.prototype = _.create(jsd.core.PeerSession.prototype, {

        constructor: Offer,
        setRemoteDescription: function(sdp) {
            this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
        },
        addIceCandidate: function(candidate) {
            this.peer.addIceCandidate(new RTCIceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        },
        createDataChannel: function(peer) {
            var chan = (this.peer || peer).createDataChannel('channel', dataChannelDict);
            setChannelEvents(chan, this.config);
            return chan;
        }
    });
    exports.Offer = Offer;

    function Answer(peerId, offer, config) {
        var Parent = jsd.core.PeerSession;
        Parent.call(this);

        var peer = new RTCPeerConnection(ICE_SERVER_SETTINGS, optionalArgument);

        var self = this;
        self.config = config;
        self.type = 'answer';
        self.peerId = peerId;
        self.fileBufferReader = new FileBufferReader();

        peer.ondatachannel = function(event) {
            self.channel = event.channel;
            setChannelEvents(self.channel, config);
        };

        peer.onicecandidate = function(event) {
            if (event.candidate) {
                config.onicecandidate(peerId, event.candidate);
            } else {
                logger.log('Answer', 'end of candidate', JSON.stringify({
                    iceGatheringState: peer.iceGatheringState,
                    signalingState: peer.signalingState,
                    iceConnectionState: peer.iceConnectionState
                }));
            }

        };

        peer.onsignalingstatechange = function() {
            logger.log('Answer', 'onsignalingstatechange:', JSON.stringify({
                iceGatheringState: peer.iceGatheringState,
                signalingState: peer.signalingState,
                iceConnectionState: peer.iceConnectionState
            }));
        };
        peer.oniceconnectionstatechange = function() {
            logger.log('Answer', 'oniceconnectionstatechange:', JSON.stringify({
                iceGatheringState: peer.iceGatheringState,
                signalingState: peer.signalingState,
                iceConnectionState: peer.iceConnectionState
            }));
        };

        peer.setRemoteDescription(new RTCSessionDescription(offer));
        peer.createAnswer(function(sdp) {
            peer.setLocalDescription(sdp);
            config.onsdp(peerId, sdp);
        }, onSdpError, offerAnswerConstraints);

        self.peer = peer;

//    return self;
    };

    Answer.prototype = _.create(jsd.core.PeerSession.prototype, {
        constructor: Answer,
        addIceCandidate: function(candidate) {
            this.peer.addIceCandidate(new RTCIceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        },
        createDataChannel: function(peer) {
            var chan = (this.peer || peer).createDataChannel('channel', dataChannelDict);
            setChannelEvents(chan, this.config);
            return chan;
        }
    });
    exports.Answer = Answer;

    function onSdpError(e) {
        console.error(e);
    }
    
})(typeof exports === 'undefined' ? jsd.core : exports);


