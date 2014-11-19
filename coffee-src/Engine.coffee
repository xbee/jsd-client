
util.namespace 'J.Util', (exports) ->
  ###*
    Simple feature testing of the application requirements
    as a lot of the used technologies are still working drafts
    and for from standard

    @private
    @method getDeviceCapabilities
    @return {Object}
  ###
  exports.getDeviceCapabilities = ->
    requirements = [
      {
        name: "JSON"
        test: JSON
      }
      {
        name: "Blob"
        test: Blob
      }
      {
        name: "localStorage"
        test: localStorage
      }
      {
        name: "indexedDB"
        test: indexedDB
      }
      {
        name: "GeoLocation API"
        test: navigator.geolocation
      }
      {
        name: "WebRTC API"
        test: (window.mozRTCPeerConnection or window.webkitRTCPeerConnection or RTCPeerConnection)
      }
    ]

    #{ name: 'FileSystem API', test: (navigator.webkitPersistentStorage || window.webkitStorageInfo) }
    features = [
      name: "Object.observe"
      test: Object.observe
    ]
    result =
      isCompatible: false
      missingFeatures: []
      missingRequirements: []

    # These are really needed!
    requirements.forEach (requirement) ->
      result.missingRequirements.push requirement.name  unless requirement.test
      return

    # Those features could be compensated by (polyfills/shims/shivs)
    # if the browser doesn't support them
    features.forEach (feature) ->
      result.missingFeatures.push feature.name  unless feature.test
      return

    # Finally set a single compatibility flag
    result.isCompatible = result.missingRequirements.length is 0
    result


util.namespace 'J', (exports) ->

    class FileInfo
        constructor: ->
            @chunkRead = 0 # current readed chunks
            @hasEntireFile = false
            @numOfChunksInFile = 0
            return

    class Engine extends Mediator
      logger: J.logger
      settings: J.settings

      constructor: (@sandbox) ->
        @pendingSwarms = []
        @clientId

        #this.initiateClient();
        #this.registerEvents();
        @chunkRead = 0
        @BW_INTERVAL = 500
        @lastDownCycleTime = Date.now()
        @lastUpCycleTime
        @totalUpSinceLastCycle = 0
        @lastCycleUpdateSizeInBytes = 0
        @firstTime = true
        @startTime
        @totalAvarageBw
        @lastReportTime = 0
        @lastStatCalcTime = 0
        @statsCalculator = null

        #peer5.setLogLevel(peer5.config.LOG_LEVEL);

        #monitor the sendQueues
        @cron_interval_id = window.setInterval(@cron, jsd.config.MONITOR_INTERVAL, this)
        @settings = J.settings
        @signaler = {}
        @files = []

        # key: filename, value: fileinfo obj
        @fileInfos = {}
        @clientId = J.settings.uuid = jsd.util.getUid()
        logger.log "Signal", "Uuid", J.settings.uuid
        try

          ###*
          Event-Handler, called when Network state changes

          @private
          @method networkConnectivityStateChangeHandler
          @param {Object} e
          ###
          networkConnectivityStateChangeHandler = (e) ->
            if e.type is "online"
              logger.log "Network", "online!"
              logger.log "Network", "try to reconnecting ..."
              app.start()
            else
              logger.warn "Network", "offline!"
              app.stop()
            return
          device = J.Util.getDeviceCapabilities()
          unless device.isCompatible
            msg = "The following features are required but not supported by your browser: " + device.missingRequirements.join("\n")
            logger.warn "Jiasudu", msg
            return
          window.addEventListener "offline", networkConnectivityStateChangeHandler
          window.addEventListener "online", networkConnectivityStateChangeHandler
        catch e
          logger.warn "Jiasudu", "Your browser is not supported."
        return

      createSignalSession: ->
        signaler = new J.Signaler(J.settings.uuid, J.settings.apiKey)
        signaler

      createPeerConnection: (peerid) ->
        @signaler.sendParticipantRequest peerid
        return

      getPeerById: (peerid) ->
        if @signaler and @signaler.psm
          @signaler.psm.getPeerByUuid peerid
        else
          null

      getDataChannelByPeerId: (peerid) ->
        peer = @getPeerById(peerid)
        if peer
          peer.channel
        else
          null

      setOptions: (options) ->
        if @signaler and options
          options.signaler_onConnected and @signaler.on(J.SignalEvent.CONNECTED, options.signaler_onConnected.bind(this))
          options.signaler_onConnecting and @signaler.on(J.SignalEvent.BEFORECONNECT, options.signaler_onConnecting.bind(this))
          options.signaler_onAuthenticating and @signaler.on(J.SignalEvent.BEFOREAUTHENTICATE, options.signaler_onAuthenticating.bind(this))
          options.signaler_onAuthenticated and @signaler.on(J.SignalEvent.AUTHENTICATED, options.signaler_onAuthenticated.bind(this))
          options.signaler_onOffer and @signaler.on(J.CMD.OFFER, options.signaler_onOffer.bind(this))
        return


      ###*
      Start

      @method start
      @chainable
      @param config Configuration-Object
      @returns {Object}
      ###
      start: (config) ->

        # 1. create signaler
        @signaler = @createSignalSession()

        # 2. set signaler callbacks
        @setOptions config

        # 3. signaler connect
        # connect to signal server
        @signaler.connect()
        @


      ###*
      Stop clent
      @method stop
      @chainable
      ###
      stop: ->
        @signaler.disconnect()
        @

    exports.FileInfo = FileInfo
    exports.Engine = Engine
