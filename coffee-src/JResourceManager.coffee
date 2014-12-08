
JResourceManager = (name, servUrl) ->
    @browserSupport = @isBrowserSupport()
    @applicationName = name
    @peerServerUrl = (if servUrl? then servUrl else JResourceManager.PEER_WEBSOCKET_URL)
    @dataManager = new PeerDataManager()
    @requestCallback = {}
    @socket = new PeerSocket(@peerServerUrl + JResourceManager.SIGNALING_URL, name, this)  if @browserSupport
    return

JResourceManager.PEER_WEBSOCKET_URL = location.origin.replace(/^http/, "ws") + "/PeerMeshServer"
JResourceManager.SIGNALING_URL = "/signaling"
JResourceManager.BLOB_TYPE = "blob"
JResourceManager.TEXT_TYPE = "text"
JResourceManager.IMAGE_TYPE = "image"
JResourceManager.ARRAY_BUFFER_TYPE = "arraybuffer"
JResourceManager.JSON_TYPE = "json"
JResourceManager::request = (url, cb, dt) ->
    data = @dataManager.getData(url, @requestCallback[url])
    req = new PeerRequest(url, cb, dt)
    that = this
    if data?
        PeerStatistic.log "File is in Local Storage!"
        cb data
    else
        unless @browserSupport
            PeerStatistic.log "Browser Does not support webrtc!"
            req.load cb
        else
            @socket.initialize (isFromPeer) ->
                if isFromPeer
                    that.requestPeerServer req
                else
                    that.loadFile req, cb
                return

    return

JResourceManager::getConnectionCount = (cb) ->
    act = action: PeerAction.REQUEST_CON_COUNT
    @socket.send act
    @connectionCountListener = cb
    return


# get file from real server by xhr
JResourceManager::loadFile = (req, cb) ->
    that = this
    t = new Date().getTime()
    req.load (ab) ->
        PeerStatistic.addDownloadSize ab.byteLength, false
        req.setSize ab.byteLength

        # store data to cache and base64 to local storage and return base64
        sdata = that.dataManager.putData(req, ab)
        t = new Date().getTime() - t
        PeerStatistic.log "File is load from real server! " + t + "ms"
        cb sdata
        return

    return


#
JResourceManager::requestPeerServer = (req) ->

    # store the request object
    @requestCallback[req.getUrl()] = req
    @socket.send PeerAction.requestImageObject(req.getUrl())
    return

JResourceManager::fileFound = (pm, data, url) ->
    PeerStatistic.log "file is load from another client" + url

    # fetch request obj
    req = pm.requestCallback[url]
    cmd =
        action: PeerAction.HAS_IMAGE
        file: url
        size: data.length
        hash: req.getHash()


    # report ws server we have a resource
    pm.socket.send cmd
    PeerStatistic.addDownloadSize data.length, true

    # store the file to cache and convert it to base64
    sdata = pm.dataManager.putData(req, data) # base64 data
    # execute the callback
    req.sendCallback sdata
    return

JResourceManager::fileNotFound = (pm, req) ->
    PeerStatistic.log "file not found" + req.getUrl()
    pm.loadFile req, (sdata) ->
        pm.socket.send PeerAction.hasImageObject(req)
        PeerStatistic.log "file is load from server" + req.getUrl()
        req.sendCallback sdata
        return

    return

JResourceManager::isBrowserSupport = ->
    if not WebSocket? or not RTCPeerConnection?
        PeerStatistic.log "Browser does not support websocket or webrtc"
        return false
    true
