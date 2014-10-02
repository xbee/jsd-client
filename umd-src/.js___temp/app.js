define(['require', 'exports', 'module', 'urequire', 'observe-js', 'sockjs-client'], function (require, exports, module) {
  

var __isAMD = !!(typeof define === "function" && define.amd), __isNode = typeof exports === "object", __isWeb = !__isNode;
(function (factory) {
  if (typeof exports === "object") {
    var nr = new (require("urequire")).NodeRequirer("app", module, __dirname, ".");
    module.exports = factory(nr.require, exports, module, exports, nr.require("lodash"), nr.require("q"), nr.require("node-uuid"));
  } else if (typeof define === "function" && define.amd) {
    define("jsd", [
      "require",
      "exports",
      "module",
      "exports",
      "lodash",
      "q",
      "node-uuid",
      "observe-js",
      "sockjs-client"
    ], factory);
  } else
    throw new Error("uRequire: Loading UMD module as <script>, without `build.noLoaderUMD`");
}.call(this, function (require, exports, module, exports, _, Q, nuuid) {
  require("observe-js");
  require("sockjs-client");
  var logger = console;
  var Uuid = function () {
    function Uuid() {
    }
    Uuid.generate = function () {
      return nuuid.v4();
    };
    Uuid.isValid = function (uuid) {
      return Uuid._format.test(uuid);
    };
    Uuid._format = new RegExp("/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i");
    return Uuid;
  }();
  var SettingModel = function () {
    function SettingModel() {
      this.maxPeers = 3;
      this.maxFactories = 4;
      this.maxWorkers = 1;
      this.protocol = "sctp";
      this.iceServers = [
        { url: "stun:stun.l.google.com:19302" },
        { url: "stun:stun.turnservers.com:3478" }
      ];
      this.signalServers = [{
          host: "localhost",
          isSecure: false,
          port: 3080
        }];
      this.syncInterval = 3600000;
      this.authToken = Uuid.generate();
      this.uuid = Uuid.generate();
    }
    return SettingModel;
  }();
  var Settings = function () {
    function Settings() {
      this._storeName = "settings";
      this.settingstore = new SettingModel();
      this._observer = new ObjectObserver(this.settingstore);
      this.settingstore = this.readSettingsFromLocalStorage();
    }
    Settings.prototype.readSettingsFromLocalStorage = function () {
    };
    Settings.prototype.storeSettingsToLocalStorage = function () {
    };
    return Settings;
  }();
  var settingobj = new Settings();
  var settings = settingobj.settingstore;
  var SignalSession = function () {
    function SignalSession(config) {
      this.id = 0;
      this.socket = null;
      this.isConnected = false;
      this.localIPs = undefined;
      this._ee = new events.EventEmitter();
      this.emit = this._ee.emit;
      this.on = this._ee.on;
      this.off = this._ee.removeListener;
      this.removeAllListeners = this._ee.removeAllListeners;
      this.enumLocalIPs(function (datas) {
        this.localIPs = datas;
      });
    }
    SignalSession.prototype.enumLocalIPs = function (cb) {
      var x = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
      if (!x)
        return false;
      var addrs = Object.create(null);
      addrs["0.0.0.0"] = false;
      var addAddress = function (newAddr) {
        if (newAddr in addrs)
          return;
        addrs[newAddr] = true;
        cb(newAddr);
      };
      var grepSDP = function (sdp) {
        sdp.split("\r\n").forEach(function (line) {
          if (~line.indexOf("a=candidate")) {
            var parts = line.split(" "), addr = parts[4], type = parts[7];
            if (type === "host")
              addAddress(addr);
          } else if (~line.indexOf("c=")) {
            var parts = line.split(" "), addr = parts[2];
            addAddress(addr);
          }
        });
      };
      var rtc;
      if (window.mozRTCPeerConnection) {
        rtc = new mozRTCPeerConnection({ iceServers: [] });
        rtc.createDataChannel("", { reliable: false });
      } else if (window.webkitRTCPeerConnection) {
        rtc = new webkitRTCPeerConnection({ iceServers: [] });
      }
      rtc.onicecandidate = function (evt) {
        if (evt.candidate)
          grepSDP(evt.candidate.candidate);
      };
      setTimeout(function () {
        rtc.createOffer(function (offerDesc) {
          grepSDP(offerDesc.sdp);
          rtc.setLocalDescription(offerDesc);
        }, function (e) {
        });
      }, 50);
      return true;
    };
    SignalSession.prototype.connect = function () {
      var self = this;
      var logger = console;
      var deferred = Q.defer();
      try {
        var url = (this.isSecure ? "https" : "http") + "://" + this.host + ":" + this.port;
        this.socket = new SockJS(url, null, {
          debug: true,
          devel: true
        });
        this.url = url;
        this.socket.onmessage = this.messageHandler;
        this.socket.onopen = function (ev) {
          logger.log("Server " + self.id, self.url, "connected");
          self.isConnected = true;
          deferred.resolve(null);
        };
        this.socket.addEventListener("error", function (e) {
          self.disconnect();
          logger.log("Server " + self.id, self.url, "error");
        });
        this.socket.onclose = function (e) {
          self.disconnect();
          logger.log("Server " + self.id, self.url, "disconnected", e.code + " : " + e.reason);
          switch (e.code) {
          case 1011:
            logger.log("Server " + self.id, self.url, "is idle! Please restart it.");
            break;
          }
        };
      } catch (e) {
        deferred.reject(null);
        self.disconnect();
      }
      return deferred.promise;
    };
    SignalSession.prototype.disconnect = function () {
      this.socket = null;
      this.isConnected = false;
      return this;
    };
    SignalSession.prototype.send = function (cmd, data, waitForResponse) {
      var self = this, deferred = Q.defer();
      if (!this.isConnected) {
        deferred.reject("Not connected to server!");
        return deferred.promise;
      }
      if (!data || !_.isObject(data) || _.isEmpty(data)) {
        deferred.reject("Data is not an object/empty!");
        return deferred.promise;
      }
      if (!cmd) {
        deferred.reject("Command is not defined!");
        return deferred.promise;
      }
      data.cmd = cmd;
      data.authToken = settings.authToken;
      this.socket.send(JSON.stringify(data));
      if (waitForResponse) {
        function responseHandler(e) {
          var response = JSON.parse(e.data);
          if (response.cmd === cmd) {
            self.socket.removeEventListener("message", responseHandler);
            deferred.resolve(response.data);
          }
        }
        this.socket.addEventListener("message", responseHandler);
      } else {
        deferred.resolve(null);
      }
      return deferred.promise;
    };
    SignalSession.prototype.sendAuthentication = function () {
      return this.send("peer:auth", {
        apiKey: settings.projectUuid,
        ips: this.localIPs
      }, true);
    };
    SignalSession.prototype.sendPeerOffer = function (targetPeerUuid, offer) {
      return this.send("peer:offer", {
        uuid: settings.uuid,
        targetPeerUuid: targetPeerUuid,
        offer: offer,
        ips: location
      }, false);
    };
    SignalSession.prototype.sendPeerAnswer = function (targetPeerUuid, answer) {
      return this.send("peer:answer", {
        uuid: settings.uuid,
        targetPeerUuid: targetPeerUuid,
        answer: answer
      }, false);
    };
    SignalSession.prototype.sendPeerCandidate = function (targetPeerUuid, candidate) {
      return this.send("peer:candidate", {
        uuid: settings.uuid,
        targetPeerUuid: targetPeerUuid,
        candidate: candidate
      }, false);
    };
    SignalSession.prototype.getAllRelatedPeers = function () {
      return this.send("peer:list", { projectUuid: settings.uuid }, true);
    };
    SignalSession.prototype.messageHandler = function (e) {
      var self = this;
      var data = JSON.parse(e.data), cmd = data.cmd;
      console.log("Server " + this.id, "Received", data);
      switch (cmd.toLowerCase()) {
      case "peer:offer":
        this.emit("peer:offer", {
          nodeUuid: self.uuid,
          targetPeerUuid: data.data.targetPeerUuid,
          offer: data.data.offer,
          location: data.data.location
        });
        break;
      case "peer:answer":
        this.emit("peer:answer", {
          nodeUuid: self.uuid,
          targetPeerUuid: data.data.targetPeerUuid,
          answer: data.data.answer
        });
        break;
      case "peer:candidate":
        this.emit("peer:candidate", {
          nodeUuid: self.uuid,
          targetPeerUuid: data.data.targetPeerUuid,
          candidate: data.data.candidate
        });
        break;
      }
    };
    SignalSession.prototype.serialize = function () {
      return {
        host: this.host,
        isSecure: this.isSecure,
        port: this.port
      };
    };
    return SignalSession;
  }();
  exports.SignalSession = SignalSession;
  var TIMEOUT_WAIT_TIME = 10000, QUEUE_RETRY_TIME = 75, ICE_SERVER_SETTINGS = {
      iceServers: [
        { url: "stun:stun.l.google.com:19302" },
        { url: "stun:stun.turnservers.com:3478" }
      ]
    };
  var connectionConstraint = {
    optional: [
      { RtpDataChannels: true },
      { DtlsSrtpKeyAgreement: true }
    ],
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
  };
  var channelConstraint;
  var PeerSession = function () {
    function PeerSession(server, config) {
      this._self = this;
      this.connection = undefined;
      this.channel = undefined;
      this.isConnected = false;
      this.isSource = false;
      this.isTarget = false;
      this.syncTimers = [];
      this._ee = new events.EventEmitter();
      var _self = this;
      this.id = config.id;
      if (server)
        this.server = server;
      this.on = this._ee.on;
      this.off = this._ee.removeListener;
      this.emit = this._ee.emit;
      if (settings.protocol.toLowerCase() === "sctp") {
        this.protocol = "sctp";
        logger.log("Peer " + _self.id, "Using SCTP");
        connectionConstraint = {
          optional: [
            { RtpDataChannels: false },
            { DtlsSrtpKeyAgreement: true }
          ],
          mandatory: {
            OfferToReceiveAudio: false,
            OfferToReceiveVideo: false
          }
        };
        channelConstraint = {
          reliable: false,
          maxRetransmits: 0
        };
      } else {
        this.protocol = "srtp";
        logger.log("Peer " + _self.id, "Using SRTP");
      }
    }
    PeerSession.prototype.timerCompleteHandler = function (e) {
      var _self = this;
      if (!this.isConnected) {
        this.timeout = Date.now();
        this.emit("peer:timeout", _self);
      } else
        this.timeout = undefined;
    };
    PeerSession.prototype.iceCandidateHandler = function (e) {
      if (!e || !e.candidate)
        return;
      this.server.sendPeerCandidate(this.uuid, e.candidate);
    };
    PeerSession.prototype.dataChannelHandler = function (e) {
      var _self = this;
      logger.log("Peer " + _self.id, "Received remote DataChannel");
      _self.channel = e.channel;
      _self.channel.onclose = this.channel_CloseHandler;
      _self.channel.onerror = this.channel_ErrorHandler;
      _self.channel.onmessage = this.channel_MessageHandler;
      _self.channel.onopen = this.channel_OpenHandler;
    };
    PeerSession.prototype.iceConnectionStateChangeHandler = function (e) {
      var _self = this;
      if (_self.connection.iceConnectionState === "connected" && _self.connection.iceGatheringState === "complete") {
        logger.log("Peer " + _self.id, "Connection established");
      } else if (_self.connection.iceConnectionState === "disconnected") {
        logger.log("Peer " + _self.id, "Connection closed");
        _self.isConnected = false;
        _self.emit("peer:disconnect", _self);
      }
    };
    PeerSession.prototype.negotiationNeededHandler = function (e) {
      var _self = this;
      logger.log("Peer " + _self.id, "Negotiation needed");
      _self.connection.createOffer(function (sessionDescription) {
        _self.connection.setLocalDescription(sessionDescription);
        _self.server.sendPeerOffer(_self.uuid, sessionDescription);
      }, function (err) {
        logger.error("Peer " + _self.id, err, "Was using", _self.protocol, "protocol.");
      }, connectionConstraint);
    };
    PeerSession.prototype.signalingStateChangeHandler = function (e) {
    };
    PeerSession.prototype.channel_ErrorHandler = function (e) {
      var _self = this;
      logger.log("Peer " + _self.id, "Channel has an error", e);
    };
    PeerSession.prototype.channel_MessageHandler = function (e) {
      var msg;
      var _self = this;
      _self.isConnected = true;
      if (e.data instanceof Blob) {
        msg = { blob: e.data };
      } else {
        try {
          msg = JSON.parse(e.data);
        } catch (err) {
          logger.error("Peer " + _self.id, "Error parsing msg:", e.data);
        }
      }
      _self.emit("peer:message", _.extend(msg, { target: _self }));
    };
    PeerSession.prototype.channel_OpenHandler = function (e) {
      var _self = this;
      logger.log("Peer " + _self.id, "DataChannel is open");
      _self.isConnected = true;
      _self.emit("peer:connect", _self);
    };
    PeerSession.prototype.channel_CloseHandler = function (e) {
      var _self = this;
      logger.log("Peer " + _self.id, "DataChannel is closed", e);
      _self.isConnected = false;
      _self.emit("peer:disconnect", _self);
    };
    PeerSession.prototype.createConnection = function () {
      var _self = this;
      var deferred = Q.defer;
      this.isSource = true;
      this.isTarget = false;
      logger.log("Peer " + _self.id, "Creating connection");
      _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);
      _self.connection.ondatachannel = this.dataChannelHandler;
      _self.connection.onicecandidate = this.iceCandidateHandler;
      _self.connection.oniceconnectionstatechange = this.iceConnectionStateChangeHandler;
      _self.connection.onnegotiationneeded = this.negotiationNeededHandler;
      _self.connection.onsignalingstatechange = this.signalingStateChangeHandler;
      _.delay(this.timerCompleteHandler, TIMEOUT_WAIT_TIME);
      try {
        _self.channel = _self.connection.createDataChannel("Jiasudu", channelConstraint);
      } catch (e) {
        this.isConnected = false;
        this.timerCompleteHandler(null);
        deferred.reject();
      }
      _self.channel.onclose = this.channel_CloseHandler;
      _self.channel.onerror = this.channel_ErrorHandler;
      _self.channel.onmessage = this.channel_MessageHandler;
      _self.channel.onopen = this.channel_OpenHandler;
      return deferred.promise;
    };
    PeerSession.prototype.answerOffer = function (data) {
      var _self = this;
      var uuid = this.uuid;
      var deferred = Q.defer;
      var signal = this.server;
      _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);
      _self.connection.ondatachannel = this.dataChannelHandler;
      _self.connection.onicecandidate = this.iceCandidateHandler;
      _self.connection.oniceconnectionstatechange = this.iceConnectionStateChangeHandler;
      _self.connection.onnegotiationneeded = this.negotiationNeededHandler;
      _self.connection.onsignalingstatechange = this.signalingStateChangeHandler;
      this.connection = _self.connection;
      _self.connection.setRemoteDescription(new RTCSessionDescription(data.offer), function () {
        _self.connection.createAnswer(function (sessionDescription) {
          _self.connection.setLocalDescription(sessionDescription);
          signal.sendPeerAnswer(uuid, sessionDescription);
        }, function (err) {
          logger.log(err);
        }, connectionConstraint);
      });
      return deferred.promise;
    };
    PeerSession.prototype.acceptConnection = function (data) {
      var _self = this;
      this.isTarget = true;
      this.isSource = false;
      _self.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
    };
    PeerSession.prototype.addCandidate = function (data) {
      var _self = this;
      _self.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
    };
    PeerSession.prototype.send = function (data, reliable) {
      if (typeof reliable === "undefined") {
        reliable = false;
      }
      var _self = this;
      var jsonString;
      if (!_self.isConnected || _self.channel.readyState !== "open") {
        logger.error("Peer " + _self.id, "Attempt to send, but channel is not open!");
        return;
      }
      if (data instanceof Blob) {
        _self.channel.send(data);
      } else {
        try {
          jsonString = JSON.stringify(data);
        } catch (e) {
        }
        try {
          _self.channel.send(jsonString);
        } catch (e) {
          if (reliable) {
            logger.error("Peer " + _self.id, "Error while sending reliable msg, queuing data");
            _.delay(_self.send, QUEUE_RETRY_TIME, data);
          }
        }
      }
    };
    PeerSession.prototype.sendFile = function (uuid, chunk, pos) {
      pos = pos || 0;
      if (chunk instanceof Blob) {
        this.send({
          type: "file:push:start",
          uuid: uuid,
          pos: pos
        });
        this.send(chunk);
        this.send({
          type: "file:push:end",
          uuid: uuid
        });
      } else {
        this.send({
          type: "file:push",
          uuid: uuid,
          chunk: chunk,
          pos: pos
        });
      }
    };
    PeerSession.prototype.serialize = function () {
      return {
        uuid: this.uuid,
        server: this.server
      };
    };
    PeerSession.prototype.broadcast = function (type, data) {
      var _self = this;
      if (type.indexOf("broadcast:") < 0) {
        type = "broadcast:" + type;
      }
      _self.send({
        type: type,
        data: data
      });
    };
    PeerSession.prototype.disconnect = function () {
      var _self = this;
      _self.isConnected = false;
      _self.channel.close();
      _self.connection.close();
    };
    return PeerSession;
  }();
  var TIMEOUT_RETRY_TIME = 60000;
  var MAX_RANDOM_ASSESSMENT_DELAY_TIME = 150;
  var PeerSessionManager = function () {
    function PeerSessionManager() {
      this._peers = [];
    }
    PeerSessionManager.prototype.add = function (peer) {
      if (!this.getPeerByUuid(peer.uuid)) {
        this._peers.push(peer);
      }
    };
    PeerSessionManager.prototype.connect = function (peers) {
      if (typeof peers === "undefined") {
        peers = this._peers;
      }
      var promises = [];
      _.each(peers, function (peer) {
        if (!peer || peer.uuid === settings.uuid)
          return;
        if (!peer.isConnected) {
          promises.push(peer.createConnection());
        }
      });
      return Q.all(promises);
    };
    PeerSessionManager.prototype.connectToNeighbourPeers = function () {
      return this.connect(this.getNeighbourPeers());
    };
    PeerSessionManager.prototype.getPeerByUuid = function (uuid) {
      return _.find(this._peers, function (peer) {
        return peer.uuid === uuid;
      });
    };
    PeerSessionManager.prototype.getNeighbourPeers = function () {
      var peers = this._peers.filter(function (peer) {
        return !peer.timeout || peer.timeout + TIMEOUT_RETRY_TIME < Date.now();
      });
      return peers.slice(0, settings.maxPeers || 2);
    };
    PeerSessionManager.prototype.getPeerUuidsAsArray = function () {
      return _.map(this._peers, function (peer) {
        return peer.uuid;
      });
    };
    PeerSessionManager.prototype.broadcast = function (type, data, originPeerUuid, reliable) {
      if (typeof reliable === "undefined") {
        reliable = false;
      }
      var peers = this.getConnectedPeers();
      peers = _.reject(peers, function (peer) {
        return peer.uuid === settings.uuid || peer.uuid === originPeerUuid;
      });
      if (peers.length === 0) {
        return;
      }
      if (!originPeerUuid) {
        data.timestamp = Date.now();
      } else {
      }
      peers.forEach(function (peer) {
        var rad = Math.random() * MAX_RANDOM_ASSESSMENT_DELAY_TIME;
        _.delay(peer.broadcast, rad, type, data, reliable);
      });
    };
    PeerSessionManager.prototype.update = function (peerData) {
      peerData = _.flatten(peerData);
      peerData.forEach(function (data) {
        if (data.uuid === settings.uuid)
          return;
        var peer = this.getPeerByUuid(data.uuid);
        if (peer) {
          peer.addNodes(data.nodes);
          return;
        }
        data.id = this._peers.length + 1;
        peer = new PeerSession(this.server, data);
        this.add(peer);
        peer.onAny(function (e) {
          this.emit(this.event, e);
        });
      });
    };
    PeerSessionManager.prototype.getConnectedPeers = function () {
      return _.where(this._peers, { isConnected: true });
    };
    return PeerSessionManager;
  }();
  var App = function () {
    function App(el) {
      this.el = el;
    }
    App.prototype.render = function () {
      this.el.html("require.js up and running");
    };
    return App;
  }();
  return {
    App: App,
    SignalSession: SignalSession,
    PeerSession: PeerSession,
    PeerSessionManager: PeerSessionManager
  };
}));

return module.exports;

})