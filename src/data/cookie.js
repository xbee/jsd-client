/*jslint browser: true, nomen: false, plusplus: false, bitwise: false, maxerr: 50, indent: 2 */

try{
(function (window) {
  'use strict';
  var document = window.document,
    Image = window.Image,
    globalStorage = window.globalStorage,
    swfobject = window.swfobject;

  try{
    var localStore = window.localStorage
  }catch(ex){}
  
  try {
    var sessionStorage = window.sessionStorage;
  } catch (e) { }

  function newImage(src) {
    var img = new Image();
    img.style.visibility = "hidden";
    img.style.position = "absolute";
    img.src = src;
  }
  function _ec_replace(str, key, value) {
    if (str.indexOf("&" + key + "=") > -1 || str.indexOf(key + "=") === 0) {
      // find start
      var idx = str.indexOf("&" + key + "="),
        end, newstr;
      if (idx === -1) {
        idx = str.indexOf(key + "=");
      }
      // find end
      end = str.indexOf("&", idx + 1);
      if (end !== -1) {
        newstr = str.substr(0, idx) + str.substr(end + (idx ? 0 : 1)) + "&" + key + "=" + value;
      } else {
        newstr = str.substr(0, idx) + "&" + key + "=" + value;
      }
      return newstr;
    } else {
      return str + "&" + key + "=" + value;
    }
  }

 function idb() {
    if ('indexedDB' in window) {
        return true
    } else if (window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB) {
        return true
    } else {
        return false
    }
  } 

  // necessary for flash to communicate with js...
  // please implement a better way
  var _global_lso;
  function _evercookie_flash_var(cookie) {
    _global_lso = cookie;

    // remove the flash object now
    var swf = document.getElementById("myswf");
    if (swf && swf.parentNode) {
      swf.parentNode.removeChild(swf);
    }
  }

  /*
   * Again, ugly workaround....same problem as flash.
   */
  var _global_isolated;
  function onSilverlightLoad(sender, args) {
    var control = sender.getHost();
    _global_isolated = control.Content.App.getIsolatedStorage();
  }

  function onSilverlightError(sender, args) {
    _global_isolated = "";
  }

  var defaultOptionMap = {
    java: true, // Java applet on/off... may prompt users for permission to run.
    tests: 10,  // 1000 what is it, actually?
    silverlight: true, // you might want to turn it off https://github.com/samyk/evercookie/issues/45
    domain: '.' + window.location.host.replace(/:\d+/, ''), // Get current domain
    baseurl: '', // base url for php, flash and silverlight assets
    asseturi: '/lib/evercookie/assets' // assets = .fla, .jar, etc

  };
  
  var _baseKeyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  /**
   * @class Evercookie
   * @param {Object} options
   * @param {Boolean} options.history CSS history knocking or not .. can be network intensive
   * @param {Boolean} options.java Java applet on/off... may prompt users for permission to run.
   * @param {Number} options.tests
   * @param {Boolean} options.silverlight you might want to turn it off https://github.com/samyk/evercookie/issues/45
   * @param {String} options.domain (eg: www.sitename.com use .sitename.com)
   * @param {String} options.baseurl base url (eg: www.sitename.com/demo use /demo)
   * @param {String} options.asseturi asset path (eg: www.sitename.com/assets use /assets)
   * @param {String} options.phpuri php path/route (eg: www.sitename.com/php use /php)
   * @param {String|Function} options.domain as a string, domain for cookie, as a function, accept window object and return domain string
   * @param {String} options.pngCookieName
   * @param {String} options.pngPath
   * @param {String} options.etagCookieName:
   * @param {String} options.etagPath
   * @param {String} options.cacheCookieName
   * @param {String} options.cachePath
   */
  function Evercookie(options) {
    options = options || {};
    var opts = {};
    for (var key in defaultOptionMap) {
      var optValue = options[key];
      if(typeof optValue !== 'undefined') {
        opts[key] = optValue
      } else {
        opts[key] = defaultOptionMap[key];
      }
    }
    if(typeof opts.domain === 'function'){
      opts.domain = opts.domain(window);
    }
    var _ec_java =  opts.java,
      _ec_tests = opts.tests,
      _ec_baseurl = opts.baseurl,
      _ec_asseturi = opts.asseturi,
      _ec_domain = opts.domain;

    // private property
    var self = this;
    this._ec = {};

    this.get = function (name, cb, dont_reset) {
      self._evercookie(name, cb, undefined, undefined, dont_reset);
    };

    this.set = function (name, value) {
      self._evercookie(name, function () {}, value);
    };

    this._evercookie = function (name, cb, value, i, dont_reset) {
      if (self._evercookie === undefined) {
        self = this;
      }
      if (i === undefined) {
        i = 0;
      }
      // first run
      if (i === 0) {
        self.evercookie_database_storage(name, value);
        self.evercookie_indexdb_storage(name, value);
        self.evercookie_lso(name, value);
        if (opts.silverlight) {
          self.evercookie_silverlight(name, value);
        }
        if (_ec_java) {
          self.evercookie_java(name, value);
        }
        
        self._ec.userData      = self.evercookie_userdata(name, value);
        self._ec.cookieData    = self.evercookie_cookie(name, value);
        self._ec.localData     = self.evercookie_local_storage(name, value);
        self._ec.globalData    = self.evercookie_global_storage(name, value);
        self._ec.sessionData   = self.evercookie_session_storage(name, value);
        self._ec.windowData    = self.evercookie_window(name, value);

      }

      // when writing data, we need to make sure lso and silverlight object is there
      if (value !== undefined) {
        if ((typeof _global_lso === "undefined" ||
          typeof _global_isolated === "undefined") &&
          i++ < _ec_tests) {
          setTimeout(function () {
            self._evercookie(name, cb, value, i, dont_reset);
          }, 300);
        }
      }

      // when reading data, we need to wait for swf, db, silverlight, java and png
      else
      {
        if (
          (
            // we support local db and haven't read data in yet
            (window.openDatabase && typeof self._ec.dbData === "undefined") ||
            (idb() && (typeof self._ec.idbData === "undefined" || self._ec.idbData === "")) ||
            (typeof _global_lso === "undefined") ||
            (typeof self._ec.javaData === "undefined") ||
            (typeof _global_isolated === "undefined")
          ) &&
          i++ < _ec_tests
        )
        {
          setTimeout(function () {
            self._evercookie(name, cb, value, i, dont_reset);
          }, 300);
        }

        // we hit our max wait time or got all our data
        else
        {
          // get just the piece of data we need from swf
          self._ec.lsoData = self.getFromStr(name, _global_lso);
          _global_lso = undefined;

          // get just the piece of data we need from silverlight
          self._ec.slData = self.getFromStr(name, _global_isolated);
          _global_isolated = undefined;

          var tmpec = self._ec,
            candidates = [],
            bestnum = 0,
            candidate,
            item;
          self._ec = {};

          // figure out which is the best candidate
          for (item in tmpec) {
            if (tmpec[item] && tmpec[item] !== "null" && tmpec[item] !== "undefined") {
              candidates[tmpec[item]] = candidates[tmpec[item]] === undefined ? 1 : candidates[tmpec[item]] + 1;
            }
          }

          for (item in candidates) {
            if (candidates[item] > bestnum) {
              bestnum = candidates[item];
              candidate = item;
            }
          }

          // reset cookie everywhere
          if (candidate !== undefined && (dont_reset === undefined || dont_reset !== 1)) {
            self.set(name, candidate);
          }
          if (typeof cb === "function") {
            cb(candidate, tmpec);
          }
        }
      }
    };

    this.evercookie_window = function (name, value) {
      try {
        if (value !== undefined) {
          window.name = _ec_replace(window.name, name, value);
        } else {
          return this.getFromStr(name, window.name);
        }
      } catch (e) { }
    };

    this.evercookie_userdata = function (name, value) {
      try {
        var elm = this.createElem("div", "userdata_el", 1);
        elm.style.behavior = "url(#default#userData)";

        if (value !== undefined) {
          elm.setAttribute(name, value);
          elm.save(name);
        } else {
          elm.load(name);
          return elm.getAttribute(name);
        }
      } catch (e) {}
    };

    this.ajax = function (settings) {
      var headers, name, transports, transport, i, length;

      headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
      };

      transports = [
        function () { return new XMLHttpRequest(); },
        function () { return new ActiveXObject('Msxml2.XMLHTTP'); },
        function () { return new ActiveXObject('Microsoft.XMLHTTP'); }
      ];

      for (i = 0, length = transports.length; i < length; i++) {
        transport = transports[i];
        try {
          transport = transport();
          break;
        } catch (e) {
        }
      }

      transport.onreadystatechange = function () {
        if (transport.readyState !== 4) {
          return;
        }
        settings.success(transport.responseText);
      };
      transport.open('get', settings.url, true);
      for (name in headers) {
        transport.setRequestHeader(name, headers[name]);
      }
      transport.send();
    };

    this.evercookie_java = function (name, value) {
      var div = document.getElementById("ecAppletContainer");

      // Exit if dtjava.js was not included in the page header.
      if (typeof dtjava === "undefined") {
	      return;
      }
      
      // Create the container div if none exists.
      if (div===null || div === undefined || !div.length) {
        div = document.createElement("div");
        div.setAttribute("id", "ecAppletContainer");
        div.style.position = "absolute";
        div.style.top = "-3000px";
        div.style.left = "-3000px";
        div.style.width = "1px";
        div.style.height = "1px";
        document.body.appendChild(div);
      }

      // If the Java applet is not yet defined, embed it.
      if (typeof ecApplet === "undefined") {
        dtjava.embed({ 
        	id: "ecApplet",
        	url: _ec_baseurl + _ec_asseturi + "/evercookie.jnlp", 
        	width: "1px", 
        	height: "1px", 
        	placeholder: "ecAppletContainer"
          }, {},{ onJavascriptReady: doSetOrGet });
        // When the applet is loaded we will continue in doSetOrGet() 
      }
      else {
	// applet already running... call doGetOrSet() directly.
	doSetOrGet("ecApplet");
      }
      
      function doSetOrGet(appletId) {
	var applet = document.getElementById(appletId);	
        if (value !== undefined) {
          applet.set(name,value);
        }
        else {
          self._ec.javaData = applet.get(name);
        }
      }
      
      // The result of a get() is now in self._ec._javaData
    };

    this.evercookie_lso = function (name, value) {
      var div = document.getElementById("swfcontainer"),
        flashvars = {},
        params = {},
        attributes = {};
      if (div===null || div === undefined || !div.length) {
        div = document.createElement("div");
        div.setAttribute("id", "swfcontainer");
        document.body.appendChild(div);
      }

      if (value !== undefined) {
        flashvars.everdata = name + "=" + value;
      }
      params.swliveconnect = "true";
      attributes.id        = "myswf";
      attributes.name      = "myswf";
      swfobject.embedSWF(_ec_baseurl + _ec_asseturi + "/evercookie.swf", "swfcontainer", "1", "1", "9.0.0", false, flashvars, params, attributes);
    };

    this.evercookie_local_storage = function (name, value) {
      try {
        if (localStore) {
          if (value !== undefined) {
            localStore.setItem(name, value);
          } else {
            return localStore.getItem(name);
          }
        }
      } catch (e) { }
    };

    this.evercookie_database_storage = function (name, value) {
      try {
        if (window.openDatabase) {
          var database = window.openDatabase("sqlite_evercookie", "", "evercookie", 1024 * 1024);

          if (value !== undefined) {
            database.transaction(function (tx) {
              tx.executeSql("CREATE TABLE IF NOT EXISTS cache(" +
                "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, " +
                "name TEXT NOT NULL, " +
                "value TEXT NOT NULL, " +
                "UNIQUE (name)" +
                ")", [], function (tx, rs) {}, function (tx, err) {});
              tx.executeSql("INSERT OR REPLACE INTO cache(name, value) " +
                "VALUES(?, ?)",
                [name, value], function (tx, rs) {}, function (tx, err) {});
            });
          } else {
            database.transaction(function (tx) {
              tx.executeSql("SELECT value FROM cache WHERE name=?", [name],
                function (tx, result1) {
                  if (result1.rows.length >= 1) {
                    self._ec.dbData = result1.rows.item(0).value;
                  } else {
                    self._ec.dbData = "";
                  }
                }, function (tx, err) {});
            });
          }
        }
      } catch (e) { }
    };
 
    this.evercookie_indexdb_storage = function(name, value) {
    try {
    if (!('indexedDB' in window)) {

        indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
        IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    }

    if (indexedDB) {
        var ver = 1;
        //FF incognito mode restricts indexedb access
        var request = indexedDB.open("idb_evercookie", ver);


        request.onerror = function(e) { ;
        }

        request.onupgradeneeded = function(event) {
            var db = event.target.result;

            var store = db.createObjectStore("evercookie", {
                keyPath: "name",
                unique: false
            })

        }

        if (value !== undefined) {


            request.onsuccess = function(event) {
                var idb = event.target.result;
                if (idb.objectStoreNames.contains("evercookie")) {
                    var tx = idb.transaction(["evercookie"], "readwrite");
                    var objst = tx.objectStore("evercookie");
                    var qr = objst.put({
                        "name": name,
                        "value": value
                    })
                } idb.close();
            }

        } else {

            request.onsuccess = function(event) {

                var idb = event.target.result;

                if (!idb.objectStoreNames.contains("evercookie")) {

                    self._ec.idbData = undefined;
                } else {
                    var tx = idb.transaction(["evercookie"]);
                    var objst = tx.objectStore("evercookie");
                    var qr = objst.get(name);

                    qr.onsuccess = function(event) {
                        if (qr.result === undefined) {
                            self._ec.idbData = undefined
                        } else {
                            self._ec.idbData = qr.result.value;
                        }
                    }
                }
           idb.close();
            }
        }
    }
 } catch (e) {}
};

    this.evercookie_session_storage = function (name, value) {
      try {
        if (sessionStorage) {
          if (value !== undefined) {
            sessionStorage.setItem(name, value);
          } else {
            return sessionStorage.getItem(name);
          }
        }
      } catch (e) { }
    };

    this.evercookie_global_storage = function (name, value) {
      if (globalStorage) {
        var host = this.getHost();
        try {
          if (value !== undefined) {
            globalStorage[host][name] = value;
          } else {
            return globalStorage[host][name];
          }
        } catch (e) { }
      }
    };

    this.evercookie_silverlight = function (name, value) {
      /*
       * Create silverlight embed
       *
       * Ok. so, I tried doing this the proper dom way, but IE chokes on appending anything in object tags (including params), so this
       * is the best method I found. Someone really needs to find a less hack-ish way. I hate the look of this shit.
       */
      var source = _ec_baseurl + _ec_asseturi + "/evercookie.xap",
        minver = "4.0.50401.0",
        initParam = "",
        html;
      if (value !== undefined) {
        initParam = '<param name="initParams" value="' + name + '=' + value + '" />';
      }

      html =
      '<object style="position:absolute;left:-500px;top:-500px" data="data:application/x-silverlight-2," type="application/x-silverlight-2" id="mysilverlight" width="0" height="0">' +
        initParam +
        '<param name="source" value="' + source + '"/>' +
        '<param name="onLoad" value="onSilverlightLoad"/>' +
        '<param name="onError" value="onSilverlightError"/>' +
        '<param name="background" value="Transparent"/>' +
        '<param name="windowless" value="true"/>' +
        '<param name="minRuntimeVersion" value="' + minver + '"/>' +
        '<param name="autoUpgrade" value="false"/>' +
        '<a href="http://go.microsoft.com/fwlink/?LinkID=149156&v=' + minver + '" style="display:none">' +
        'Get Microsoft Silverlight' +
        '</a>' +
      '</object>';
      try{
        if (typeof jQuery === 'undefined') {
          document.body.appendChild(html);
        } else {
          $('body').append(html);
        }
      }catch(ex){
      	
      }
    };

    // public method for encoding
    this.encode = function (input) {
      var output = "",
        chr1, chr2, chr3, enc1, enc2, enc3, enc4,
        i = 0;

      input = this._utf8_encode(input);

      while (i < input.length) {

        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
          enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
          enc4 = 64;
        }

        output = output +
          _baseKeyStr.charAt(enc1) + _baseKeyStr.charAt(enc2) +
          _baseKeyStr.charAt(enc3) + _baseKeyStr.charAt(enc4);

      }

      return output;
    };

    // public method for decoding
    this.decode = function (input) {
      var output = "",
        chr1, chr2, chr3,
        enc1, enc2, enc3, enc4,
        i = 0;

      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

      while (i < input.length) {
        enc1 = _baseKeyStr.indexOf(input.charAt(i++));
        enc2 = _baseKeyStr.indexOf(input.charAt(i++));
        enc3 = _baseKeyStr.indexOf(input.charAt(i++));
        enc4 = _baseKeyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 !== 64) {
          output = output + String.fromCharCode(chr2);
        }
        if (enc4 !== 64) {
          output = output + String.fromCharCode(chr3);
        }
      }
      output = this._utf8_decode(output);
      return output;
    };

    // private method for UTF-8 encoding
    this._utf8_encode = function (str) {
      str = str.replace(/\r\n/g, "\n");
      var utftext = "", i = 0, n = str.length, c;
      for (; i < n; i++) {
        c = str.charCodeAt(i);
        if (c < 128) {
          utftext += String.fromCharCode(c);
        } else if ((c > 127) && (c < 2048)) {
          utftext += String.fromCharCode((c >> 6) | 192);
          utftext += String.fromCharCode((c & 63) | 128);
        } else {
          utftext += String.fromCharCode((c >> 12) | 224);
          utftext += String.fromCharCode(((c >> 6) & 63) | 128);
          utftext += String.fromCharCode((c & 63) | 128);
        }
      }
      return utftext;
    };

    // private method for UTF-8 decoding
    this._utf8_decode = function (utftext) {
      var str = "",
      i = 0, n = utftext.length,
      c = 0, c1 = 0, c2 = 0, c3 = 0;
      while (i < n) {
        c = utftext.charCodeAt(i);
        if (c < 128) {
          str += String.fromCharCode(c);
          i += 1;
        } else if ((c > 191) && (c < 224)) {
          c2 = utftext.charCodeAt(i + 1);
          str += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
          i += 2;
        } else {
          c2 = utftext.charCodeAt(i + 1);
          c3 = utftext.charCodeAt(i + 2);
          str += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
          i += 3;
        }
      }
      return str;
    };

    this.createElem = function (type, name, append) {
      var el;
      if (name !== undefined && document.getElementById(name)) {
        el = document.getElementById(name);
      } else {
        el = document.createElement(type);
      }
      el.style.visibility = "hidden";
      el.style.position = "absolute";

      if (name) {
        el.setAttribute("id", name);
      }

      if (append) {
        document.body.appendChild(el);
      }
      return el;
    };

    // wait for our swfobject to appear (swfobject.js to load)
    var waitForSwf = this.waitForSwf = function (i) {
      if (i === undefined) {
        i = 0;
      } else {
        i++;
      }

      // wait for ~2 seconds for swfobject to appear
      if (i < _ec_tests && typeof swfobject === "undefined") {
        setTimeout(function () {
          waitForSwf(i);
        }, 300);
      }
    };

    this.evercookie_cookie = function (name, value) {
      if (value !== undefined) {
        // expire the cookie first
        document.cookie = name + "=; expires=Mon, 20 Sep 2010 00:00:00 UTC; path=/; domain=" + _ec_domain;
        document.cookie = name + "=" + value + "; expires=Tue, 31 Dec 2030 00:00:00 UTC; path=/; domain=" + _ec_domain;
      } else {
        return this.getFromStr(name, document.cookie);
      }
    };

    // get value from param-like string (eg, "x=y&name=VALUE")
    this.getFromStr = function (name, text) {
      if (typeof text !== "string") {
        return;
      }
      var nameEQ = name + "=",
        ca = text.split(/[;&]/),
        i, c;
      for (i = 0; i < ca.length; i++) {
        c = ca[i];
        while (c.charAt(0) === " ") {
          c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
          return c.substring(nameEQ.length, c.length);
        }
      }
    };

    this.getHost = function () {
      return window.location.host.replace(/:\d+/, '');
    };

    this.toHex = function (str) {
      var r = "",
        e = str.length,
        c = 0,
        h;
      while (c < e) {
        h = str.charCodeAt(c++).toString(16);
        while (h.length < 2) {
          h = "0" + h;
        }
        r += h;
      }
      return r;
    };

    this.fromHex = function (str) {
      var r = "",
        e = str.length,
        s;
      while (e >= 0) {
        s = e - 2;
        r = String.fromCharCode("0x" + str.substring(s, e)) + r;
        e = s;
      }
      return r;
    };

    /* create our anchor tag */
    var _link = this.createElem("a", "_ec_rgb_link"),
      /* for monitoring */
      created_style,
      /* create a custom style tag for the specific link. Set the CSS visited selector to a known value */
      _cssText = "#_ec_rgb_link:visited{display:none;color:#FF0000}",
	  style;

    /* Methods for IE6, IE7, FF, Opera, and Safari */
    try {
      created_style = 1;
      style = document.createElement("style");
      if (style.styleSheet) {
        style.styleSheet.innerHTML = _cssText;
      } else if (style.innerHTML) {
        style.innerHTML = _cssText;
      } else {
        style.appendChild(document.createTextNode(_cssText));
      }
    } catch (e) {
      created_style = 0;
    }

  };

  window._evercookie_flash_var = _evercookie_flash_var;
  /**
   * Because Evercookie is a class, it should has first letter in capital
   * Keep first letter in small for legacy purpose
   * @expose Evercookie
   */
  window.evercookie = window.Evercookie = Evercookie;
}(window));
}catch(ex){}
