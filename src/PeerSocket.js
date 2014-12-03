PeerDataManager = function () {
    this.cache = [];
    this.size = 0;
};
PeerDataManager.prototype.contains = function (key) {
    if (this.cache[key] != null || PeerStorage.get(key) != null) {
        return true;
    }
    ;
    return false;
};
PeerDataManager.prototype.getData = function (key, req) {
    var ab = this.cache[key];
    var result; // base64
    if (ab != null) {
        if (req != undefined) {
            result = req.convertResponseType(ab);
        } else {
            result = PeerImageUtil.convertByteToBase64(ab);
        }
        ;
    } else {
        result = PeerStorage.get(key);
    }
    ;
    return result;
};
PeerDataManager.prototype.getBinaryData = function (key) {
    var result = this.cache[key];
    if (result == null) {
        var data = PeerStorage.get(key);
        result = PeerImageUtil.convertBase64ToByte(data);
    } else {
        result = new Uint8Array(result);
    }
    ;
    return result;
};
PeerDataManager.prototype.putData = function (req, ab) {
    this.cache[req.getUrl()] = ab;
    PeerStatistic.log("===========" + req.getUrl() + " length:" + ab.byteLength);
    this.size += ab.byteLength;
    var sdata = req.convertBase64(ab);
    PeerStorage.put(req.getUrl(), sdata, req.getHash(), ab.byteLength);
    if (!req.isResponseTypeBase64()) {
        sdata = req.convertResponseType(ab);
    }
    ;
    return sdata;
};
PeerManager = function (name, servUrl) {
    this.browserSupport = this.isBrowserSupport();
    this.applicationName = name;
    this.peerServerUrl = servUrl != null ? servUrl : PeerManager.PEER_WEBSOCKET_URL;
    this.dataManager = new PeerDataManager();
    this.requestCallback = new Object();
    if (this.browserSupport) {
        this.socket = new PeerSocket(this.peerServerUrl + PeerManager.SIGNALING_URL, name, this);
    }
    ;
};
PeerManager.PEER_WEBSOCKET_URL = location.origin.replace(/^http/, "ws") + "/PeerMeshServer";
PeerManager.SIGNALING_URL = "/signaling";
PeerManager.BLOB_TYPE = "blob";
PeerManager.TEXT_TYPE = "text";
PeerManager.IMAGE_TYPE = "image";
PeerManager.ARRAY_BUFFER_TYPE = "arraybuffer";
PeerManager.JSON_TYPE = "json";
PeerManager.prototype.request = function (url, cb, dt) {
    var data = this.dataManager.getData(url, this.requestCallback[url]);
    var req = new PeerRequest(url, cb, dt);
    var that = this;
    if (data != null) {
        PeerStatistic.log("File is in Local Storage!");
        cb(data);
    } else {
        if (!this.browserSupport) {
            PeerStatistic.log("Browser Does not support webrtc!");
            req.load(cb);
        } else {
            this.socket.initialize(function (isFromPeer) {
                if (isFromPeer) {
                    that.requestPeerServer(req);
                } else {
                    that.loadFile(req, cb);
                }
                ;
            });
        }
        ;
    }
    ;
};
PeerManager.prototype.getConnectionCount = function (cb) {
    var act = {action: PeerAction.REQUEST_CON_COUNT};
    this.socket.send(act);
    this.connectionCountListener = cb;
};
PeerManager.prototype.loadFile = function (req, cb) {
    var that = this;
    var t = new Date().getTime();
    req.load(function (ab) {
        PeerStatistic.addDownloadSize(ab.byteLength, false);
        req.setSize(ab.byteLength);
        var sdata = that.dataManager.putData(req, ab);
        t = new Date().getTime() - t;
        PeerStatistic.log("File is load from real server! " + t + "ms");
        cb(sdata);
    });
};
PeerManager.prototype.requestPeerServer = function (req) {
    this.requestCallback[req.getUrl()] = req;
    this.socket.send(PeerAction.requestImageObject(req.getUrl()));
};
PeerManager.prototype.fileFound = function (pm, data, url) {
    PeerStatistic.log("file is load from another client" + url);
    var req = pm.requestCallback[url];
    var cmd = {
        action: PeerAction.HAS_IMAGE,
        file: url,
        size: data.length,
        hash: req.getHash()
    };
    pm.socket.send(cmd);
    PeerStatistic.addDownloadSize(data.length, true);
    var sdata = pm.dataManager.putData(req, data);// base64 data
    req.sendCallback(sdata);
};
PeerManager.prototype.fileNotFound = function (pm, req) {
    PeerStatistic.log("file not found" + req.getUrl());
    pm.loadFile(req, function (sdata) {
        pm.socket.send(PeerAction.hasImageObject(req));
        PeerStatistic.log("file is load from server" + req.getUrl());
        req.sendCallback(sdata);
    });
};
PeerManager.prototype.isBrowserSupport = function () {
    if (WebSocket == undefined || RTCPeerConnection == null) {
        PeerStatistic.log("Browser does not support websocket or webrtc");
        return false;
    }
    ;
    return true;
};
