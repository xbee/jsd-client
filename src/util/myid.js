//var CryptoJS = require('CryptoJS');
//var fingerprint = require('fingerprint');

(function () {

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    J.Util.getUid = function() {
        var my_hasher = function(value, seed) {
            return jsd.util.CryptoJS.SHA1(value).toString(jsd.util.CryptoJS.enc.Hex);
        };

        var ds = new Date();
        //var fp = new Fingerprint({hasher: my_hasher});
        var fp = new Fingerprint();
        var bid = fp.get();

        var sid = getRandomInt(100, 100000);
        //var sid = fp.murmurhash3_32_gc(ds.toString(), sd);

        return String(sid)+'.'+String(bid);
    };

    J.Util.shortId = function () {
        return 'xxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    J.Util.generate_uuid = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

})();
