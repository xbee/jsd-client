#
# *  get all of local ip address
#
detectLocalIPs = (ctx, cb) ->
  try
    return false  unless window.navigator.onLine
    iceEnded = false
    addrs = Object.create(null)
    addrs["0.0.0.0"] = false
    addAddress = (newAddr) ->
      return  if newAddr of addrs
      addrs[newAddr] = true
      return

    grepSDP = (sdp) ->
      sdp.split("\r\n").forEach (line) ->
        if ~line.indexOf("a=candidate")
          parts = line.split(" ")
          addr = parts[4]
          type = parts[7]
          addAddress addr  if type is "host"
        else if ~line.indexOf("candidate:")
          parts = line.split(" ")
          addr = parts[4]
          type = parts[7]
          addAddress addr  if type is "host"
        else if ~line.indexOf("c=")
          parts = line.split(" ")
          addr = parts[2]
          addAddress addr
        return

      return


    # typescript do not support polyfill
    rtc = new RTCPeerConnection(iceServers: [])
    if window.mozRTCPeerConnection
      rtc.createDataChannel "",
        reliable: false


    # for chrome: many times
    # for firefox: evt.candidate will be null
    rtc.onicecandidate = (evt) ->

      # for chrome: when offline, it will be called for ever until online
      # and the candidate is null,
      if evt.candidate isnt null

        #logger.log('DetectIPs', 'onicecandidate: ', evt.candidate);
        grepSDP evt.candidate.candidate
      else

        # TODO: need more test to check the state
        if rtc.iceGatheringState is "complete"

          # for chrome, if there is no network,
          # it will be called many times , so we insure just one call
          unless iceEnded

            # here we knew it is time to call callback
            displayAddrs = Object.keys(addrs).filter((k) ->
              addrs[k]
            )

            #          var xs = displayAddrs.join(', ');
            #          logger.log('DetectIPs', 'addrs: ', xs);
            if displayAddrs
              cb.apply ctx, [displayAddrs.sort()]
              iceEnded = true
          rtc.onicecandidate = null
          rtc = null
      return

    rtc.createOffer ((offerDesc) ->

      #logger.log('DetectIPs', 'createOffer: ', offerDesc.sdp);
      grepSDP offerDesc.sdp
      rtc.setLocalDescription offerDesc
      return
    ), (e) ->
      logger.error "DetectIPs", "createOffer failed: ", e
      return

  catch e
    logger.error "DetectIPs", "failed for: ", e
    return false
  true
