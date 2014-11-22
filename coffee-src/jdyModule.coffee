

#= require <Engine.coffee>

# create the helloWorld module
JdyModule = (sandbox) ->

  engine = new JEngine(sandbox, {})

  urlConverter = (url, cb) ->

    # 1. query Tracker
    queryMsg = new JProtocolQuery()
    engine.signaler.send()

    # if have one or more seeder
    # 2.1 then get from peer

    # 2.2 or get from server or keep the origin url ?
    util.loadResourceByXHR url, (blob) ->

      # convert blob to data url
      objectURL = window.URL.createObjectURL(blob)

      # NOTE: objectURL just valid in this scope, outer will fail !!!
      # set image's url
      cb objectURL
      return

    return


  # boot your module
  init = (options) ->

    # start the engine
    try
      logger = JLogger.getInstance()

      # ----------------- event handlers ----------------------
      #
      evts = signaler_onAuthenticated: (event) ->
        peerlistHandler = (e) ->
          response = JSON.parse(e.data)
          if response.cmd is CMD.LIST
            self.signaler.socket.removeEventListener "message", peerlistHandler

            # received response of auth
            if response["data"]["success"] and (response["data"]["success"] is true)
              if response["data"]["peers"]
                pls = response["data"]["peers"]
                logger.log "Signal", "peers: ", JSON.stringify(pls)

                # handle the peer list datas
                for x of pls
                  $("#target").append $("<option>",
                    value: pls[x].id
                    text: pls[x].id
                  )
          return
        logger.debug "Signal", "signaler_onAuthenticated"
        self = this
        @signaler.socket.addEventListener "message", peerlistHandler

        # get the peer list
        @signaler.getAllRelatedPeers()
        return

      engine.start evts
      window.jce = engine
      peer = null
      getPeer = ->
        peerid = $("#target").val()
        if peerid
          engine.getPeerById peerid
        else
          null

      window.peer = peer
      $("#uuid").val engine.settings.uuid
      $("#call").click ->
        target = $("#target").val()
        if target
          engine.createPeerConnection target
        else
          console.error "You need input the target id"
        return

      objectURL = `undefined`
      $("#loadfile").click ->
        unless objectURL
          url = "http://localhost:8081/images/1.jpg"
          load_binary_resource url, (b) ->
            objectURL = URL.createObjectURL(b)
            return

        return

    catch ex
      console.log ex.stack
    return


  # shutdown your module
  destroy = ->

    # stop the engine
    engine.stop()
    return


  # return public module API

  # public fields
  engine: engine

  # public methods
  init: init
  destroy: destroy
  loadResource: urlConverter
