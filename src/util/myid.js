//var CryptoJS = require('CryptoJS');
//var fingerprint = require('fingerprint');

(function (exports) {

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    exports.getUid = function() {
        var my_hasher = function(value, seed) {
            return jsd.util.CryptoJS.SHA1(value).toString(jsd.util.CryptoJS.enc.Hex);
        };

        var ds = new Date();
        var fp = new Fingerprint();
        var bid = fp.get();

        var sid = getRandomInt(100, 100000);
        //var sid = fp.murmurhash3_32_gc(ds.toString(), sd);

        return String(sid)+'.'+String(bid);
    };

})(typeof exports === 'undefined' ? jsd.util : exports);
