define(['require',
      'exports',
      'module',
      'lodash',
      'q',
      'eventemitter2',
      'node-uuid',
      'state-machine',
      'fingerprint',
      'sha1',
      'fbr',
      'observe-js'],
function (require, exports, module, _, Q, EventEmitter2, nuuid, StateMachine, fingerprint, sha1, fbr) {

  var _debuging = true;

  exports._debuging = _debuging;

  var MyObj = (function () {
    var privateVal = 200;

    function MyObj() {
      var self = this;
      this.val = 100;
    }

    // this is a private function
    this.abc = function() {
      return this.val * 3;
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

    this.bin2hex = function(s) {
      var i = 0, l = bin.length, chr, hex = '';

      for (i; i < l; ++i)
      {
        chr = bin.charCodeAt(i).toString(16);
        hex += chr.length < 2 ? '0' + chr : chr;
      }
      return hex
    };
    // String.prototype
    this.hex2bin = function(hex) {
      var i = 0, l = this.length - 1, bytes = [];

      for (i; i < l; i += 2) {
        bytes.push(parseInt(this.substr(i, 2), 16))
      }

      return String.fromCharCode.apply(String, bytes);
    };

    this.dec2hex = function(i) {
      return (i+0x10000).toString(16).substr(-4).toUpperCase();
    };

    this.rgb2hex = function(r,g,b) {
      if (g !== undefined)
        return Number(0x1000000 + r*0x10000 + g*0x100 + b).toString(16).substring(1);
      else
        return Number(0x1000000 + r[0]*0x10000 + r[1]*0x100 + r[2]).toString(16).substring(1);
    };

    this.toRGB = function (/* String */ color) {
      // summary:
      //	Converts a 6 digit Hexadecimal string value to an RGB integer array.
      //      Important! input must be a 6 digit Hexadecimal string "bad" will
      //      not convert correctly but "bbaadd" will. To keep the function as
      //      light as possible there is no idiot-proofing, if you pass in bad
      //      data I'm not fixing it for you :-)
      //
      // color: String
      //      6 digit Hexadecimal string value
      //
      // returns: Array
      //	An array containing the RGB integers in the following format [red, green, blue]
      //
      // example:
      //	Convert the Hexadecimal value "c0ffee" (blue color) to RGB integers.
      //      The variable "rgb" will be equal to [192, 255, 238]
      //
      //	var rgb = toRGB("c0ffee");

      //convert string to base 16 number
      var num = parseInt(color, 16);

      //return the red, green and blue values as a new array
      return [num >> 16, num >> 8 & 255, num & 255];
    };

    this.toHex = function (/* Number */ red, /* Number */ green, /* Number */ blue) {
      // summary:
      //	Converts 3 RGB integer values into a Hexadecimal string.
      //      Important! input must be integers with a range of 0 to 255.
      //      To keep the function as light as possible there is no idiot-proofing,
      //      if you pass in bad data I'm not fixing it for you :-)
      //
      // red: Number
      //	number ranging from 0 to 255 indicating the amount of red
      // green: Number
      //	number ranging from 0 to 255 indicating the amount of green
      // blue: Number
      //	number ranging from 0 to 255 indicating the amount of blue
      //
      // returns: String
      //	6 digit Hexadecimal string value
      //
      // example:
      //      Convert the RGB values [192, 255, 238] (blue color) to Hexadecimal string.
      //      The variable "hex" will be equal to "c0ffee"
      //
      //      var hex = toHex(192, 255, 238);

      //return 6 digit Hexadecimal string
      return ((blue | green << 8 | red << 16) | 1 << 24).toString(16).slice(1);
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
      hex2rgb: this.toRGB,
      rgb2hex: this.toHex,
      hex2bin: this.hex2bin,
      bin2hex: this.bin2hex,
      dec2hex: this.dec2hex,
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

    var output = document.getElementById('log'),
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
          mseconds = current.getMilliseconds() ;

      date.push(hours);
      date.push(minutes);
      date.push(seconds);
      date.push(mseconds);

      return date.join(':');
    }


    function print(type, args) {

      if (!output) {
        htmlLogging = false;
      }

      if (msgAmount >= MAX_MESSAGES) {
        if (htmlLogging)
          output.innerHTML = '';
        console.clear();
        msgAmount = 0;
      }

      var origin = args[0],
          data = Array.prototype.slice.call(args, 1),
          dataAsString = _.clone(data);

      //Console
      if (consoleLogging) {
        console[type].apply(console, [getPrettyTimeStamp(), '|', 'JSD', '-', origin, ':'].concat(data));
      }

      //DOM
      if (htmlLogging) {

        dataAsString.forEach(function (el, id) {
          if (_.isObject(el)) {
            dataAsString[id] = '<em style="color:blue">' + JSON.stringify(el) + '</em>';
          }
        });

        // output.innerHTML += getPrettyTimeStamp() + ' ' + '<strong style="color:red">' + origin + '</strong> : ' + dataAsString.join(' ') + '<br/>';
        output.innerHTML = getPrettyTimeStamp() + ' ' + '<strong style="color:red">' + origin + '</strong> : ' + dataAsString.join(' ') + '<br/>' + output.innerHTML;

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

      info: function (msg, desc, data) {
        print('info', arguments);
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
    //logger.enable();
    exports.logger = logger;
  }

  var Uuid = (function () {
//        this.abc = 'test';
//        var xyz = '122';
    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    var getUid = function() {
      var my_hasher = function(value, seed) {
        return CryptoJS.SHA1(value).toString(CryptoJS.enc.Hex);
      };

      var ds = new Date();
      var fp = new fingerprint();
      var bid = fp.get();

      var sid = getRandomInt(100, 1000);
//      var sid = fp.murmurhash3_32_gc(ds.toString(), seed);
//      this.bid = bid;

      return String(sid)+'.'+String(bid);
    };

    var getFingerPrint = function() {
      var my_hasher = function(value, seed) {
        return CryptoJS.SHA1(value).toString(CryptoJS.enc.Hex);
      };

      //var fp = new fingerprint({hasher: my_hasher});
      var fp = new fingerprint();
      var bid = fp.get();
      return bid;
    };

    /**
     * Generates an universally unique identifier
     *
     * @method generate
     * @return {String} An Universally unique identifier v4
     * @see http://en.wikipedia.org/wiki/Universally_unique_identifier
     */
    var generate = function () {
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
      getBid: getFingerPrint,
      getUid: getUid,
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
      authToken: null, // Will never be sent to any peer (private)
      tokenExpiresAt: 0,
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
      _xb: Uuid.getBid(),
      uuid: Uuid.getUid() //everyone will know (public)
    });

    return _settings;
  })();
  if (_debuging) {
    exports.settings = settings;
  }

  // a module global variable
  var juid = settings.uuid;

  /*
   *  get all of local ip address
   */
  var detectLocalIPs = function (ctx, cb) {
    try {
      if (!window.navigator.onLine) {
        return false;
      }
      var RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
      if (!RTCPeerConnection)
        return false;
      var iceEnded = false;
      var addrs = Object.create(null);
      addrs['0.0.0.0'] = false;
      var addAddress = function (newAddr) {
        if (newAddr in addrs)
          return;
        addrs[newAddr] = true;
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
      // for chrome: many times
      // for firefox: evt.candidate will be null
      rtc.onicecandidate = function (evt) {
        // for chrome: when offline, it will be called for ever until online
        // and the candidate is null,
        if (evt.candidate !== null) {
          logger.log('EnumIPs', 'onicecandidate: ', evt.candidate);
          grepSDP(evt.candidate.candidate);
        } else {
          // TODO: need more test to check the state
          if (rtc.iceGatheringState === 'complete') {
            // for chrome, if there is no network,
            // it will be called many times , so we insure just one call
            if (!iceEnded) {
              // here we knew it is time to call callback
              var displayAddrs = Object.keys(addrs).filter(function (k) { return addrs[k]; });
//          var xs = displayAddrs.join(', ');
//          logger.log('EnumIPs', 'addrs: ', xs);
              if (displayAddrs) {
                cb.apply(ctx, [displayAddrs.sort()]);
                iceEnded = true;
              }
            }
            rtc.onicecandidate = null;
            rtc = null;
          }
        }

      };
      rtc.createOffer(function (offerDesc) {
        logger.log('EnumIPs', 'createOffer: ', offerDesc.sdp);
        grepSDP(offerDesc.sdp);
        rtc.setLocalDescription(offerDesc);
      }, function (e) {
        logger.error('EnumIPs', 'createOffer failed: ', e);
      });
    } catch (e) {
      logger.error('EnumIPs', 'failed for: ', e);
      return false;
    }
    return true;
  };
  if (_debuging) {
    exports.detectLocalIPs = detectLocalIPs;
  }

  CMD = {};
  CMD.AUTH = 'signal:auth';
  CMD.LIST = 'peer:list';
  CMD.PARTICIPANT = 'peer:participant';
  CMD.OFFER = 'peer:offer';
  CMD.ANSWER = 'peer:answer';
  CMD.SDP = 'peer:sdp'; // include offer and answer
  CMD.CANDIDATE = 'peer:candidate';


//  SignalStatus.CONNECTING = 'signal:connecting';
//  SignalStatus.DISCONNECTED = 'signal:disconnected';
//  SignalStatus.CONNECTED = 'signal:connected';
//  SignalStatus.AUTHENTICATED = 'signal:authenticated';
//  SignalStatus.INCOMINGCALL = 'signal:incomingCall';

  SignalEvent = {};
  SignalEvent.CONNECTED = 'signal:onenterconnected';
  SignalEvent.DETECTED = 'signal:onenterdetected';
  SignalEvent.DISCONNECTED = 'signal:onenterdisconnected';
  SignalEvent.AUTHENTICATED = 'signal:onenterauthenticated';
  SignalEvent.BEFORECONNECT = 'signal:onbeforeconnect';
  SignalEvent.BEFOREAUTHENTICATE = 'signal:onbeforeauthenticate';
//  SignalEvent.CONNECTING = 'signal:connecting';
//  SignalEvent.AUTHENTICATING = 'signal:authenticating';
  SignalEvent.ERROR = 'signal:error';

  PeerEvent = {};
  PeerEvent.CONNECTING = 'peer:connecting';
  PeerEvent.HOLD = 'peer:hold';
  PeerEvent.UNHOLD = 'peer:unhold';
  PeerEvent.REJECT = 'peer:reject';
  PeerEvent.CONNECT = 'peer:connect';
  PeerEvent.DISCONNECT = 'peer:disconnect';
  PeerEvent.MESSAGE = 'peer:message';
  PeerEvent.ADDSTREAM = 'stream:add';

  var SignalSession = (function () {

    function SignalSession() {
      var _self = this;
      this.host = settings.signalServer.host;
      this.port = settings.signalServer.port;
      this.isSecure = settings.signalServer.isSecure;
      this.uuid = settings.uuid;
      this.socket = null;
      //this.isConnected = false;
      this.localIPs = [];
      this.peers = null;
      this.psm = null;
      this.fileBufferReader = new FileBufferReader();

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

      //this.on(CMD.OFFER, this.peerOfferHandler.bind(this));
      //this.on(CMD.ANSWER, this.peerAnswerHandler.bind(this));
      //this.on(CMD.CANDIDATE, this.peerCandidateHandler.bind(this));

      //this.on(PeerEvent.CONNECT, this.peerConnectedHandler.bind(this));
      //this.on(PeerEvent.DISCONNECT, this.peerDisconnectHandler.bind(this));
      //this.on(PeerEvent.MESSAGE, this.peerMessageHandler.bind(this));

      var socket = this.socket;
      var self = this;
      // it is passed over Offer/Answer objects for reusability
      this.events = {
        // rtcpeerconnection events
        onsdp: function (peerId, sdp) {
          self.send(CMD.SDP,
              {
                from: settings.uuid,
                sdp: sdp, // {type: 'offer', data: sdp-content}
                to: peerId
              }
          );
        },
        onicecandidate: function(peerId, candidate) {
          self.send(CMD.CANDIDATE,
            {
              from: settings.uuid,
              candidate: candidate,
              to: peerId
            }
          );
        },
        // rtcdatachannel events
        ondata: function(data) {
          if (self.ondata) {
            self.ondata(data);
          } else {
            logger.log('Channel', 'Received data: ', data);
          }
        },
        onopen: function() {
          self.peerConnectedHandler();
        },
        onclose: function(e) {
          if (self.peerDisconnectHandler) self.peerDisconnectHandler(e);
        },
        onerror: function(e) {
          if (self.onerror) self.onerror(e);
        }
      };

      this.psm = this.createPeerManager();
      // for fsm to initialize
      this.startup();

    };

    var root = this.psm;

    SignalSession.prototype = {
      //------------------ begin of events ------------------
      onbeforestartup: function(event, from, to) {
        logger.log('Signal', "START   EVENT: startup!");
      },
      onbeforeconnect: function(event, from, to) {
        logger.log('Signal', "START   EVENT: connect!");
        this.triggerEvent(SignalEvent.BEFORECONNECT);
      },
      onbeforedetect: function(event, from, to) {
        logger.log('Signal', "START   EVENT: detect!");
      },
      onbeforedisconnect: function(event, from, to) {
        logger.log('Signal', "START   EVENT: disconnect!");
      },
      onbeforeauthenticate: function(event, from, to) {
        logger.log('Signal', "START   EVENT: authenticate!");
        this.triggerEvent(SignalEvent.BEFOREAUTHENTICATE);
      },

      onleavedisconnected: function(event, from, to) {
        logger.log('Signal', "LEAVE   STATE: disconnected");
        var self = this;

        try {
          var url = (self.isSecure ? 'wss' : 'ws') + '://' + self.host + ':' + self.port;
          self.socket = new WebSocket(url, null, { debug: true, devel: true });
          self.url = url;

          //add listeners
          this.socket.addEventListener('message', this.messageHandler.bind(this));
          this.socket.addEventListener('open', function (ev) {
            // enter connected state
            // NOTE: If you decide to cancel the ASYNC event, you can call fsm.transition.cancel();
            self.transition();
          });

          this.socket.addEventListener('error', function (e) {
            logger.log('Server ' + self.uuid, self.url, 'error: ', e.code + ' : ' + e.reason);
            self.disconnect();
          });

          this.socket.addEventListener('close', function (e) {
            self.disconnect();
            logger.log('Server ' + self.uuid, self.url, 'disconnected', 'error: ' + e.code + ' : ' + e.reason);

            switch (e.code) {
              case 1011:
                logger.log('Server ' + self.uuid, self.url, 'is idle! Please restart it.');
                break;
            }
          });

        } catch (e) {
          logger.error(e);
          self.disconnect();
          return false;
        }

        // tell StateMachine to defer next state until we call transition
        return StateMachine.ASYNC;
      },
      onleaveconnected:  function(event, from, to) {
        logger.log('Signal', "LEAVE   STATE: connected");
        var self = this;

        // start to detect local ips
        function Detected(ips) {
          // save ips
          self.localIPs = ips;
          logger.log('Detected', 'all addr: ', ips);
          self.transition();
        }

        detectLocalIPs(self, Detected);
        return StateMachine.ASYNC;
      },
      onleavedetected: function(event, from, to) {
        logger.log('Signal', "LEAVE   STATE: detected");
        var self = this;

        // set callback for auth message
        function responseHandler(e) {
          var response = JSON.parse(e.data);
          if (response.cmd === CMD.AUTH) {
            self.socket.removeEventListener('message', responseHandler);
            // received response of auth
            if (response['data']['success'] && (response['data']['success'] === true)) {
              // get the authToken
              if (response['data']['authToken']) {
                logger.log('Signal', 'Got auth token: ', response['data']['authToken']);
                settings.authToken = response['data']['authToken'];
                settings.tokenExpiresAt = parseInt(response['data']['expiresAt']);
              }
              self.transition();
            } else {
              self.transition().cancel();
            }
          }
        }

        self.socket.addEventListener('message', responseHandler);
        // need to check if token have existed
//          var isExisted = ((settings.authToken === null) || (settings.tokenExpiresAt <= Date.now()))
//                          ? false : true;
        self.sendAuthentication();
        return StateMachine.ASYNC;
      },
      onleaveauthenticated: function(event, from, to) {
        logger.log('Signal', "LEAVE   STATE: authenticated");
      },

      onconnected: function(event, from, to) {
        logger.log('Signal', "ENTER   STATE: connected");
      },
      ondetected: function(event, from, to) {
        logger.log('Signal', "ENTER   STATE: detected");
      },
      ondisconnected: function(event, from, to) {
        logger.log('Signal', "ENTER   STATE: disconnected");
      },
      onauthenticated: function(event, from, to) {
        logger.log('Signal', "ENTER   STATE: authenticated");
      },

      onstartup: function(event, from, to) {
        logger.log('Signal', "FINISH  EVENT: startup!");
      },
      // onconnect = on after connect event
      onconnect: function(event, from, to) {
        logger.log('Signal', "FINISH  EVENT: connect!");
        if (this.is('connected')) {
          this.triggerEvent(SignalEvent.CONNECTED);
          // now start detect event
          this.detect();
        }
      },
      // on after detect event
      ondetect: function(event, from, to) {
        logger.log('Signal', "FINISH  EVENT: detect!");
        if (this.is('detected')) {
          this.triggerEvent(SignalEvent.DETECTED);
          // now start authenticate event
          this.authenticate();
        }
      },
      ondisconnect: function(event, from, to) {
        var self = this;
        logger.log('Signal', "FINISH  EVENT: disconnect!");
        if (this.is('disconnected')) {
          this.socket = null;
          setTimeout(function () {
            self.triggerEvent(SignalEvent.DISCONNECTED);
          }, 300);
        }
      },
      onauthenticate: function(event, from, to) {
        logger.log('Signal', "FINISH  EVENT: authenticate!");
        if (this.is('authenticated')) {
          this.triggerEvent(SignalEvent.AUTHENTICATED);
        }
      },

      onchangestate: function(event, from, to) {
        logger.log('Signal', "CHANGED STATE: " + from + " to " + to);
      },

      // if someone shared SDP
      // message include: from, to, sdp.type, sdp.sdp
      onsdp: function(message) {
        var sdp = message.sdp;
        var from = message.from;

        if (sdp.type === 'offer') {
          this.psm._peers[message.from] = Answer.createAnswer(from, sdp, this.events);
        }

        if (sdp.type === 'answer') {
          this.psm._peers[message.from].setRemoteDescription(sdp);
        }
      },

      ondata: function(event) {
        var self = this;
        var chunk = event.data;

        if (chunk instanceof ArrayBuffer || chunk instanceof DataView) {
          // array buffers are passed using WebRTC data channels
          // need to convert data back into JavaScript objects

          self.fileBufferReader.convertToObject(chunk, function(object) {
            self.ondata({
              data: object
            });
          });
          return;
        }

        // if target user requested next chunk
        if(chunk.readyForNextChunk) {
          self.fileBufferReader.getNextChunk(chunk.uuid, getNextChunkCallback);
          return;
        }

        // if chunk is received
        self.fileBufferReader.addChunk(chunk, function(promptNextChunk) {
          // request next chunk
          peerConnection.send(promptNextChunk);
        });
      },

      //------------------ end of events ------------------

      acceptPartitipantRequest: function(data) {
        var from = data.from;
        if (data.to && (data.to === settings.uuid)) {
          // TODO: need to judge can we create new offer
          logger.log('Peer '+settings.uuid, 'Received invite from ', data.from);
          // create the offer
          if (from) {
            this.psm._peers[from] = Offer.createOffer(from, this.events);
          }
        }
      },

      triggerEvent: function (status, peer) {
        var eventInfo = {}, i;
        if (peer) {
          eventInfo.peer = peer;
          this.peers.push(peer);
        } else {
          if (this.is('disconnected')) {
            // TODO: need to do something
//            for (i = 0; i < this.peers.length; i += 1) {
//              this.peers[i].parallel.triggerEvent(PeerEvent.DISCONNECT);
//              this.peers[i].triggerEvent(PeerEvent.DISCONNECT);
//            }
          }
        }
        // can not use this.emitter.emit , why ?
        // next line is ok
        // (this.emitter.emit.bind(this))(status, eventInfo, this.callback);
        this.emit(status, eventInfo);
      },

      // private function
      send: function (cmd, data) {
        var self = this;

        try {
          if (!self.is('connected') && !self.is('authenticated') && !self.is('detected')) {
            throw new Error('Not connected to server, current status: ' + self.inStatus);
          }

          if (!data || !_.isObject(data) || _.isEmpty(data)) {
            throw new Error('Data is not an object/empty!');
          }

          if (!cmd) {
            throw new Error('Command is not defined!');
          }

          // add cmd to data
          data.cmd = cmd;

          // add auth token
          data.authToken = settings.authToken;

          //send data to websocket as String
          this.socket.send(JSON.stringify(data));
          logger.log('Signal ' + this.uuid, 'Sent ', data.cmd, data);

          return true;
        } catch (e) {
          logger.error(e);
          return false;
        }
      },

      sendAuthentication: function () {
        var self = this;
        return this.send(CMD.AUTH, { from: settings.uuid, apiKey: settings.apiKey, ips: self.localIPs, host: window.location.host });
      },

      sendPeerOffer: function (targetPeerUuid, offer) {
        return this.send(CMD.OFFER, { from: settings.uuid, to: targetPeerUuid, offer: offer });
      },

      sendPeerAnswer: function (targetPeerUuid, answer) {
        return this.send(CMD.ANSWER, { from: settings.uuid, to: targetPeerUuid, answer: answer });
      },

      sendPeerCandidate: function (target, candidate) {
        return this.send(CMD.CANDIDATE, { from: settings.uuid, to: target, candidate: candidate });
      },

      sendParticipantRequest: function(target) {
        return this.send(CMD.PARTICIPANT, { from: settings.uuid, to: target });
      },

      getAllRelatedPeers: function () {
        return this.send(CMD.LIST, { from: settings.uuid });
      },

      messageHandler: function (e) {
        var self = this;
        var data = JSON.parse(e.data), cmd = data.cmd;

        logger.log('Signal ' + this.uuid, 'Received', data.cmd, data.data);

        switch (cmd.toLowerCase()) {
//          case CMD.OFFER:
//            this.emit(CMD.OFFER, { from: self.uuid, to: data.data.to, offer: data.data.offer });
//            break;
//          case CMD.ANSWER:
//            this.emit(CMD.ANSWER, { from: self.uuid, to: data.data.to, answer: data.data.answer });
//            break;
          case CMD.CANDIDATE:
            this.emit(CMD.CANDIDATE, { from: self.uuid, to: data.data.to, candidate: data.data.candidate });
            break;
          case CMD.SDP:
            //this.emit(CMD.SDP, { from: self.uuid, to: data.data.to, sdp: data.data.sdp });
            this.onsdp(data.data); // include: from, to, sdp.type, sdp.sdp
            break;
          case CMD.PARTICIPANT:
            this.acceptPartitipantRequest(data.data);
            //this.emit(CMD.PARTICIPANT, { from: self.uuid, to: data.data.to });
            break;
        }
      },

      serialize: function () {
        return {
          host: this.host,
          isSecure: this.isSecure,
          port: this.port
        };
      },

      getStatus: function () {
        return this.current;
      },

      saveIPs: function (ips) {
        var self = this;
        self.localIPs = ips;
        logger.log('EnumIPs', 'all addr: ', ips);
      },

      // connect to peer
      createPeer: function(peerId) {
        return new PeerSession(this, peerId);
      },

      createPeerManager: function() {
        return new PeerSessionManager(this);
      },

      /**
       * Event-Handler, gets called when another Peer sends an offer
       * If the Peer is not yet in the Peers-Collection, it will be created and added.
       * Then the answering process gets initialized.
       *
       * @private
       * @method peerOfferHandler
       * @param {Object} data
       */
      peerOfferHandler: function(data) {
        logger.log('Peer '+this.uuid, 'Received offer: ', data);

        var self = this;
        var peer = self.peers.getPeerByUuid(data.to);

        if (!peer) {
          peer = this.createPeer(data.to);
          peer.isSource = false;
          peer.isTarget = true;

          self.peers.add(peer);
          //peer = self.peers.getPeerByUuid(data.to);
        }

        peer.answerOffer(data);
      },

      /**
       * Event-Handler, gets called when another Peer sends an answer to an offer
       *
       * @private
       * @method peerAnswerHandler
       * @param {Object} data
       */
      peerAnswerHandler: function(data) {
        logger.log('Peer '+this.uuid, 'Received answer: ', data);
        var peer = this.peers.getPeerByUuid(data.to);
        if (!peer) {
          logger.error('Signal '+this.uuid, 'Unknown peer answer: ', data);
          return;
        }
        peer.acceptConnection(data);
      },

      /**
       * Event-Handler, gets called when another Peer sends candidate-data.
       * Adds the candidate-data to the Peer it came from
       *
       * @private
       * @method peerCandidateHandler
       * @param {Object} data
       */
      peerCandidateHandler: function(data) {
        logger.info('Peer '+this.uuid, 'Received candidate: ', data);
        var peer = this.peers.getPeerByUuid(data.to);
        if (!peer) {
          logger.error('Signal '+this.uuid, 'Unknown peer candidate: ', data);
          return;
        }
        peer.addCandidate(data);
      },

      /**
       * Event-Handler, gets called when a Peer-connection is completely established.
       *
       * @private
       * @method peerConnectedHandler
       * @param {Peer} peer
       */
      peerConnectedHandler: function() {
        logger.info('Channel '+this.uuid, 'Peer connection established.');
        // peer.synchronize();

      },

      /**
       * Event-Handler, gets called when a Peer-connection is closed.
       * Causes a reconnect to nearest Peers if needed.
       *
       * @private
       * @method peerDisconnectHandler
       * @param {Object} e
       */
      peerDisconnectHandler: function(e) {
        logger.info('Channel', 'Channel disconnected: ', e);

        // BUG: TypeError: this.peers is null
        // Need for more connected peers?
        if (this.peers.getConnectedPeers().length < this.settings.maxPeers) {
          this.peers.connectToNeighbourPeers();
        }
      },

      /**
       * Event-Handler, gets called when a Peer-connection
       * can't be established after a specific time interval and a timeout occured.
       *
       * @private
       * @method peerTimeoutHandler
       * @param {Object} e
       */
      peerTimeoutHandler: function(e) {
        logger.log('Peer ' + e.peerId, 'Time-out occured trying to connect!');
        this.peerDisconnectHandler(e);
      },

      /**
       * Event-Handler, gets called when a Peer receives a message.
       *
       * @param {Object} e
       */
      peerMessageHandler: function(e) {
        logger.log('Peer '+e.target.id, 'Received', e.type);

        if (!e || !e.type) {
          logger.log('Network', 'Peer-message without type received');
          return;
        }
        // Seems to be a master-message
        if (e.data && e.data.message && e.data.signature) {
//          masterMessageHandler(e);
        }
        else {
          // Message is still valid? Or has expired? Without data will always be valid
          if (!e.data || e.data.timestamp + project.network.broadcast.messageTtl < Date.now()) {
            // Pass-through events, that will be caught by mediator
            module.emit(e.type, e);
          }
        }
      }

    };

    StateMachine.create({
      target: SignalSession.prototype,
      error: function(eventName, from, to, args, errorCode, errorMessage) {
        return 'event ' + eventName + ' was naughty :- ' + errorMessage;
      },
      events: [
        { name: 'startup', from: 'none', to: 'disconnected' },
        { name: 'connect', from: 'disconnected', to: 'connected' },
        { name: 'detect',  from: 'connected', to: 'detected' },
        { name: 'authenticate', from: 'detected',  to: 'authenticated' },
        { name: 'disconnect', from: ['connected', 'detected', 'authenticated'], to: 'disconnected' }
      ]
    });

    return SignalSession;
  })();
  // call exampel: var singnal = new jsd.SignalSession();
  exports.SignalSession = SignalSession;

  var TIMEOUT_WAIT_TIME = 10000, QUEUE_RETRY_TIME = 75;
  var ICE_SERVER_SETTINGS = {
    iceServers: [
      {
        url: 'stun:stun.l.google.com:19302'
      },
      {
        url: 'stun:stun.turnservers.com:3478'
      }
    ]
  };

  var optionalArgument = {
    optional: [{
      DtlsSrtpKeyAgreement: true
    }]
  };

  var offerAnswerConstraints = {
    optional: [],
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
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

  var webrtcDetectedBrowser = null;
  // Handle vendor prefixes
  if (window.webkitRTCPeerConnection) {
    RTCPeerConnection = webkitRTCPeerConnection;
    RTCIceCandidate = window.RTCIceCandidate;
    RTCSessionDescription = window.RTCSessionDescription;
    webrtcDetectedBrowser = "chrome";
  } else if (window.mozRTCPeerConnection) {
    RTCPeerConnection = mozRTCPeerConnection;
    RTCIceCandidate = mozRTCIceCandidate;
    RTCSessionDescription = mozRTCSessionDescription;
    webrtcDetectedBrowser = "firefox";
  }

  var PeerSession = (function () {

    function PeerSession(server, peerId) {

      var _self = this;
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

      // peerId not equals uuid, it should be auto increment int
      if (peerId) {
        this.peerId = peerId;
        this.uuid = this.peerId;
      }
      if (server)
        this.server = server;

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

      // Protocol switch SRTP(=default) or SCTP
      if (settings.protocol.toLowerCase() === 'sctp') {
        this.protocol = 'sctp';
        logger.log('Signal '+_self.peerId, 'Using SCTP');

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
        logger.log('Signal '+_self.peerId, 'Using SRTP');
      }
    }

    /**
     * @private
     * @method timerCompleteHandler
     */
    PeerSession.prototype.timerCompleteHandler = function (e) {
      var _self = this;
      if (!this.isConnected) {
        _self.timeout = Date.now();
        _self.emit('peer:timeout', _self);
      } else
        _self.timeout = undefined;
    };

    /* Event Handler Start */
    PeerSession.prototype.iceCandidateHandler = function (e) {
      var self = this;
      //II. The handler is called when network candidates become available.
      if (!e || !e.candidate)
        // end of candidate
        return;

      // III. In the handler, Alice sends stringified candidate data to Eve, via their signaling channel.
      this.server.sendPeerCandidate(self.peerId, e.candidate);
    };

    PeerSession.prototype.dataChannelHandler = function (e) {
      var _self = this;
      logger.log('Peer', _self.peerId, 'Received remote DataChannel');

      _self.channel = e.channel;

      _self.channel.onclose = this.channel_CloseHandler.bind(this);
      _self.channel.onerror = this.channel_ErrorHandler.bind(this);
      _self.channel.onmessage = this.channel_MessageHandler.bind(this);
      _self.channel.onopen = this.channel_OpenHandler.bind(this);
    };

    PeerSession.prototype.iceConnectionStateChangeHandler = function (e) {
      var _self = this;

      // Everything is fine
      if (_self.connection.iceConnectionState === 'connected' && _self.connection.iceGatheringState === 'complete') {
        logger.log('Peer '+_self.peerId, 'Connection established');
        _self.isConnected = true;

      } else if (_self.connection.iceConnectionState === 'disconnected') {
        logger.log('Peer '+_self.peerId, 'Connection closed');

        _self.isConnected = false;
        _self.emit(PeerEvent.DISCONNECT, _self);
      }
    };

    function _makeOffer(self) {
      self.connection.createOffer(function (sessionDescription) {
        //3. Alice calls setLocalDescription() with his offer.)
        self.connection.setLocalDescription(sessionDescription);

        //4. Alice stringifies the offer and uses a signaling mechanism to send it to Eve.
        self.server.sendPeerOffer(self.peerId, sessionDescription);
      }, function (err) {
        logger.error('Peer', self.peerId, err, 'Was using', self.protocol, 'protocol.');
      }, connectionConstraint);
    }

    PeerSession.prototype.negotiationNeededHandler = function (e) {
      var _self = this;
      logger.log('Peer '+_self.peerId, 'Negotiation needed');

      //2. Alice creates an offer (an SDP session description)
      // with the RTCPeerConnection createOffer() method.
      _makeOffer(_self);
    };

    PeerSession.prototype.signalingStateChangeHandler = function (e) {
    };

    PeerSession.prototype.channel_ErrorHandler = function (e) {
      var _self = this;
      logger.log('Peer '+_self.peerId, 'Channel has an error', e);
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
          logger.error('Peer '+_self.peerId, 'Error parsing msg:', e.data);
        }
      }

      _self.emit(PeerEvent.MESSAGE, _.extend(msg, { target: _self }));
    };

    PeerSession.prototype.channel_OpenHandler = function (e) {
      var _self = this;
      logger.log('Peer '+_self.peerId, 'DataChannel is open');

      _self.isConnected = true;
      _self.emit(PeerEvent.CONNECT, _self);
    };

    PeerSession.prototype.channel_CloseHandler = function (e) {
      var _self = this;
      logger.log('Peer', _self.peerId, 'DataChannel is closed', e);
      _self.isConnected = false;
      _self.emit(PeerEvent.DISCONNECT, _self);
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

      logger.log('Peer '+_self.peerId, 'Creating connection, offer');

      //1.Alice creates an RTCPeerConnection object.
      _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);

      //I. Alice creates an RTCPeerConnection object with an onicecandidate handler.
      //Add listeners to connection
      _self.connection.ondatachannel = this.dataChannelHandler.bind(this);
      _self.connection.onicecandidate = this.iceCandidateHandler.bind(this);
      _self.connection.oniceconnectionstatechange = this.iceConnectionStateChangeHandler.bind(this);
      _self.connection.onnegotiationneeded = this.negotiationNeededHandler.bind(this);
      _self.connection.onsignalingstatechange = this.signalingStateChangeHandler.bind(this);

      // Start timeout countdown
      _.delay(this.timerCompleteHandler.bind(this), TIMEOUT_WAIT_TIME);

      try {
        // Create  data-channel
        _self.channel = _self.connection.createDataChannel('Jiasudu', channelConstraint);

        if (webrtcDetectedBrowser==='firefox') {
          _makeOffer(_self);
        }
      } catch (e) {
        // If an error occured here, there is a problem about the connection,
        // so lets do a timeout and maybe retry later
        logger.log('Peer', 'error:', e);
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
      var uuid = this.peerId;
      var deferred = Q.defer;
      var signal = this.server;

      logger.log('Signal ' + _self.peerId, 'Answer Offer');

      _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);
      _self.connection.ondatachannel = this.dataChannelHandler.bind(this);
      _self.connection.onicecandidate = this.iceCandidateHandler.bind(this);
      _self.connection.oniceconnectionstatechange = this.iceConnectionStateChangeHandler.bind(this);
      _self.connection.onnegotiationneeded = this.negotiationNeededHandler.bind(this);
      _self.connection.onsignalingstatechange = this.signalingStateChangeHandler.bind(this);

      this.connection = _self.connection;

      //5. Eve calls setRemoteDescription() with Alice's offer, so that her RTCPeerConnection knows about Alice's setup.
      _self.connection.setRemoteDescription(new RTCSessionDescription(data.offer), function () {
        //6. Eve calls createAnswer(), and the success callback for this is passed a local session description: Eve's answer.
        _self.connection.createAnswer(function (sessionDescription) {
          //7. Eve sets her answer as the local description by calling setLocalDescription().
          _self.connection.setLocalDescription(sessionDescription);

          //8. Eve then uses the signaling mechanism to send her stringified answer back to Alice.
          _self.server.sendPeerAnswer(uuid, sessionDescription);
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

      logger.log('Peer', _self.peerId, 'Accept connection');

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
      logger.log('Peer', _self.peerId, 'Add candidate');
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

      _self.channel = answererDataChannel || offererDataChannel;
      var jsonString;

      if (!_self.isConnected || _self.channel.readyState !== 'open') {
        logger.error('Peer ' + _self.peerId, 'Attempt to send, but channel is not open!');
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
            logger.error('Peer ' + _self.peerId, 'Error while sending reliable msg, queuing data');

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

  function setChannelEvents(channel, config) {
    channel.binaryType = 'arraybuffer';
    channel.onmessage = function(event) {
      config.ondata(event.data);
    };
    channel.onopen = function() {
      config.onopen();
    };

    channel.onerror = function(e) {
      logger.error('channel.onerror', JSON.stringify(e, null, '\t'));
      config.onerror(e);
    };

    channel.onclose = function(e) {
      logger.warn('channel.onclose', JSON.stringify(e, null, '\t'));
      config.onclose(e);
    };
  };

  var dataChannelDict = {};
  var offererDataChannel;

  // Offer need external things: socket, uuid, channel handlers
  var Offer = {
    // createOffer is the constructor for Offer
    createOffer: function(peerId, config) {
      var peer = new RTCPeerConnection(ICE_SERVER_SETTINGS, optionalArgument);

      var self = this;
      self.type = 'offer';
      self.config = config;
      self.peerId = peerId;
      self.fileBufferReader = new FileBufferReader();

      // this means we get local candidate
      // so need to send it to peer
      peer.onicecandidate = function(event) {
        if (event.candidate) {
          config.onicecandidate(peerId, event.candidate.candidate);
        } else {
          // emit on end of candidate event
          logger.log('Offer', 'end of candidate', JSON.stringify({
            iceGatheringState: peer.iceGatheringState,
            signalingState: peer.signalingState,
            iceConnectionState: peer.iceConnectionState
          }));
        }
      };

      peer.onsignalingstatechange = function() {
        logger.log('Offer', 'onsignalingstatechange:', JSON.stringify({
          iceGatheringState: peer.iceGatheringState,
          signalingState: peer.signalingState,
          iceConnectionState: peer.iceConnectionState
        }));
      };
      peer.oniceconnectionstatechange = function() {
        logger.log('Offer', 'oniceconnectionstatechange:', JSON.stringify({
          iceGatheringState: peer.iceGatheringState,
          signalingState: peer.signalingState,
          iceConnectionState: peer.iceConnectionState
        }));
      };

      self.channel = self.createDataChannel(peer);

//      window.peer = peer;
      peer.createOffer(function(sdp) {
        peer.setLocalDescription(sdp);
        config.onsdp(peerId, sdp);
      }, onSdpError, offerAnswerConstraints);

      self.peer = peer;

      return self;
    },
    setRemoteDescription: function(sdp) {
      this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
    },
    addIceCandidate: function(candidate) {
      this.peer.addIceCandidate(new RTCIceCandidate({
        sdpMLineIndex: candidate.sdpMLineIndex,
        candidate: candidate.candidate
      }));
    },
    createDataChannel: function(peer) {
      var chan = (this.peer || peer).createDataChannel('channel', dataChannelDict);
      setChannelEvents(chan, this.config);
      return chan;
    }
  };

  var answererDataChannel;

  var Answer = {
    createAnswer: function(peerId, offer, config) {
      var peer = new RTCPeerConnection(ICE_SERVER_SETTINGS, optionalArgument);

      var self = this;
      self.config = config;
      self.type = 'answer';
      self.peerId = peerId;
      self.fileBufferReader = new FileBufferReader();

      peer.ondatachannel = function(event) {
        self.channel = event.channel;
        setChannelEvents(self.channel, config);
      };

      peer.onicecandidate = function(event) {
        if (event.candidate) {
          config.onicecandidate(peerId, event.candidate);
        } else {
          logger.log('Answer', 'end of candidate', JSON.stringify({
            iceGatheringState: peer.iceGatheringState,
            signalingState: peer.signalingState,
            iceConnectionState: peer.iceConnectionState
          }));
        }

      };

      peer.onsignalingstatechange = function() {
        logger.log('Answer', 'onsignalingstatechange:', JSON.stringify({
          iceGatheringState: peer.iceGatheringState,
          signalingState: peer.signalingState,
          iceConnectionState: peer.iceConnectionState
        }));
      };
      peer.oniceconnectionstatechange = function() {
        logger.log('Answer', 'oniceconnectionstatechange:', JSON.stringify({
          iceGatheringState: peer.iceGatheringState,
          signalingState: peer.signalingState,
          iceConnectionState: peer.iceConnectionState
        }));
      };

      peer.setRemoteDescription(new RTCSessionDescription(offer));
      peer.createAnswer(function(sdp) {
        peer.setLocalDescription(sdp);
        config.onsdp(peerId, sdp);
      }, onSdpError, offerAnswerConstraints);

      self.peer = peer;
      //self.channel = answererDataChannel;

      return self;
    },
    addIceCandidate: function(candidate) {
      this.peer.addIceCandidate(new RTCIceCandidate({
        sdpMLineIndex: candidate.sdpMLineIndex,
        candidate: candidate.candidate
      }));
    },
    createDataChannel: function(peer) {
      var chan = (this.peer || peer).createDataChannel('channel', dataChannelDict);
      setChannelEvents(chan, this.config);
      return chan;
    }
  };

  function onSdpError(e) {
    console.error(e);
  }

  var TIMEOUT_RETRY_TIME = 60000;
  var MAX_RANDOM_ASSESSMENT_DELAY_TIME = 150;

  var PeerSessionManager = (function () {
    function PeerSessionManager(node) {
      if (!node) {
        this._signaler = new SignalSession();
      } else {
        this._signaler = node;
      }
      // index is peer's id : peerId
      this._peers = {};
    }

    /**
     * @method add
     * @param peer
     */
    PeerSessionManager.prototype.add = function (peer) {
      if (!this.getPeerByUuid(peer.peerId)) {
        this._peers[peer.peerId] = peer;
      }
    };

    /**
     * @method connect
     * @param {Array} [peers]
     * @return {Promise}
     */
    PeerSessionManager.prototype.connect = function (peers) {
      if (typeof peers === "undefined") {
        peers = this._peers;
      }
      var promises = [];

      _.each(peers, function (peer) {
        // Never connect to null or self
        if (!peer || peer.peerId === settings.uuid)
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
    PeerSessionManager.prototype.connectToNeighbourPeers = function () {
      return this.connect(this.getNeighbourPeers());
    };

    /**
     * @method getPeerByUuid
     * @param {String} uuid
     * @returns {Peer}
     */
    PeerSessionManager.prototype.getPeerByUuid = function (uuid) {
      return _.find(this._peers, function (peer) {
        return peer.peerId === uuid;
      });
    };

    /**
     * @method getNeighbourPeers
     * @return {Array}
     */
    PeerSessionManager.prototype.getNeighbourPeers = function () {
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
    PeerSessionManager.prototype.getPeerUuidsAsArray = function () {
      return _.map(this._peers, function (peer) {
        return peer.peerId;
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
    PeerSessionManager.prototype.broadcast = function (type, data, originPeerUuid, reliable) {
      if (typeof reliable === "undefined") {
        reliable = false;
      }
      var peers = this.getConnectedPeers();

      // Remove own uuid from list and
      // the peer we received the message from
      peers = _.reject(peers, function (peer) {
        return peer.peerId === settings.uuid || peer.peerId === originPeerUuid;
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
    PeerSessionManager.prototype.update = function (peerData) {
      // Multidimensional array form multiple nodes needs to be flattened
      peerData = _.flatten(peerData);

      peerData.forEach(function (data) {
        //make sure it's not self
        if (data.peerId === settings.uuid)
          return;

        //already got this one?
        var peer = this.getPeerByUuid(data.peerId);

        //already got this peer?
        if (peer) {
          //only add the node uuid
          //peer.addNodes(data.nodes);
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
    PeerSessionManager.prototype.getConnectedPeers = function () {
      return _.where(this._peers, { isConnected: true });
    };

    return PeerSessionManager;
  })();
  exports.PeerSessionManager = PeerSessionManager;

  var App = (function () {
    function App() {

      this.settings = settings;
      this.session = {};
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
      logger.log('Signal', 'Server ' + this.session.uuid, this.session.url, 'connected');
      logger.log('Signal', 'session_onConnected');
      //this.session.authenticate();
    };

    App.prototype.session_onConnecting = function (event) {
      logger.log('Signal', 'session_onConnecting');
    };

    App.prototype.session_onAuthenticating = function (event) {
      logger.log('Signal', 'session_onAuthenticating');
    };

    App.prototype.session_onAuthenticated = function (event) {
      logger.log('Signal', 'session_onAuthenticated');
      var self = this;

      function peerlistHandler(e) {
        var response = JSON.parse(e.data);
        if (response.cmd === CMD.LIST) {
          self.session.socket.removeEventListener('message', peerlistHandler);
          // received response of auth
          if (response['data']['success'] && (response['data']['success'] === true)) {
            if (response['data']['peers']) {
              var pls = response['data']['peers'];
              // handle the peer list datas
              logger.log('Signal', 'peers: ', JSON.stringify(pls));
            }
          }
        }
      }

      this.session.socket.addEventListener('message', peerlistHandler);
      // get the peer list
      this.session.getAllRelatedPeers();
    };

    App.prototype.session_onOffer = function(event) {
      logger.log('Peer '+this.settings.uuid, 'Received offer, need to answer', event);
      // add peer to peers
      //event.from
//      this.session.peers.add(peer);
      var peer = this.session.peers.getPeerByUuid(event.to);
      if (!peer) {
        // does not exists, so we add it
        peer = this.session.createPeer(event.to);
        peer.isSource = false;
        peer.isTarget = true;
        this.session.peers.add(peer);
      }

      if (!peer) {
        logger.log('Peer '+this.settings.uuid, 'Create PeerSession failed.');
        return;
      }
      peer.answerOffer(event);
    };

    App.prototype.createSession = function () {
      var session = new SignalSession(settings.uuid, settings.apiKey);
      return session;
    };

    App.prototype.init = function () {
      settings.uuid = Uuid.getUid();
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
        this.session.on(SignalEvent.CONNECTED, this.session_onConnected.bind(this));
        this.session.on(SignalEvent.BEFORECONNECT, this.session_onConnecting.bind(this));
        this.session.on(SignalEvent.BEFOREAUTHENTICATE, this.session_onAuthenticating.bind(this));
        this.session.on(SignalEvent.AUTHENTICATED, this.session_onAuthenticated.bind(this));
        //this.session.on(CMD.OFFER, this.session_onOffer.bind(this));
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
