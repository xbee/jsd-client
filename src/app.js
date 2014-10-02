define(["require",
      "exports",
      'module',
      'lodash',
      'q',
      'eventemitter2',
      'node-uuid',
      'observe-js'],
function (require, exports, module, _, Q, EventEmitter2, nuuid) {

  var _debuging = true;

  exports._debuging = _debuging;

  var MyObj = (function () {
    var privateVal = 200;

    function MyObj() {
      var self = this;
      this.val = 100;
    }

    MyObj.prototype.add = function (x) {
      this.val = this.val + x;
    }

    MyObj.prototype.getVal = function () {
      logger.log(this.val);
    }

    return MyObj;
  })();
  exports.MyObj = MyObj;

  var utils = (function () {
    this.sleep = function (milliseconds) {
      var start = new Date().getTime();
      for (var i = 0; i < 10000000; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
          break;
        }
      }
    };

    // I create a function that statically binds the given
    // method to the given instance.
    this.bind = function (instance, method) {

      // Create the parent function.
      var invocation = function () {
        return (
            method.apply(instance, arguments)
            );
      };

      // Return the invocation binding.
      return ( invocation );

    };

    return {
      sleep: this.sleep,
      bind: this.bind
    };
  })();
  exports.utils = utils;

  /**
   * @author Michael
   * @date 29.09.14
   * @module Logger
   * @class Logger
   */

  var logger = (function () {

    var MAX_MESSAGES = 100;

    var output = document.getElementsByTagName('output')[0],
        htmlLogging = true,
        consoleLogging = true,
        msgAmount = 0;

    /**
     * Create a timestamp ( format : HH::MM:SS )
     *
     * @private
     * @method getPrettyTimeStamp
     * @return {String}
     */
    function getPrettyTimeStamp() {
      var current = new Date(),
          date = [],
          hours = current.getHours() < 10 ? ('0' + current.getHours()) : current.getHours(),
          minutes = current.getMinutes() < 10 ? ('0' + current.getMinutes()) : current.getMinutes(),
          seconds = current.getSeconds() < 10 ? ('0' + current.getSeconds()) : current.getSeconds();

      date.push(hours);
      date.push(minutes);
      date.push(seconds);

      return date.join(':');
    }


    function print(type, args) {

      if (!output) {
        htmlLogging = false;
      }

      if (msgAmount >= MAX_MESSAGES) {
        output.innerHTML = '';
        console.clear();
        msgAmount = 0;
      }

      var origin = args[0],
          data = Array.prototype.slice.call(args, 1),
          dataAsString = _.clone(data);

      //Console
      console[type].apply(console, [getPrettyTimeStamp(), '|', 'JSD', '-', origin, ':'].concat(data));

      //DOM
      if (htmlLogging) {

        dataAsString.forEach(function (el, id) {
          if (_.isObject(el)) {
            dataAsString[id] = '<em style="color:blue">' + JSON.stringify(el) + '</em>';
          }
        });

        output.innerHTML += getPrettyTimeStamp() + ' ' + '<strong style="color:red">' + origin + '</strong> : ' + dataAsString.join(' ') + '<br/>';

      }
      msgAmount++;
    }

    return {

      /**
       * @method disableHTMLLog
       */
      disableHTMLLog: function () {
        htmlLogging = false;
      },


      /**
       * @method enableHTMLLog
       */
      enableHTMLLog: function () {
        htmlLogging = true;
      },

      /**
       * @method disableConsoleLog
       */
      disableConsoleLog: function () {
        consoleLogging = false;
      },

      /**
       * @method enableConsoleLog
       */
      enableConsoleLog: function () {
        consoleLogging = true;
      },

      /**
       * @method disable
       */
      disable: function () {
        this.disableHTMLLog();
        this.disableConsoleLog();
      },

      /**
       * @method enable
       */
      enable: function () {
        this.enableHTMLLog();
        this.enableConsoleLog();
      },

      /**
       * Log some information
       *
       * @method log
       *
       * @param {*} msg
       * @param {*} [desc]
       * @param {*} [data]
       */
      log: function (msg, desc, data) {
        print('log', arguments);
      },

      /**
       * Log a warning
       *
       * @method warn
       *
       * @param {*} msg
       * @param {*} [desc]
       * @param {*} [data]
       */
      warn: function (msg, desc, data) {
        print('warn', arguments);
      },

      /**
       * Log an error
       *
       * @method error
       *
       * @param {*} msg
       * @param {*} [desc]
       * @param {*} [data]
       */
      error: function (msg, desc, data) {
        print('error', arguments);
      }
    };
  })();
  if (_debuging) {
    exports.logger = logger;
  }

  var Uuid = (function () {
//        this.abc = 'test';
//        var xyz = '122';
    function Uuid() {
//            this.test = 'abc';
    }

    /**
     * Generates an universally unique identifier
     *
     * @method generate
     * @return {String} An Universally unique identifier v4
     * @see http://en.wikipedia.org/wiki/Universally_unique_identifier
     */
    var generate = function () {
//            var self = this;
//            if (typeof self.test === 'undefined') {
//                console.log('can not access private field');
//            } else {
//                console.log(self.test);
//            }
//            if (typeof self.abc === 'undefined') {
//                console.log('can not access private field2');
//            } else {
//                console.log(self.abc);
//            }
//            if (typeof xyz === 'undefined') {
//                console.log('can not access private field3');
//            } else {
//                console.log(xyz); // will enter this
//            }

      return nuuid.v4();
    };

    /**
     * Test if a uuid is valid
     *
     * @method isValid
     * @param uuid
     * @returns {boolean}
     */
    this.isValid = function (uuid) {
      return Uuid._format.test(uuid);
    };
    this._format = new RegExp('/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i');
    return {
      generate: generate,
      isValid: this.isValid
    };
  })();
  if (_debuging) {
    exports.Uuid = Uuid;
  }

  var settings = (function () {
    var _storeName = 'settings',
        _settings = readSettingsFromLocalStorage();

    /**
     * @private
     * @method readSettingsFromLocalStorage
     * @return {Object} Settings
     */
    function readSettingsFromLocalStorage() {
      return JSON.parse(localStorage.getItem(_storeName)) || {};
    }

    /**
     * @private
     * @method storeSettingsToLocalStorage
     */
    function storeSettingsToLocalStorage() {
      localStorage.setItem(_storeName, JSON.stringify(_settings));
    }

    //Chrome is currently the only one supporting native O_o
    //which would be
    //Object.observe(_settings, storeSettingsToLocalStorage);
    var observer = new ObjectObserver(_settings);
    observer.open(storeSettingsToLocalStorage);

    //Defaults
    _.defaults(_settings, {
      authToken: Uuid.generate(), // Will never be sent to any peer (private)
      maxPeers: 3,
      maxFactories: 1,
      maxWorkers: 1,
      fileStorageSize: 500 * 1024 * 1024, //500MB
      protocol: 'sctp', //srtp || sctp
      iceServers: [
        {
          'url': 'stun:stun.l.google.com:19302'
        },
        {
          'url': 'stun:stun.turnservers.com:3478'
        }
      ],
      signalServer: {
        'host': 'localhost',
        'port': 3081,
        'isSecure': false
      },
      syncInterval: 3600000, //1h
      apiKey: '1c69f278739ed7653f5a0f2d8ca51c0e41100492',
      uuid: Uuid.generate() //everyone will know (public)
    });

    return _settings;
  })();
  if (_debuging) {
    exports.settings = settings;
  }

  /*
   *  get all of local ip address
   */
  var enumLocalIPs = function (ctx, cb) {
    var RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    if (!RTCPeerConnection)
      return false;
    var addrs = Object.create(null);
    addrs['0.0.0.0'] = false;
    var addAddress = function (newAddr) {
      if (newAddr in addrs)
        return;
      addrs[newAddr] = true;
      cb.apply(ctx, [newAddr]);
    };
    var grepSDP = function (sdp) {
      sdp.split('\r\n').forEach(function (line) {
        if (~line.indexOf('a=candidate')) {
          var parts = line.split(' '), addr = parts[4], type = parts[7];
          if (type === 'host')
            addAddress(addr);
        } else if (~line.indexOf('c=')) {
          var parts = line.split(' '), addr = parts[2];
          addAddress(addr);
        }
      });
    };

    // typescript do not support polyfill
    var rtc = new RTCPeerConnection({iceServers: []});
    if (window.mozRTCPeerConnection) {
      rtc.createDataChannel('', { reliable: false });
    }
    rtc.onicecandidate = function (evt) {
      if (evt.candidate)
        grepSDP(evt.candidate.candidate);
    };
    rtc.createOffer(function (offerDesc) {
      grepSDP(offerDesc.sdp);
      rtc.setLocalDescription(offerDesc);
    }, function (e) {
    });
//        setTimeout(function () {
//
//        }, 50);
    return true;
  };
  if (_debuging) {
    exports.enumLocalIPs = enumLocalIPs;
  }

  SignalStatus = {};
  SignalStatus.CONNECTING = 'signal:connecting';
  SignalStatus.CONNECTED = 'signal:connected';
  SignalStatus.DISCONNECTED = 'signal:disconnected';
  SignalStatus.INCOMINGCALL = 'signal:incomingCall';

  SignalStatus.AUTHENTICATING = 'signal:authenticating';
  SignalStatus.AUTHENTICATED = 'signal:authenticated';
  SignalStatus.ERROR = 'signal:error';

  PeerStatus = {};
  PeerStatus.CONNECTING = 'signal:connecting';
  PeerStatus.HOLD = 'signal:hold';
  PeerStatus.UNHOLD = 'signal:unhold';
  PeerStatus.REJECTED = 'signal:rejected';
  PeerStatus.CONNECTED = 'signal:connected';
  PeerStatus.DISCONNECTED = 'signal:disconnected';
  PeerStatus.ADDSTREAM = 'stream:add';

  var SignalSession = (function () {

    var pending = [];

    function SignalSession(id, token, config, callback) {
      var _self = this;
      this.host = settings.signalServer.host;
      this.port = settings.signalServer.port;
      this.isSecure = settings.signalServer.isSecure;
      this.id = id;
      this.callback = callback; // useless
      this.socket = null;
      //this.isConnected = false;
      this.localIPs = [];
      this.peers = [];
      this.status = SignalStatus.DISCONNECTED;
      this.inStatus = SignalStatus.DISCONNECTED;

      this.emitter = new EventEmitter2({
        wildcard: true, // should the event emitter use wildcards.
        delimiter: ':', // the delimiter used to segment namespaces, defaults to `.`.
        newListener: false, // if you want to emit the newListener event set to true.
        maxListeners: 10 // the max number of listeners that can be assigned to an event, defaults to 10.
      });
      // emitter.emit(event, [arg1], [arg2], [...])
      this.emit = this.emitter.emit;
      this.on = this.emitter.on;
      this.off = this.emitter.removeListener;
      this.onAny = this.emitter.onAny;
      this.offAny = this.emitter.offAny;
      this.removeAllListeners = this.emitter.removeAllListeners;

      enumLocalIPs(_self, _self.saveIPs);
    };

    SignalSession.prototype.connected = function() {
      if (this.inStatus !== SignalStatus.DISCONNECTED ||
          this.inStatus !== SignalStatus.CONNECTING) {
        return true;
      } else {
        return false;
      }

    };

    SignalSession.prototype.triggerEvent = function (status, peer) {
      var eventInfo = {}, i;
      if (peer) {
        eventInfo.peer = peer;
        this.peers.push(peer);
      } else {
        this.status = status;
        this.inStatus = status;
        if (status === SignalStatus.DISCONNECTED) {
          for (i = 0; i < this.peers.length; i += 1) {
            this.peers[i].parallel.triggerEvent(PeerStatus.DISCONNECTED);
            this.peers[i].triggerEvent(PeerStatus.DISCONNECTED);
          }
        }
      }
      // can not use this.emitter.emit , why ?
      // next line is ok
      // (this.emitter.emit.bind(this))(status, eventInfo, this.callback);
      this.emit(status, eventInfo, this.callback);
    };

    /**
     * @method connect
     * @return {Promise}
     */
    SignalSession.prototype.connect = function () {
      var self = this;
//      var deferred = Q.defer();

      try {
        if (self.inStatus === SignalStatus.DISCONNECTED) {
          self.inStatus = SignalStatus.CONNECTING;
          self.triggerEvent(SignalStatus.CONNECTING);
          var url = (self.isSecure ? 'wss' : 'ws') + '://' + self.host + ':' + self.port;
          self.socket = new WebSocket(url, null, { debug: true, devel: true });
          self.url = url;

          //add listeners
          this.socket.addEventListener('message', this.messageHandler.bind(this));
          this.socket.addEventListener('open', function (ev) {
            self.inStatus = SignalStatus.CONNECTED;
            self.triggerEvent(SignalStatus.CONNECTED);
//            deferred.resolve(null);
          });

          this.socket.addEventListener('error', function (e) {
            logger.log('Server ' + self.id, self.url, 'error: ', e.code + ' : ' + e.reason);
            self.triggerEvent(SignalStatus.ERROR);
            self.disconnect();
          });

          this.socket.addEventListener('close', function (e) {
            self.disconnect();
            logger.log('Server ' + self.id, self.url, 'disconnected', 'error: ' + e.code + ' : ' + e.reason);

            switch (e.code) {
              case 1011:
                logger.log('Server ' + self.id, self.url, 'is idle! Please restart it.');
                break;
            }
          });
          pending.push(self);
        } else if (self.inStatus === SignalStatus.CONNECTING) {
          pending.push(self);
        } else if (self.inStatus === SignalStatus.CONNECTED) {

        }
        // end of if

      } catch (e) {
        logger.error(e);
        self.disconnect();
        return false;
      }

      return true;
    }; // end of connect function

    /**
     * @method authenticate
     * @return {Promise}
     */
    SignalSession.prototype.authenticate = function () {
      var self = this;
      self.triggerEvent(SignalStatus.AUTHENTICATING);
      return this.sendAuthentication();
    };

    SignalSession.prototype.disconnect = function () {
      var self = this;
      this.inStatus = SignalStatus.DISCONNECTED;
      this.socket = null;
      setTimeout(function () {
        self.triggerEvent(SignalStatus.DISCONNECTED);
      }, 300);
      return this;
    };

    SignalSession.prototype.send = function (cmd, data, waitForResponse) {
      var self = this;
//      var deferred = Q.defer();

      if (!self.connected()) {
//        deferred.reject('Not connected to server!');
        throw new Error('Not connected to server, current status: ' + self.inStatus);
        return false;
      }

      if (!data || !_.isObject(data) || _.isEmpty(data)) {
        throw new Error('Data is not an object/empty!');
        return false;
//        deferred.reject('Data is not an object/empty!');
//        return deferred.promise;
      }

      if (!cmd) {
        throw new Error('Command is not defined!');
        return false;
//        deferred.reject('Command is not defined!');
//        return deferred.promise;
      }

      // add cmd to data
      data.cmd = cmd;

      // add auth token
      data.authToken = settings.authToken;

      //send data to websocket as String
      this.socket.send(JSON.stringify(data));
      logger.log(JSON.stringify(data));

      // If we need to wait for the answer

      if (waitForResponse && (typeof waitForResponse === 'function')) {
        var responseHandler = waitForResponse;
        this.socket.addEventListener('message', responseHandler);
        // No need to wait
      } else
      if (waitForResponse && (typeof waitForResponse === 'boolean')) {

        function responseHandler(e) {
          var response = JSON.parse(e.data);
          if (response.cmd === cmd) {
            self.socket.removeEventListener('message', responseHandler);
//            deferred.resolve(response.data);
            return response.data;
          }
        }

        this.socket.addEventListener('message', responseHandler);
        return true;
      } else {
        return true;
      }

      return true;
    };

    SignalSession.prototype.sendAuthentication = function () {
      var self = this;
      return this.send('signal:auth', { uuid: settings.uuid, apiKey: settings.apiKey, ips: self.localIPs }, false);
    };

    SignalSession.prototype.sendPeerOffer = function (targetPeerUuid, offer) {
      return this.send('peer:offer', { uuid: settings.uuid, targetPeerUuid: targetPeerUuid, offer: offer, ips: location }, false);
    };

    SignalSession.prototype.sendPeerAnswer = function (targetPeerUuid, answer) {
      return this.send('peer:answer', { uuid: settings.uuid, targetPeerUuid: targetPeerUuid, answer: answer }, false);
    };

    SignalSession.prototype.sendPeerCandidate = function (targetPeerUuid, candidate) {
      return this.send('peer:candidate', { uuid: settings.uuid, targetPeerUuid: targetPeerUuid, candidate: candidate }, false);
    };

    SignalSession.prototype.getAllRelatedPeers = function () {
      return this.send('peer:list', { apiKey: settings.apiKey }, true);
    };

    SignalSession.prototype.messageHandler = function (e) {
      var self = this;
      var data = JSON.parse(e.data), cmd = data.cmd;

      logger.log('Server ' + this.id, 'Received', data);

      switch (cmd.toLowerCase()) {
        case 'peer:offer':
          this.emit('peer:offer', { nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, offer: data.data.offer, location: data.data.location });
          break;
        case 'peer:answer':
          this.emit('peer:answer', { nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, answer: data.data.answer });
          break;
        case 'peer:candidate':
          this.emit('peer:candidate', { nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, candidate: data.data.candidate });
          break;
        case 'signal:auth':
          // received response of auth
          if (data['data']['success'] && (data['data']['success'] === true)) {
            self.triggerEvent(SignalStatus.AUTHENTICATED);
          }
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

    SignalSession.prototype.getStatus = function () {
      return this.status;
    };

    SignalSession.prototype.saveIPs = function (ip) {
      var self = this;
      self.localIPs.push(ip);
    };

    return SignalSession;
  })();
  // call exampel: var singnal = new jsd.SignalSession();
  exports.SignalSession = SignalSession;

  var TIMEOUT_WAIT_TIME = 10000, QUEUE_RETRY_TIME = 75, ICE_SERVER_SETTINGS = {
    iceServers: [
      {
        url: 'stun:stun.l.google.com:19302'
      },
      {
        url: 'stun:stun.turnservers.com:3478'
      }
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

  var PeerSession = (function () {
    function PeerSession(server, config) {
      this._self = this;
      /**
       * @property connection
       * @type {RTCPeerCpnnection}
       */
      this.connection = undefined;
      /**
       * @property channel
       * @type {RTCDataChannel}
       */
      this.channel = undefined;
      /**
       * Indicates if there is a stable conenction to this peer
       * @property isConnected
       * @default false
       * @type {Boolean}
       */
      this.isConnected = false;
      /**
       * Whether this peer is the initiator of a connection
       * @property isSource
       * @default false
       * @type {Boolean}
       */
      this.isSource = false;
      /**
       * Whether this peer is the initiator of a connection
       * @property isTarget
       * @default false
       * @type {Boolean}
       */
      this.isTarget = false;
      /**
       * List of timers for synchronization
       * @type {Array}
       */
      this.syncTimers = [];
      //    onAny: (fn: Function) => events.EventEmitter;
      //    offAny: (fn: Function) => events.EventEmitter;
      //    removeAllListeners: (type: string[]) => events.EventEmitter;
//            this._ee = new events.EventEmitter();
      var _self = this;

      this.id = config.id;
      if (server)
        this.server = server;

      this._ee = new EventEmitter2({
        wildcard: true, // should the event emitter use wildcards.
        delimiter: ':', // the delimiter used to segment namespaces, defaults to `.`.
        newListener: false, // if you want to emit the newListener event set to true.
        maxListeners: 10 // the max number of listeners that can be assigned to an event, defaults to 10.
      });

      this.on = this._ee.on;
      this.off = this._ee.removeListener;
      this.onAny = this._ee.onAny;
      this.offAny = this._ee.offAny;
      this.emit = this._ee.emit;

      // Protocol switch SRTP(=default) or SCTP
      if (settings.protocol.toLowerCase() === 'sctp') {
        this.protocol = 'sctp';
        logger.log('Peer ' + _self.id, 'Using SCTP');

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
        this.protocol = 'srtp';
        logger.log('Peer ' + _self.id, 'Using SRTP');
      }
    }

    /**
     * @private
     * @method timerCompleteHandler
     */
    PeerSession.prototype.timerCompleteHandler = function (e) {
      var _self = this;
      if (!this.isConnected) {
        this.timeout = Date.now();
        this.emit('peer:timeout', _self);
      } else
        this.timeout = undefined;
    };

    /* Event Handler Start */
    PeerSession.prototype.iceCandidateHandler = function (e) {
      //II. The handler is called when network candidates become available.
      if (!e || !e.candidate)
        return;

      // III. In the handler, Alice sends stringified candidate data to Eve, via their signaling channel.
      this.server.sendPeerCandidate(this.uuid, e.candidate);
    };

    PeerSession.prototype.dataChannelHandler = function (e) {
      var _self = this;
      logger.log('Peer ' + _self.id, 'Received remote DataChannel');

      _self.channel = e.channel;

      _self.channel.onclose = this.channel_CloseHandler;
      _self.channel.onerror = this.channel_ErrorHandler;
      _self.channel.onmessage = this.channel_MessageHandler;
      _self.channel.onopen = this.channel_OpenHandler;
    };

    PeerSession.prototype.iceConnectionStateChangeHandler = function (e) {
      var _self = this;

      // Everything is fine
      if (_self.connection.iceConnectionState === 'connected' && _self.connection.iceGatheringState === 'complete') {
        logger.log('Peer ' + _self.id, 'Connection established');
      } else if (_self.connection.iceConnectionState === 'disconnected') {
        logger.log('Peer ' + _self.id, 'Connection closed');

        _self.isConnected = false;
        _self.emit('peer:disconnect', _self);
      }
    };

    PeerSession.prototype.negotiationNeededHandler = function (e) {
      var _self = this;
      logger.log('Peer ' + _self.id, 'Negotiation needed');

      //2. Alice creates an offer (an SDP session description) with the RTCPeerConnection createOffer() method.
      _self.connection.createOffer(function (sessionDescription) {
        //3. Alice calls setLocalDescription() with his offer.)
        _self.connection.setLocalDescription(sessionDescription);

        //4. Alice stringifies the offer and uses a signaling mechanism to send it to Eve.
        _self.server.sendPeerOffer(_self.uuid, sessionDescription);
      }, function (err) {
        logger.error('Peer ' + _self.id, err, 'Was using', _self.protocol, 'protocol.');
      }, connectionConstraint);
    };

    PeerSession.prototype.signalingStateChangeHandler = function (e) {
    };

    PeerSession.prototype.channel_ErrorHandler = function (e) {
      var _self = this;
      logger.log('Peer ' + _self.id, 'Channel has an error', e);
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
          logger.error('Peer ' + _self.id, 'Error parsing msg:', e.data);
        }
      }

      _self.emit('peer:message', _.extend(msg, { target: _self }));
    };

    PeerSession.prototype.channel_OpenHandler = function (e) {
      var _self = this;
      logger.log('Peer ' + _self.id, 'DataChannel is open');

      _self.isConnected = true;
      _self.emit('peer:connect', _self);
    };

    PeerSession.prototype.channel_CloseHandler = function (e) {
      var _self = this;
      logger.log('Peer ' + _self.id, 'DataChannel is closed', e);
      _self.isConnected = false;
      _self.emit('peer:disconnect', _self);
    };

    /* Event Handler END */
    /**
     * Create a WebRTC-Connection
     *
     * @method createConnection
     * @return {Promise}
     */
    PeerSession.prototype.createConnection = function () {
      var _self = this;
      var deferred = Q.defer;
      this.isSource = true;
      this.isTarget = false;

      logger.log('Peer ' + _self.id, 'Creating connection');

      //1.Alice creates an RTCPeerConnection object.
      _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);

      //I. Alice creates an RTCPeerConnection object with an onicecandidate handler.
      //Add listeners to connection
      _self.connection.ondatachannel = this.dataChannelHandler;
      _self.connection.onicecandidate = this.iceCandidateHandler;
      _self.connection.oniceconnectionstatechange = this.iceConnectionStateChangeHandler;
      _self.connection.onnegotiationneeded = this.negotiationNeededHandler;
      _self.connection.onsignalingstatechange = this.signalingStateChangeHandler;

      // Start timeout countdown
      _.delay(this.timerCompleteHandler, TIMEOUT_WAIT_TIME);

      try {
        // Create  data-channel
        _self.channel = _self.connection.createDataChannel('Jiasudu', channelConstraint);
      } catch (e) {
        // If an error occured here, there is a problem about the connection,
        // so lets do a timeout and maybe retry later
        this.isConnected = false;
        this.timerCompleteHandler(null);
        deferred.reject();
      }

      // Add listeners to channel
      _self.channel.onclose = this.channel_CloseHandler;
      _self.channel.onerror = this.channel_ErrorHandler;
      _self.channel.onmessage = this.channel_MessageHandler;
      _self.channel.onopen = this.channel_OpenHandler;
      return deferred.promise;
    };

    /**
     * @method answerOffer
     * @param data
     * @return {Promise}
     */
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

      //5. Eve calls setRemoteDescription() with Alice's offer, so that her RTCPeerConnection knows about Alice's setup.
      _self.connection.setRemoteDescription(new RTCSessionDescription(data.offer), function () {
        //6. Eve calls createAnswer(), and the success callback for this is passed a local session description: Eve's answer.
        _self.connection.createAnswer(function (sessionDescription) {
          //7. Eve sets her answer as the local description by calling setLocalDescription().
          _self.connection.setLocalDescription(sessionDescription);

          //8. Eve then uses the signaling mechanism to send her stringified answer back to Alice.
          signal.sendPeerAnswer(uuid, sessionDescription);
        }, function (err) {
          logger.log(err);
        }, connectionConstraint);
      });

      return deferred.promise;
    };

    /**
     * Accept a WebRTC-Connection
     *
     * @method acceptConnection
     * @param data
     */
    PeerSession.prototype.acceptConnection = function (data) {
      var _self = this;
      this.isTarget = true;
      this.isSource = false;

      //9. Alice sets Eve's answer as the remote session description using setRemoteDescription().
      _self.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
    };

    /**
     * Add candidate info to connection
     * @method addCandidate
     * @param data
     */
    PeerSession.prototype.addCandidate = function (data) {
      var _self = this;
      _self.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
    };

    /**
     * Send data via a WebRTC-Channel to a peer
     *
     * @method send
     * @param data
     * @param {Boolean} reliable Should a retry occur if the transmission fails?
     */
    PeerSession.prototype.send = function (data, reliable) {
      if (typeof reliable === "undefined") {
        reliable = false;
      }
      var _self = this;

      var jsonString;

      if (!_self.isConnected || _self.channel.readyState !== 'open') {
        logger.error('Peer ' + _self.id, 'Attempt to send, but channel is not open!');
        return;
      }

      // Actually it should be possible to send a blob, but it isn't
      // https://code.google.com/p/webrtc/issues/detail?id=2276
      if (data instanceof Blob) {
        _self.channel.send(data);
      } else {
        try {
          jsonString = JSON.stringify(data);
        } catch (e) {
          // We won't retry as this always will fail
        }
        try {
          _self.channel.send(jsonString);
        } catch (e) {
          if (reliable) {
            logger.error('Peer ' + _self.id, 'Error while sending reliable msg, queuing data');

            // Retry again
            _.delay(_self.send, QUEUE_RETRY_TIME, data);
          }
        }
      }
    };

    PeerSession.prototype.sendFile = function (uuid, chunk, pos) {
      pos = pos || 0;

      // Send as blob, wrapped with info
      if (chunk instanceof Blob) {
        this.send({ type: 'file:push:start', uuid: uuid, pos: pos });
        this.send(chunk);
        this.send({ type: 'file:push:end', uuid: uuid });
      } else {
        this.send({ type: 'file:push', uuid: uuid, chunk: chunk, pos: pos });
      }
    };

    /**
     * @method serialize
     * @return {Object}
     */
    PeerSession.prototype.serialize = function () {
      return {
        uuid: this.uuid,
        server: this.server
      };
    };

    /**
     * @method broadcast
     */
    PeerSession.prototype.broadcast = function (type, data) {
      var _self = this;

      // Add broadcast prefix?
      if (type.indexOf('broadcast:') < 0) {
        type = 'broadcast:' + type;
      }

      _self.send({ type: type, data: data });
    };

    /**
     * @method disconnect
     */
    PeerSession.prototype.disconnect = function () {
      var _self = this;
      _self.isConnected = false;
      _self.channel.close();
      _self.connection.close();
    };
    return PeerSession;
  })();
  exports.PeerSession = PeerSession;

  var TIMEOUT_RETRY_TIME = 60000;
  var MAX_RANDOM_ASSESSMENT_DELAY_TIME = 150;

  var PeerSessionManager = (function () {
    function PeerSessionManager() {
      this._peers = [];
    }

    /**
     * @method add
     * @param peer
     */
    this.add = function (peer) {
      if (!this.getPeerByUuid(peer.uuid)) {
        this._peers.push(peer);
      }
    };

    /**
     * @method connect
     * @param {Array} [peers]
     * @return {Promise}
     */
    this.connect = function (peers) {
      if (typeof peers === "undefined") {
        peers = this._peers;
      }
      var promises = [];

      _.each(peers, function (peer) {
        // Never connect to null or self
        if (!peer || peer.uuid === settings.uuid)
          return;

        // No need to connect if already connected
        if (!peer.isConnected) {
          promises.push(peer.createConnection());
        }
      });

      return Q.all(promises);
    };

    /**
     * @method connectToNeighbourPeers
     * @return {Promise}
     */
    this.connectToNeighbourPeers = function () {
      return this.connect(this.getNeighbourPeers());
    };

    /**
     * @method getPeerByUuid
     * @param {String} uuid
     * @returns {Peer}
     */
    this.getPeerByUuid = function (uuid) {
      return _.find(this._peers, function (peer) {
        return peer.uuid === uuid;
      });
    };

    /**
     * @method getNeighbourPeers
     * @return {Array}
     */
    this.getNeighbourPeers = function () {
      // Assuming they are already sorted in a specific way
      // e.g. geolocation-distance
      // Remove all peers that had a timeout shortly
      var peers = this._peers.filter(function (peer) {
        // Timeout at all? && Timeout was long ago
        return !peer.timeout || peer.timeout + TIMEOUT_RETRY_TIME < Date.now();
      });

      return peers.slice(0, settings.maxPeers || 2);
    };

    /**
     * Get all known Peers Uuids as an array
     *
     * @method getPeerUuidsAsArray
     * @return {Array}
     */
    this.getPeerUuidsAsArray = function () {
      return _.map(this._peers, function (peer) {
        return peer.uuid;
      });
    };

    /**
     * Broadcast data to peers using a RAD--time.
     * Will exclude originPeerUuid from receivers if passed.
     *
     * @method broadcast
     * @param type
     * @param data
     * @param {String} [originPeerUuid]
     * @param {Boolean} reliable
     */
    this.broadcast = function (type, data, originPeerUuid, reliable) {
      if (typeof reliable === "undefined") {
        reliable = false;
      }
      var peers = this.getConnectedPeers();

      // Remove own uuid from list and
      // the peer we received the message from
      peers = _.reject(peers, function (peer) {
        return peer.uuid === settings.uuid || peer.uuid === originPeerUuid;
      });

      // Nobody to broadcast to
      if (peers.length === 0) {
        return;
      }

      if (!originPeerUuid) {
        //logger.log('Peers', 'Broadcasting', type, 'to', peers.length, 'peer(s)');
        data.timestamp = Date.now();
      } else {
        //logger.log('Peers', 'Rebroadcasting', type, 'to', peers.length, 'peer(s)');
      }

      // Broadcast to all connected peers
      peers.forEach(function (peer) {
        // Get a RAD before broadcasting
        var rad = Math.random() * MAX_RANDOM_ASSESSMENT_DELAY_TIME;
        _.delay(peer.broadcast, rad, type, data, reliable);
      });
    };

    /**
     * @method update
     * @param {Object} peerData
     */
    this.update = function (peerData) {
      // Multidimensional array form multiple nodes needs to be flattened
      peerData = _.flatten(peerData);

      peerData.forEach(function (data) {
        //make sure it's not self
        if (data.uuid === settings.uuid)
          return;

        //already got this one?
        var peer = this.getPeerByUuid(data.uuid);

        //already got this peer?
        if (peer) {
          //only add the node uuid
          peer.addNodes(data.nodes);
          return;
        }

        // Local id for debugging
        data.id = this._peers.length + 1;

        // Save as new peer
        peer = new PeerSession(this.server, data);
        this.add(peer);

        // Pass-through events
        peer.onAny(function (e) {
          this.emit(this.event, e);
        });
        // Calculate geolocation distance
        //            peer.distance = geolocation.getDistanceBetweenTwoLocations(peer.location);
      });
      // Sort peers by their geolocation-distance
      //        this._peers = _.sortBy(this._peers, function (peer) {
      //            return peer.distance;
      //        });
      // Update public list
      //        this.list = _peers;
    };

    /**
     * Get a list of all peers to which there is an active connection.
     *
     * @method getConnectedPeers
     *
     * @return {Array}
     */
    this.getConnectedPeers = function () {
      return _.where(this._peers, { isConnected: true });
    };

    return PeerSessionManager;
  })();
  exports.PeerSessionManager = PeerSessionManager;

  var App = (function () {
    function App() {

//            var logger = console;
//      this.el = el;
      this.id = Uuid.generate();
      this.settings = settings;
      this.session = {};
//            this.signal = new SignalSession();
    }

    /**
     * Simple feature testing of the application requirements
     * as a lot of the used technologies are still working drafts
     * and for from standard
     *
     * @private
     * @method getDeviceCapabilities
     * @return {Object}
     */
    function getDeviceCapabilities() {
      var requirements = [
            { name: 'JSON', test: JSON },
            { name: 'Blob', test: Blob },
            { name: 'localStorage', test: localStorage },
            { name: 'indexedDB', test: indexedDB },
            { name: 'GeoLocation API', test: navigator.geolocation },
            { name: 'WebRTC API', test: (window.mozRTCPeerConnection || window.webkitRTCPeerConnection || RTCPeerConnection) }
            //{ name: 'FileSystem API', test: (navigator.webkitPersistentStorage || window.webkitStorageInfo) }
          ],
          features = [
            { name: 'Object.observe', test: Object.observe }
          ],
          result = {
            isCompatible: false,
            missingFeatures: [],
            missingRequirements: []
          };

      // These are really needed!
      requirements.forEach(function (requirement) {
        if (!requirement.test) result.missingRequirements.push(requirement.name);
      });

      // Those features could be compensated by (polyfills/shims/shivs)
      // if the browser doesn't support them
      features.forEach(function (feature) {
        if (!feature.test) result.missingFeatures.push(feature.name);
      });

      // Finally set a single compatibility flag
      result.isCompatible = result.missingRequirements.length === 0;

      return result;

    }

    App.prototype.session_onConnected = function (event) {
      //var id = this.session.id;
      logger.log('Signal', 'Server ' + this.session.id, this.session.url, 'connected');
      logger.log('Signal', 'session_onConnected');
      this.session.authenticate();
    };

    App.prototype.session_onConnecting = function (event) {
      logger.log('Signal', 'session_onConnecting');
    };

    App.prototype.session_onAuthenticating = function (event) {
      logger.log('Signal', 'session_onAuthenticating');
    };

    App.prototype.session_onAuthenticated = function (event) {
      logger.log('Signal', 'session_onAuthenticated');
    };

    App.prototype.session_onError = function (event) {
      logger.log('Signal', 'session_onError');
    };

    App.prototype.createSession = function () {
      var session = new SignalSession(settings.uuid, '123456');
      return session;
    };

    App.prototype.init = function () {
      logger.log('Signal', 'Uuid', settings.uuid);

      try {
        var device = getDeviceCapabilities();

        if (!device.isCompatible) {
          var msg = 'The following features are required but not supported by your browser: ' + device.missingRequirements.join('\n');
          logger.warn('Jiasudu', msg);
          return;
        }
      }
      catch (e) {
        logger.warn('Jiasudu', 'Your browser is not supported.');
      }

      return this;
    };

//    App.prototype.render = function () {
//      this.el.html('require.js up and running');
//    };

    App.prototype.id = function () {

    };

    /**
     * Start muskepeer
     *
     * @method start
     * @chainable
     * @param config Configuration-Object
     * @returns {Object}
     */
    App.prototype.start = function (config) {
      // 1. create session
      this.session = this.createSession();
      // 2. set session callbacks
      if (this.session) {
        this.session.on('signal:connected', this.session_onConnected.bind(this));
        this.session.on('signal:connecting', this.session_onConnecting.bind(this));
        this.session.on('signal:authenticating', this.session_onAuthenticating.bind(this));
        this.session.on('signal:authenticated', this.session_onAuthenticated.bind(this));
        this.session.on('signal:error', this.session_onError.bind(this));
      }
      // 3. session connect
      // connect to signal server
      this.session.connect();

      return this;
    };

    /**
     * Stop muskepeer
     * @method stop
     * @chainable
     */
    App.prototype.stop = function () {

      this.session.disconnect();
      return this;

    };

    return App;
  })();
  exports.App = App;

  return module.exports;
});
