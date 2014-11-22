
#= require JBase

class JRtcChannelEvents extends JBase

    constructor: (@sandbox, conn) ->
      super(@sandbox)
      @channel = null
      @peerConnection = conn

      # rtcdatachannel events
      @ondata = (event) ->
        self = this

        # must be a global variable
        fileBufferReader = @sandbox.fileBufferReader or new JDataFileBufferReader()

        #@log.log('ondata', event);
        chunk = event.data
        if chunk instanceof ArrayBuffer or chunk instanceof DataView

          # array buffers are passed using WebRTC data channels
          # need to convert data back into JavaScript objects
          fileBufferReader.convertToObject chunk, (object) ->
            self.ondata data: object
            return

          return

        # if target user requested next chunk
        if chunk.readyForNextChunk
          fileBufferReader.getNextChunk chunk.uuid, (nextChunk, isLastChunk) ->
            self.log.debug "Channel", "File Successfully sent."  if isLastChunk

            # sending using WebRTC data channels
            self.channel.send nextChunk
            return

          return

        # if chunk is received
        fileBufferReader.addChunk chunk, (promptNextChunk) ->

          # request next chunk
          chunk.uuid and chunk.currentPosition and self.log.debug("Channel", "File " + chunk.uuid + ", " + "chunk: " + chunk.currentPosition + " received.")

          #@log.log('I am: ', self.channel.type);
          self.channel.send promptNextChunk
          return

        return

      @onopen = ->
        @log.info "Channel", "Peer connection established."
        return

      @onclose = (e) ->
        @log.info "Channel", "Channel disconnected."
        @_handlePeerDisconnect e
        return

      @onerror = (e) ->
        @log.error "Channel", "Channel error: ", e
        return

      @_handlePeerDisconnect = (e) ->
        unless @channel.readyState is "closed"
          @log.info "Channel", "handling peer disconnection: closing the datachannel"
          @channel.close()

        # need to clear peer connection
        unless @peerConnection.signalingState is "closed"
          @log.info "handling peer disconnection: closing the peerconnection"
          @peerConnection.close()
        return


      return

    hook: (datachannel) ->
      self = this
      dc = undefined
      self.channel = dc = datachannel

      # set channel events
      dc.binaryType = "arraybuffer"
      dc.onmessage = (event) ->
        self.ondata event
        return

      dc.onopen = ->
        self.onopen()
        return

      dc.onerror = (e) ->
        #@log.error('channel.onerror', JSON.stringify(e, null, '\t'));
        self.onerror e
        return

      dc.onclose = (e) ->

        #@log.warn('channel.onclose', JSON.stringify(e, null, '\t'));
        self.onclose e
        return

      return

