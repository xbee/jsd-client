
;(function(exports) {
    var logger = jsd.util.logger;

    // optional argument for createDataChannel
    var dataChannelDict = {};

    function higherBandwidthSDP(sdp) {

        var newSDP;
        var split = sdp.split("b=AS:30");
        if(split.length > 1)
            newSDP = split[0] + "b=AS:1638400" + split[1];
        else
            newSDP = sdp;

        return newSDP;
    }

    function Offer(peerId, uuid, config) {
        jsd.core.PeerSession.call(this);

        var peer = new RTCPeerConnection(ICE_SERVER_SETTINGS, optionalArgument);

        var self = this;
        self.type = 'offer';
        self.config = config;
        self.uuid = uuid;
        self.peerId = peerId;
        self.fileBufferReader = new jsd.data.FileBufferReader();
        self.channelEvents = new jsd.core.ChannelEvents();

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
                logger.debug('Offer', 'onsignalingstatechange:', JSON.stringify({
                    iceGatheringState: peer.iceGatheringState,
                    signalingState: peer.signalingState,
                    iceConnectionState: peer.iceConnectionState
                }));
        };
        peer.oniceconnectionstatechange = function() {
                logger.debug('Offer', 'oniceconnectionstatechange:', JSON.stringify({
                    iceGatheringState: peer.iceGatheringState,
                    signalingState: peer.signalingState,
                    iceConnectionState: peer.iceConnectionState
                }));
        };

        self.channel = self.createDataChannel(peer);
        self.channelEvents.hook(self.channel);

//      window.peer = peer;
        peer.createOffer(function(offer) {
            offer.sdp = higherBandwidthSDP(offer.sdp);

            peer.setLocalDescription(offer);
            config.onsdp(peerId, offer);
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
            var chanLabel = this.peerId + '-' + this.uuid;

            var chan = (this.peer || peer).createDataChannel(chanLabel, dataChannelDict);
            this.channelEvents.hook(chan);
            return chan;
        }
    });
    exports.Offer = Offer;

    function Answer(peerId, uuid, offer, config) {
        var Parent = jsd.core.PeerSession;
        Parent.call(this);

        var peer = new RTCPeerConnection(ICE_SERVER_SETTINGS, optionalArgument);

        var self = this;
        self.config = config;
        self.type = 'answer';
        self.uuid = uuid;
        self.peerId = peerId;
        self.fileBufferReader = new jsd.data.FileBufferReader();
        self.channelEvents = new jsd.core.ChannelEvents();

        peer.ondatachannel = function(event) {
            self.channel = event.channel;
            self.channelEvents.hook(self.channel);
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
                logger.debug('Answer', 'onsignalingstatechange:', JSON.stringify({
                    iceGatheringState: peer.iceGatheringState,
                    signalingState: peer.signalingState,
                    iceConnectionState: peer.iceConnectionState
                }));
        };
        peer.oniceconnectionstatechange = function() {
                logger.debug('Answer', 'oniceconnectionstatechange:', JSON.stringify({
                    iceGatheringState: peer.iceGatheringState,
                    signalingState: peer.signalingState,
                    iceConnectionState: peer.iceConnectionState
                }));
        };

        peer.setRemoteDescription(new RTCSessionDescription(offer));
        peer.createAnswer(function(answer) {
            answer.sdp = higherBandwidthSDP(answer.sdp);

            peer.setLocalDescription(answer);
            config.onsdp(peerId, answer);
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
            // Answer channel label
            var chanLabel = this.uuid + '-' + this.peerId;
            var chan = (this.peer || peer).createDataChannel(chanLabel, dataChannelDict);
            this.channelEvents.hook(chan);
            return chan;
        }
    });
    exports.Answer = Answer;

    function onSdpError(e) {
        console.error(e);
    }

})(typeof exports === 'undefined' ? jsd.core : exports);


