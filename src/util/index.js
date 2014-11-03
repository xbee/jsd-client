(function (exports) {

    exports.debug = true;

    exports.inherits = function(ctor, superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
    };

    exports.extend = function(dest, source) {
        for(var key in source) {
            if(source.hasOwnProperty(key)) {
                dest[key] = source[key];
            }
        }
        return dest;
    };

    exports.pack = jsd.util.BinaryPack.pack;
    exports.unpack = jsd.util.BinaryPack.unpack;

    exports.log = function () {
        if (exports.debug) {
            var copy = [];
            for (var i = 0; i < arguments.length; i++) {
                copy[i] = arguments[i];
            }
            copy.unshift('JSD: ');
            console.log.apply(console, copy);
        }
    };

    exports.setZeroTimeout = (function(global) {
        var timeouts = [];
        var messageName = 'zero-timeout-message';

        // Like setTimeout, but only takes a function argument.	 There's
        // no time argument (always zero) and no arguments (you have to
        // use a closure).
        function setZeroTimeoutPostMessage(fn) {
            timeouts.push(fn);
            global.postMessage(messageName, '*');
        }

        function handleMessage(event) {
            if (event.source == global && event.data == messageName) {
                if (event.stopPropagation) {
                    event.stopPropagation();
                }
                if (timeouts.length) {
                    timeouts.shift()();
                }
            }
        }
        if (global.addEventListener) {
            global.addEventListener('message', handleMessage, true);
        } else if (global.attachEvent) {
            global.attachEvent('onmessage', handleMessage);
        }
        return setZeroTimeoutPostMessage;
    }(this));

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

    exports.h2d = function(s) {

        function add(x, y) {
            var c = 0, r = [];
            var x = x.split('').map(Number);
            var y = y.split('').map(Number);
            while(x.length || y.length) {
                var s = (x.pop() || 0) + (y.pop() || 0) + c;
                r.unshift(s < 10 ? s : s - 10);
                c = s < 10 ? 0 : 1;
            }
            if(c) r.unshift(c);
            return r.join('');
        }

        var dec = '0';
        s.split('').forEach(function(chr) {
            var n = parseInt(chr, 16);
            for(var t = 8; t; t >>= 1) {
                dec = add(dec, dec);
                if(n & t) dec = add(dec, '1');
            }
        });
        return dec;
    };

    exports.d2h = function(d) {return d.toString(16);};
    //exports.h2d = function(h) {return parseInt(h,16);};

    exports.loadResource = function(url, callback) {
        //deferred = Q.defer;
        var oReq = new XMLHttpRequest();
        oReq.open("GET", url, true);
        // oReq.setRequestHeader('Range', 'bytes=100-200');
        oReq.responseType = "blob";

        var blob;
        oReq.onload = function(oEvent) {
            blob = oReq.response;
            // do something with blob
            callback(blob);
        };

        oReq.send();
    };

    exports.blobToArrayBuffer = function(blob, cb){
        var fr = new FileReader();
        fr.onload = function(evt) {
            cb(evt.target.result);
        };
        fr.readAsArrayBuffer(blob);
    };
    exports.blobToBinaryString = function(blob, cb){
        var fr = new FileReader();
        fr.onload = function(evt) {
            cb(evt.target.result);
        };
        fr.readAsBinaryString(blob);
    };
    exports.binaryStringToArrayBuffer = function(binary) {
        var byteArray = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) {
            byteArray[i] = binary.charCodeAt(i) & 0xff;
        }
        return byteArray.buffer;
    };
    exports.convertDataURIToBinary = function(dataURI) {
        var BASE64_MARKER = ';base64,';
        var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
        var base64 = dataURI.substring(base64Index);
        var raw = window.atob(base64);
        var rawLength = raw.length;
        var array = new Uint8Array(new ArrayBuffer(rawLength));

        for(i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
        }
        return array;
    };
    /**
     * Convert an image
     * to a base64 string
     * @param  {String}   url
     * @param  {Function} callback
     * @param  {String}   [outputFormat=image/png]
     */
    exports.convertImgToBase64 = function(url, callback, outputFormat){
        var canvas = document.createElement('CANVAS'),
            ctx = canvas.getContext('2d'),
            img = new Image;
        img.crossOrigin = 'Anonymous';
        img.onload = function(){
            var dataURL;
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);
            dataURL = canvas.toDataURL(outputFormat);
            callback.call(this, dataURL);
            canvas = null;
        };
        img.src = url;
    };

    // chunks a blob.
    exports.chunk = function(bl) {
        var chunks = {};
        var size = bl.size;
        var start = index = 0;
        var total = Math.ceil(size / jsd.config.MAX_CHUNK_SIZE);
        chunks['total'] = total;
        chunks['arr'] = [];
        while (start < size) {
            var end = Math.min(size, start + jsd.config.MAX_CHUNK_SIZE);
            var b = bl.slice(start, end);

            var chunk = {
                //__peerData: dataCount,
                n: index,
                data: b
            };

            chunks['arr'].push(chunk);

            start = end;
            index += 1;
        }
        //dataCount += 1;
        return chunks;
    };

    exports.hex2rgb = this.toRGB;
    exports.rgb2hex = this.toHex;
    exports.hex2bin = this.hex2bin;
    exports.bin2hex = this.bin2hex;
    exports.dec2hex = this.dec2hex;
    exports.sleep = this.sleep;
    exports.bind = this.bind;

})(typeof exports === 'undefined' ? jsd.util : exports);
