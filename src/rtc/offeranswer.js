
(function() {
    J.Rtc.higherBandwidthSDP = function(sdp) {
        var newSDP;
        var split = sdp.split("b=AS:30");
        if(split.length > 1)
            newSDP = split[0] + "b=AS:1638400" + split[1];
        else
            newSDP = sdp;
        return newSDP;
    };

    J.Rtc.Offer = J.Rtc.PeerSession({

        initialize: function(peerId, uuid, config) {
            var Parent = J.Rtc.PeerSession;
            Parent.call(this);

            var peer = new J.RTCPeerConnection(J.Options.ICE_SERVER_SETTINGS, {});

            var self = this;
            self.type = 'offer';
            self.config = config;
            self.uuid = uuid;
            self.peerId = peerId;
            self.fileBufferReader = new J.FileBufferReader();
            self.channelEvents = new J.ChannelEvents(peer);

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

            peer.createOffer(function(offer) {
                offer.sdp = J.Util.higherBandwidthSDP(offer.sdp);

                peer.setLocalDescription(offer);
                config.onsdp(peerId, offer);
            }, onSdpError, options.offerAnswerConstraints);

            self.peer = peer;

        },
        setRemoteDescription: function(sdp) {
            this.peer.setRemoteDescription(new J.RTCSessionDescription(sdp));
        },
        addIceCandidate: function(candidate) {
            this.peer.addIceCandidate(new RTCIceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        },
        createDataChannel: function(peer) {
            var chanLabel = this.peerId + '-' + this.uuid;

            var chan = (this.peer || peer).createDataChannel(chanLabel, {});
            this.channelEvents.hook(chan);
            return chan;
        }
    });

    J.Rtc.Answer = J.Rtc.PeerSession({

        logger : J.logger,

        initialize: function(peerId, uuid, offer, config) {
            var Parent = J.Rtc.PeerSession;
            Parent.call(this);

            var peer = new J.RTCPeerConnection(J.Options.ICE_SERVER_SETTINGS, {});

            var self = this;
            self.config = config;
            self.type = 'answer';
            self.uuid = uuid;
            self.peerId = peerId;
            self.fileBufferReader = new J.FileBufferReader();
            self.channelEvents = new J.ChannelEvents(peer);

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

            peer.setRemoteDescription(new J.RTCSessionDescription(offer));
            peer.createAnswer(function(answer) {
                answer.sdp = J.Util.higherBandwidthSDP(answer.sdp);

                peer.setLocalDescription(answer);
                config.onsdp(peerId, answer);

            }, onSdpError, options.offerAnswerConstraints);

            self.peer = peer;

        },

        addIceCandidate: function(candidate) {
            this.peer.addIceCandidate(new J.RTCIceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        },
        createDataChannel: function(peer) {
            // Answer channel label
            var chanLabel = this.uuid + '-' + this.peerId;
            var chan = (this.peer || peer).createDataChannel(chanLabel, {});
            this.channelEvents.hook(chan);
            return chan;
        }

    });

    function onSdpError(e) {
        logger.error(e);
    }
})();





