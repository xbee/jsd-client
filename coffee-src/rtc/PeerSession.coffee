
#= require JBase

JRtcPeerEvent =
  CONNECTING: "peer:connecting"
  HOLD: "peer:hold"
  UNHOLD: "peer:unhold"
  REJECT: "peer:reject"
  CONNECT: "peer:connect"
  DISCONNECT: "peer:disconnect"
  MESSAGE: "peer:message"
  ADDSTREAM: "stream:add"

channelConstraint = undefined

class JRtcPeerSession extends JBase
  settings: jsd.util.settings
  options:
    TIMEOUT_WAIT_TIME: 10000
    QUEUE_RETRY_TIME: 75
    optionalArgument:
      optional: [DtlsSrtpKeyAgreement: true]

    offerAnswerConstraints:
      optional: []
      mandatory:
        OfferToReceiveAudio: false
        OfferToReceiveVideo: false

    connectionConstraint:
      optional: [
        {
          RtpDataChannels: true
        }
        {
          DtlsSrtpKeyAgreement: true
        }
      ]
      mandatory:
        OfferToReceiveAudio: false
        OfferToReceiveVideo: false

  constructor: (@sandbox, server, @peerId) ->
    super(@sandbox)
    ###*
    @property connection
    @type {RTCPeerCpnnection}
    ###
    @connection = `undefined`

    ###*
    @property channel
    @type {RTCDataChannel}
    ###
    @channel = `undefined`

    ###*
    Indicates if there is a stable conenction to this peer
    @property isConnected
    @default false
    @type {Boolean}
    ###

    @isConnected = false
    ###*
    Whether this peer is the initiator of a connection
    @property isSource
    @default false
    @type {Boolean}
    ###

    # this.isSource = false;
    ###*
    Whether this peer is the initiator of a connection
    @property isTarget
    @default false
    @type {Boolean}
    ###

    # this.isTarget = false;
    ###*
    List of timers for synchronization
    @type {Array}
    ###
    @syncTimers = []

    # peerId not equals uuid, it should be auto increment int
    if peerId
      @peerId = peerId
      @uuid = @peerId
    @server = server  if server

    # Protocol switch SRTP(=default) or SCTP
    if settings.protocol.toLowerCase() is "sctp"
      @protocol = "sctp"
      logger.debug "Signal " + @peerId, "Using SCTP"
      connectionConstraint =
        optional: [
          {
            RtpDataChannels: false
          }
          {
            DtlsSrtpKeyAgreement: true
          }
        ]
        mandatory:
          OfferToReceiveAudio: false
          OfferToReceiveVideo: false

      channelConstraint =
        reliable: false
        maxRetransmits: 0
    else
      @protocol = "srtp"
      logger.debug "Signal " + @peerId, "Using SRTP"
    return


  ###*
  @private
  @method timerCompleteHandler
  ###
  timerCompleteHandler: (e) ->
    _self = this
    unless @isConnected
      _self.timeout = Date.now()
      _self.emit "peer:timeout", _self
    else
      _self.timeout = `undefined`
    return


  # Event Handler Start

  ###*
  Send data via a WebRTC-Channel to a peer

  @method send
  @param data
  @param {Boolean} reliable Should a retry occur if the transmission fails?
  ###
  send: (data, reliable) ->
    reliable = false  if typeof reliable is "undefined"
    _self = this

    #      _self.channel = answererDataChannel || offererDataChannel;
    jsonString = undefined
    if not _self.isConnected or _self.channel.readyState isnt "open"
      logger.error "Peer " + _self.peerId, "Attempt to send, but channel is not open!"
      return

    # Actually it should be possible to send a blob, but it isn't
    # https://code.google.com/p/webrtc/issues/detail?id=2276
    if data instanceof Blob
      _self.channel.send data
    else
      try
        jsonString = JSON.stringify(data)

      # We won't retry as this always will fail
      try
        _self.channel.send jsonString
      catch e
        if reliable
          logger.error "Peer " + _self.peerId, "Error while sending reliable msg, queuing data"

          # Retry again
          _.delay _self.send, QUEUE_RETRY_TIME, data
    return

  sendFile: (uuid, chunk, pos) ->
    pos = pos or 0

    # Send as blob, wrapped with info
    if chunk instanceof Blob
      @send
        type: "file:push:start"
        uuid: uuid
        pos: pos

      @send chunk
      @send
        type: "file:push:end"
        uuid: uuid

    else
      @send
        type: "file:push"
        uuid: uuid
        chunk: chunk
        pos: pos

    return


  ###*
  @method serialize
  @return {Object}
  ###
  serialize: ->
    uuid: @uuid
    server: @server


  ###*
  @method broadcast
  ###
  broadcast: (type, data) ->
    _self = this

    # Add broadcast prefix?
    type = "broadcast:" + type  if type.indexOf("broadcast:") < 0
    _self.send
      type: type
      data: data

    return


  ###*
  @method disconnect
  ###
  disconnect: ->
    @isConnected = false
    @channel.close()
    @connection.close()
    return

