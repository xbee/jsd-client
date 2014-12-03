PeerConnection = function (skt, pm, id, req, _0xb539x4e) {
    this.socket = skt;
    this.dataManager = pm.dataManager;
    this.peerManager = pm;
    this.id = id;
    this.request = req;
    this.isAnswerCreated = false;
    this.data = [];
    this.fileFoundScope = null;
    this.fileFoundCallback = null;
    this.fileNotFoundCallback = null;
    if (_0xb539x4e == undefined || _0xb539x4e) {
        this.data[this.request.getHash()] = new PeerBinaryUtil.FileByteArray(this.request);
    }
    ;
    this.isOpened = false;
    this.isInit = false;
    this.callbackList = [];
    this.messageQueue = new Queue();
    this.isSendingMessage = false;
    this.intervalId;
    this.channel;
    this.t = new Date().getTime();
    var _0xb539x4f = {
        "\x69\x63\x65\x53\x65\x72\x76\x65\x72\x73": [{"\x75\x72\x6C": "stun:stun.l.google.com:19302"}, {
            "\x75\x72\x6C": "turn:numb.viagenie.ca",
            "\x63\x72\x65\x64\x65\x6E\x74\x69\x61\x6C": "Breakfast1905!",
            "\x75\x73\x65\x72\x6E\x61\x6D\x65": "emreesirik@gmail.com"
        }]
    };
    if (window.mozRTCPeerConnection) {
        this.pc = new RTCPeerConnection();
    } else {
        this.pc = new RTCPeerConnection(_0xb539x4f);
    }
    ;
    this.pc.candidates = {};
};
PeerConnection.STRING_MESSAGE = "js:";
PeerConnection.SLICE = 10000;
PeerConnection.ACTION_REQUEST_FILE = "request_file";
PeerConnection.prototype.setFileEventCallback = function (_0xb539x37, _0xb539x13, _0xb539x50) {
    this.fileFoundScope = _0xb539x37;
    this.fileFoundCallback = _0xb539x13;
    this.fileNotFoundCallback = _0xb539x50;
};
PeerConnection.prototype.sendJson = function (data) {
    this.channel.send(PeerConnection.STRING_MESSAGE + JSON.stringify(data));
};
PeerConnection.prototype.requestFile = function (req) {
    this.sendJson(PeerAction.requestFileObject(req.getUrl()));
    this.data[req.getHash()] = new PeerBinaryUtil.FileByteArray(req);
};
PeerConnection.prototype.initialize = function (cb) {
    if (this.isInit) {
        cb(this.isOpened);
    } else {
        this.callbackList.push(cb);
    }
    ;
};
PeerConnection.prototype.getQueueSize = function () {
    return this.messageQueue.getLength();
};
PeerConnection.prototype.createAnswer = function (answer) {
    if (!this.isAnswerCreated) {
        this.isAnswerCreated = true;
        this.pc.setRemoteDescription(this.offerSdp);
        this.pc.addIceCandidate(answer);
        var that = this;
        this.pc.createAnswer(function (sdp) {
            that.pc.setLocalDescription(sdp);
            that.socket.sendAction(PeerAction.ANSWER_SDP, JSON.stringify(sdp), that.id);
        }, function (_0xb539x53) {
            that.fileNotFoundCallback(that.fileFoundScope, that.request);
        });
        this.pc.onicecandidate = function (cand) {
            if (cand.candidate) {
                PeerStatistic.log("Offer with ICE candidates: " + cand.candidate);
                that.socket.sendAction(PeerAction.ANSWER_CANDIDATE, JSON.stringify(cand.candidate), that.id);
            }
            ;
        };
        this.pc.ondatachannel = function (evt) {
            PeerStatistic.log("channel on data");
            receiveChannel = evt.channel;
            that.channel = receiveChannel;
            receiveChannel.binaryType = "arraybuffer";
            receiveChannel.onopen = function (_0xb539x54) {
                var _0xb539x31 = new Date().getTime() - that.t;
                that.t = new Date().getTime();
                PeerStatistic.log("channel opened" + _0xb539x31 + " ms.");
                that.isInit = true;
                that.isOpened = true;
                that.fireCallbacks(true);
            };
            receiveChannel.onmessage = function (msg) {
                that.onMessage(msg);
            };
        };
    } else {
        this.addCandidate(answer);
    }
    ;
};
PeerConnection.prototype.setOfferSdp = function (sdp) {
    this.offerSdp = sdp;
};
PeerConnection.prototype.setRemoteDescription = function (sdp) {
    this.pc.setRemoteDescription(sdp);
};
PeerConnection.prototype.addCandidate = function (candi) {
    this.pc.addIceCandidate(candi);
};
PeerConnection.prototype.createOffer = function () {
    var that = this;
    this.pc.onicecandidate = function (evt) {
        PeerStatistic.log("---onicecandidate_" + evt.candidate);
        if (evt.candidate) {
            PeerStatistic.log("Offer with ICE candidates: " + evt.candidate);
            that.socket.sendAction(PeerAction.OFFER_CANDIDATE, JSON.stringify(evt.candidate), that.id);
        }
        ;
    };
    var _0xb539x57 = null;
    if (webrtcDetectedBrowser == "chrome") {
        _0xb539x57 = {reliable: false, outOfOrderAllowed: true, maxRetransmitNum: 0};
    } else {
        _0xb539x57 = {reliable: true};
    }
    ;
    var chan = this.pc.createDataChannel("sendChannel", _0xb539x57);
    this.channel = chan;
    chan.binaryType = "arraybuffer";
    chan.onopen = function () {
        that.sendFile(that.request);
        PeerStatistic.log("---channel_open");
        that.isInit = true;
        that.isOpened = true;
        that.fireCallbacks(true);
        PeerStatistic.log("channel opened");
    };
    chan.onmessage = function (msg) {
        that.onMessage(msg);
        PeerStatistic.log("---channel_onmessage");
    };
    this.pc.oniceconnectionstatechange = function (evt) {
        PeerStatistic.log("---onicecandidate_" + evt);
    };
    this.pc.createOffer(function (sdp) {
        PeerStatistic.log("---createoffer_");
        that.pc.setLocalDescription(sdp);
        that.socket.sendAction(PeerAction.OFFER_SDP, JSON.stringify(sdp), that.id);
    }, function (_0xb539x53) {
        PeerStatistic.log("---errorrr_");
        that.fileNotFoundCallback(that.fileFoundScope, that.request);
    });
};
PeerConnection.prototype.sendFile = function (req) {
    var data = this.dataManager.getBinaryData(req.getUrl());
    this.splitDataAndPutQueue(this.channel, data, this.pc, req.getHash());
};
PeerConnection.prototype.splitDataAndPutQueue = function (chan, data, pc, _0xb539x5a) {
    var _0xb539x5b = PeerBinaryUtil.calculateLoopSize(data.length, PeerConnection.SLICE);
    var _0xb539x5c = PeerBinaryUtil.longToByteArray(_0xb539x5a);
    for (var _0xb539x1b = 0; _0xb539x1b < _0xb539x5b; _0xb539x1b++) {
        var _0xb539x5d = PeerBinaryUtil.longToByteArray(_0xb539x1b);
        var _0xb539x2d = _0xb539x1b * PeerConnection.SLICE;
        var _0xb539x2e = _0xb539x2d + PeerConnection.SLICE < data.length ? _0xb539x2d + PeerConnection.SLICE : data.length;
        var _0xb539x1f = new PeerBinaryUtil.ByteArray((_0xb539x2e - _0xb539x2d) + _0xb539x5c.length + _0xb539x5d.length);
        _0xb539x1f.addArray(_0xb539x5c);
        _0xb539x1f.addArray(_0xb539x5d);
        _0xb539x1f.addArray(data, _0xb539x2d, _0xb539x2e);
        this.enqueueMessage(_0xb539x1f.getArray());
    }
    ;
};
PeerConnection.prototype.enqueueMessage = function (msg) {
    this.messageQueue.enqueue(msg);
    if (this.messageQueue.getLength() == 1 && !this.isSendingMessage) {
        var _0xb539x5e = 10;
        var that = this;
        that.sendNextMessage();
    }
    ;
};
PeerConnection.prototype.sendNextMessage = function () {
    var data = this.messageQueue.dequeue();
    PeerStatistic.addUploadSize(data.length);
    this.channel.send(data);
    if (this.messageQueue.getLength() == 0) {
        clearInterval(this.intervalId);
    }
    ;
};
PeerConnection.prototype.onMessage = function (msg) {
    if (msg.data.slice(0, PeerConnection.STRING_MESSAGE.length) == PeerConnection.STRING_MESSAGE) {
        var _0xb539x15 = JSON.parse(msg.data.slice(PeerConnection.STRING_MESSAGE.length, msg.data.length));
        if (_0xb539x15.action == PeerConnection.ACTION_REQUEST_FILE) {
            this.sendFile(this.peerManager.requestCallback[_0xb539x15.url]);
        }
        ;
        PeerStatistic.log("channel action" + _0xb539x15.action);
    } else {
        var _0xb539x1f = new Uint8Array(msg.data);
        var _0xb539x5c = new PeerBinaryUtil.ByteArray(PeerBinaryUtil.LONG_BYTE_LENGTH);
        _0xb539x5c.addArray(_0xb539x1f, 0, PeerBinaryUtil.LONG_BYTE_LENGTH);
        var _0xb539x19 = _0xb539x5c.getLong();
        var _0xb539x5d = new PeerBinaryUtil.ByteArray(PeerBinaryUtil.LONG_BYTE_LENGTH);
        _0xb539x5d.addArray(_0xb539x1f, PeerBinaryUtil.LONG_BYTE_LENGTH, PeerBinaryUtil.LONG_BYTE_LENGTH * 2);
        var _0xb539x16 = _0xb539x5d.getLong();
        if (_0xb539x16 == 0) {
            this.t = new Date().getTime();
        }
        ;
        var _0xb539x60 = this.data[_0xb539x19];
        var _0xb539x61 = _0xb539x60.push(_0xb539x16, _0xb539x1f, PeerBinaryUtil.LONG_BYTE_LENGTH * 2, msg.data.byteLength);
        if (_0xb539x61) {
            this.fileFoundCallback(this.fileFoundScope, _0xb539x60.getArray(), _0xb539x60["getUrl"]());
            var dt = new Date().getTime() - this.t;
            PeerStatistic.log("message" + dt + " ms.");
        }
        ;
    }
    ;
};
PeerConnection.prototype.fireCallbacks = function (b) {
    for (var idx = 0; idx < this.callbackList.length; idx++) {
        this.callbackList[idx](b);
    }
    ;
    this.callbackList = [];
};
