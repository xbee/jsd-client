
#= require JBase
#= require <Constants.coffee>
#= require <FileBufferReader.coffee>
#= require <detect.coffee>
#= require <JOptions.coffee>


# alias
JSignalEvent = JRtcSignalEvent

class JRtcSignaler extends JBase

  constructor: (@sandbox) ->
    super(@sandbox)
    @log = @sandbox.log
    @host = @opts.get('signalServer').host
    @port = @opts.get('signalServer').port
    @isSecure = @opts.get('signalServer').isSecure
    @uuid = @opts.uuid
    @socket = null

    #this.isConnected = false;
    @localIPs = []

    #this.peers = null;
    @psm = null
    self = this

    # it is passed over Offer/Answer objects for reusability
    @events =
      # rtcpeerconnection events
      onsdp: (peerId, sdp) ->
        self.send CMD.SDP,
          from: @uuid
          sdp: sdp # {type: 'offer', data: sdp-content}
          to: peerId
        return

      onicecandidate: (peerId, candidate) ->
        self.send CMD.CANDIDATE,
          from: @uuid
          candidate: candidate
          to: peerId
        return

    @psm = @createPeerManager()

    # for fsm to initialize
    @startup()
    return

  #------------------ begin of events ------------------
  onbeforestartup: (event, from, to) ->
    @log.debug "Signal", "START   EVENT: startup!"
    return

  onbeforeconnect: (event, from, to) ->
    @log.debug "Signal", "START   EVENT: connect!"
    @triggerEvent JSignalEvent.BEFORECONNECT
    return

  onbeforedetect: (event, from, to) ->
    @log.debug "Signal", "START   EVENT: detect!"
    return

  onbeforedisconnect: (event, from, to) ->
    @log.debug "Signal", "START   EVENT: disconnect!"
    return

  onbeforeauthenticate: (event, from, to) ->
    @log.debug "Signal", "START   EVENT: authenticate!"
    @triggerEvent JSignalEvent.BEFOREAUTHENTICATE
    return

  onleavedisconnected: (event, from, to) ->
    @log.debug "Signal", "LEAVE   STATE: disconnected"
    self = this
    try
      url = ((if self.isSecure then "wss" else "ws")) + "://" + self.host + ":" + self.port
      @socket = new WebSocket(url, null,
        debug: true
        devel: true
      )
      self.url = url

      #add listeners
      @socket.addEventListener "message", @messageHandler.bind(this)
      @socket.addEventListener "open", (ev) ->
        # enter connected state
        # NOTE: If you decide to cancel the ASYNC event, you can call fsm.transition.cancel();
        @transition()
        return

      @socket.addEventListener "error", (e) ->
        @log.info "Server " + self.uuid, self.url, "error: ", e.code + " : " + e.reason
        @disconnect()
        return

      @socket.addEventListener "close", (e) ->
        self.disconnect()
        @log.info "Server " + self.uuid, self.url, "disconnected", "error: " + e.code + " : " + e.reason
        switch e.code
          when 1011
            @log.info "Server " + self.uuid, self.url, "is idle! Please restart it."

    catch e
      @log.error e
      self.disconnect()
      return false

    # tell StateMachine to defer next state until we call transition
    StateMachine.ASYNC

  onleaveconnected: (event, from, to) ->

    # start to detect local ips
    Detected = (ips) ->
      # save ips
      self.localIPs = ips
      @log.info "Detected", "all addr: ", ips
      self.transition()
      return
    @log.debug "Signal", "LEAVE   STATE: connected"
    self = this
    detectLocalIPs self, Detected
    StateMachine.ASYNC

  onleavedetected: (event, from, to) ->

    # set callback for auth message
    responseHandler = (e) ->
      response = JSON.parse(e.data)
      if response.cmd is JRtcCMD.AUTH
        self.socket.removeEventListener "message", responseHandler
        # received response of auth
        if response["data"]["success"] and (response["data"]["success"] is true)
          # get the authToken
          if response["data"]["authToken"]
            #@log.info('Signal', 'Got auth token: ', response['data']['authToken']);
            @opts.set('authToken', response["data"]["authToken"])
            @opts.set('tokenExpiresAt', parseInt(response["data"]["expiresAt"]))
          self.transition()
        else
          self.transition().cancel()
      return
    @log.debug "Signal", "LEAVE   STATE: detected"
    self = this
    self.socket.addEventListener "message", responseHandler

    # need to check if token have existed
    #          var isExisted = ((settings.authToken === null) || (settings.tokenExpiresAt <= Date.now()))
    #                          ? false : true;
    self.sendAuthentication()
    StateMachine.ASYNC

  onleaveauthenticated: (event, from, to) ->
    @log.debug "Signal", "LEAVE   STATE: authenticated"
    return

  onconnected: (event, from, to) ->
    @log.debug "Signal", "ENTER   STATE: connected"
    return

  ondetected: (event, from, to) ->
    @log.debug "Signal", "ENTER   STATE: detected"
    return

  ondisconnected: (event, from, to) ->
    @log.debug "Signal", "ENTER   STATE: disconnected"
    return

  onauthenticated: (event, from, to) ->
    @log.debug "Signal", "ENTER   STATE: authenticated"
    return

  onstartup: (event, from, to) ->
    @log.debug "Signal", "FINISH  EVENT: startup!"
    return

  # onconnect = on after connect event
  onconnect: (event, from, to) ->
    @log.debug "Signal", "FINISH  EVENT: connect!"
    if @is("connected")
      @triggerEvent JSignalEvent.CONNECTED

      # now start detect event
      @detect()
    return


  # on after detect event
  ondetect: (event, from, to) ->
    @log.debug "Signal", "FINISH  EVENT: detect!"
    if @is("detected")
      @triggerEvent JSignalEvent.DETECTED

      # now start authenticate event
      @authenticate()
    return

  ondisconnect: (event, from, to) ->
    self = this
    @log.debug "Signal", "FINISH  EVENT: disconnect!"
    if @is("disconnected")
      @socket = null
      setTimeout (->
        self.triggerEvent JSignalEvent.DISCONNECTED
        return
      ), 300
    return

  onauthenticate: (event, from, to) ->
    @log.debug "Signal", "FINISH  EVENT: authenticate!"
    @triggerEvent JSignalEvent.AUTHENTICATED  if @is("authenticated")
    return

  onchangestate: (event, from, to) ->
    @log.info "Signal", "STATE CHANGED: from [" + from + "] to [" + to + "]"
    return


  #------------------ end of events ------------------
  acceptPartitipantRequest: (data) ->
    from = data.from
    if data.to and (data.to is @opts.get('uuid'))

      # TODO: need to judge can we create new offer
      @log.info "Peer " + @opts.get('uuid'), "Received invite from ", data.from

      # create the offer
      @psm._peers[from] = new JRtcOffer(from, @uuid, @events)  if from
    return

  triggerEvent: (status, peer) ->
    eventInfo = {}
    eventInfo.peer = peer  if peer

    #this.psm.push(peer);

    # can not use this.emitter.emit , why ?
    # next line is ok
    # (this.emitter.emit.bind(this))(status, eventInfo, this.callback);
    @emit status, eventInfo
    return


  # private function
  send: (cmd, data) ->
    self = this
    try
      throw new Error("Not connected to server, current status: " + self.inStatus)  if not self.is("connected") and not self.is("authenticated") and not self.is("detected")
      throw new Error("Data is not an object/empty!")  if not data or not _.isObject(data) or _.isEmpty(data)
      throw new Error("Command is not defined!")  unless cmd

      # add cmd to data
      data.cmd = cmd

      # add auth token
      data.authToken = @opts.get('authToken')

      #send data to websocket as String
      @socket.send JSON.stringify(data)
      @log.debug "Signal " + @uuid, "Sent ", data.cmd, data
      return true
    catch e
      @log.error e
      return false
    return

  sendAuthentication: ->
    @send JRtcCMD.AUTH,
      from: @uuid
      apiKey: @opts.get('apiKey')
      ips: @localIPs
      host: window.location.host


  sendPeerOffer: (targetPeerUuid, offer) ->
    @send JRtcCMD.OFFER,
      from: @opts.get('uuid')
      to: targetPeerUuid
      offer: offer


  sendPeerAnswer: (targetPeerUuid, answer) ->
    @send JRtcCMD.ANSWER,
      from: @opts.get('uuid')
      to: targetPeerUuid
      answer: answer


  sendPeerCandidate: (target, candidate) ->
    @send JRtcCMD.CANDIDATE,
      from: @opts.get('uuid')
      to: target
      candidate: candidate


  sendParticipantRequest: (target) ->
    @send JRtcCMD.PARTICIPANT,
      from: @opts.get('uuid')
      to: target

  sendQueryResource: (target, resid, url) ->
      @send JRtcCMD.QUERY,
          from: @opts.get('uuid')
          resid: resid
          url: url


  getAllRelatedPeers: ->
    @send JRtcCMD.LIST,
      from: @opts.get('uuid')


  messageHandler: (e) ->
    self = this
    data = JSON.parse(e.data)
    cmd = data.cmd
    @log.debug "Signal " + @uuid, "Received", data.cmd, data.data
    switch cmd.toLowerCase()
      when JRtcCMD.CANDIDATE
        @emit JRtcCMD.CANDIDATE,
          from: @uuid
          to: data.data.to
          candidate: data.data.candidate
      when JRtcCMD.SDP
        #this.emit(CMD.SDP, { from: self.uuid, to: data.data.to, sdp: data.data.sdp });
        @onsdp data.data # include: from, to, sdp.type, sdp.sdp
      when JRtcCMD.PARTICIPANT
        @acceptPartitipantRequest data.data


  #this.emit(JRtcCMD.PARTICIPANT, { from: self.uuid, to: data.data.to });
  serialize: ->
    host: @host
    isSecure: @isSecure
    port: @port

  getStatus: ->
    @current

  saveIPs: (ips) ->
    self = this
    self.localIPs = ips
    @log.info "DetectIPs", "all addr: ", ips
    return

  # connect to peer
  createPeer: (peerId) ->
    new JRtcPeerSession(this, peerId)

  createPeerManager: ->
    new JRtcPeerSessionManager(this)


StateMachine.create
  target: JRtcSignaler.prototype
  error: (eventName, from, to, args, errorCode, errorMessage) ->
    "event " + eventName + " was naughty :- " + errorMessage

  events: [
    {
      name: "startup"
      from: "none"
      to: "disconnected"
    }
    {
      name: "connect"
      from: "disconnected"
      to: "connected"
    }
    {
      name: "detect"
      from: "connected"
      to: "detected"
    }
    {
      name: "authenticate"
      from: "detected"
      to: "authenticated"
    }
    {
      name: "disconnect"
      from: [
        "connected"
        "detected"
        "authenticated"
      ]
      to: "disconnected"
    }
  ]

