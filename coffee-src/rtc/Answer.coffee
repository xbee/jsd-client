
#= require <Offer.coffee>

class JRtcAnswer extends JRtcPeerSession

    constructor: (@sandbox, @peerId, @uuid, offer, @config) ->
        super(@sandbox)
        @peer = new JRTCPeerConnection(JOptions.ICE_SERVER_SETTINGS, {})
        self = this
        @type = "answer"
        @channelEvents = new JRtcChannelEvents(@peer)
        @peer.ondatachannel = (event) ->
            self.channel = event.channel
            self.channelEvents.hook self.channel
            return

        @peer.onicecandidate = (event) ->
            if event.candidate
                config.onicecandidate peerId, event.candidate
            else
                @logger.debug "Answer", "end of candidate", JSON.stringify(
                    iceGatheringState: @peer.iceGatheringState
                    signalingState: @peer.signalingState
                    iceConnectionState: @peer.iceConnectionState
                )
            return

        @peer.onsignalingstatechange = ->
            @logger.debug "Answer", "onsignalingstatechange:", JSON.stringify(
                iceGatheringState: @peer.iceGatheringState
                signalingState: @peer.signalingState
                iceConnectionState: @peer.iceConnectionState
            )
            return

        @peer.oniceconnectionstatechange = ->
            @logger.debug "Answer", "oniceconnectionstatechange:", JSON.stringify(
                iceGatheringState: @peer.iceGatheringState
                signalingState: @peer.signalingState
                iceConnectionState: @peer.iceConnectionState
            )
            return

        @peer.setRemoteDescription new JRTCSessionDescription(offer)
        @peer.createAnswer ((answer) ->
            answer.sdp = higherBandwidthSDP(answer.sdp)
            @peer.setLocalDescription answer
            config.onsdp peerId, answer
            return
        ), onSdpError, options.offerAnswerConstraints
        return

    addIceCandidate: (candidate) ->
        @peer.addIceCandidate new JRTCIceCandidate(
            sdpMLineIndex: candidate.sdpMLineIndex
            candidate: candidate.candidate
        )
        return

    createDataChannel: (peer) ->
        chanLabel = @uuid + "-" + @peerId
        chan = (@peer or peer).createDataChannel(chanLabel, {})
        @channelEvents.hook chan
        chan

