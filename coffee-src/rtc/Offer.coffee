
#= require <PeerSession.coffee>

onSdpError = (e) ->
    logger.error e
    return

higherBandwidthSDP = (sdp) ->
    newSDP = undefined
    split = sdp.split("b=AS:30")
    if split.length > 1
        newSDP = split[0] + "b=AS:1638400" + split[1]
    else
        newSDP = sdp
    newSDP

class JRtcOffer extends JRtcPeerSession
    constructor: (@sandbox, @peerId, @uuid, @config) ->
        super(@sandbox)
        peer = new RTCPeerConnection(JOptions.ICE_SERVER_SETTINGS, {})
        self = this
        @type = "offer"
        @channelEvents = new JRtcChannelEvents(peer)
        peer.onicecandidate = (event) ->
            if event.candidate
                config.onicecandidate peerId, event.candidate.candidate
            else
                sandbox.log.debug "Offer", "end of candidate", JSON.stringify(
                    iceGatheringState: peer.iceGatheringState
                    signalingState: peer.signalingState
                    iceConnectionState: peer.iceConnectionState
                )
            return

        peer.onsignalingstatechange = ->
            sandbox.log.debug "Offer", "onsignalingstatechange:", JSON.stringify(
                iceGatheringState: peer.iceGatheringState
                signalingState: peer.signalingState
                iceConnectionState: peer.iceConnectionState
            )
            return

        peer.oniceconnectionstatechange = ->
            sandbox.log.debug "Offer", "oniceconnectionstatechange:", JSON.stringify(
                iceGatheringState: peer.iceGatheringState
                signalingState: peer.signalingState
                iceConnectionState: peer.iceConnectionState
            )
            return

        self.channel = self.createDataChannel(peer)
        self.channelEvents.hook self.channel
        peer.createOffer ((offer) ->
            offer.sdp = higherBandwidthSDP(offer.sdp)
            peer.setLocalDescription offer
            config.onsdp peerId, offer
            return
        ), onSdpError, options.offerAnswerConstraints
        @peer = peer
        return

    setRemoteDescription: (sdp) ->
        @peer.setRemoteDescription new RTCSessionDescription(sdp)
        return

    addIceCandidate: (candidate) ->
        @peer.addIceCandidate new RTCIceCandidate(
            sdpMLineIndex: candidate.sdpMLineIndex
            candidate: candidate.candidate
        )
        return

    createDataChannel: (peer) ->
        chanLabel = @peerId + "-" + @uuid
        chan = (@peer or peer).createDataChannel(chanLabel, {})
        @channelEvents.hook chan
        chan

