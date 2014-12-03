
PeerImageUtil = function () {
};
PeerImageUtil._keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
PeerImageUtil.loadImage = function (url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function (v) {
        cb(xhr.response);
    };
    xhr.onerror = function (err) {
        PeerStatistic.log(err);
    };
    xhr.send(null);
};
PeerImageUtil.convertByteToBlob = function (bt) {
    return new Blob([bt]);
};
PeerImageUtil.convertByteToBase64 = function (bts) {
    var _0xb539x34 = "";
    var _0xb539x68 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var uary = new Uint8Array(bts);
    var len = uary.byteLength;
    var _0xb539x6a = len % 3;
    var _0xb539x6b = len - _0xb539x6a;
    var _0xb539xe, _0xb539xf, _0xb539x10, _0xb539x6c;
    var _0xb539x6d;
    for (var _0xb539x1b = 0; _0xb539x1b < _0xb539x6b; _0xb539x1b = _0xb539x1b + 3) {
        _0xb539x6d = (uary[_0xb539x1b] << 16) | (uary[_0xb539x1b + 1] << 8) | uary[_0xb539x1b + 2];
        _0xb539xe = (_0xb539x6d & 16515072) >> 18;
        _0xb539xf = (_0xb539x6d & 258048) >> 12;
        _0xb539x10 = (_0xb539x6d & 4032) >> 6;
        _0xb539x6c = _0xb539x6d & 63;
        _0xb539x34 += _0xb539x68[_0xb539xe] + _0xb539x68[_0xb539xf] + _0xb539x68[_0xb539x10] + _0xb539x68[_0xb539x6c];
    }
    ;
    if (_0xb539x6a == 1) {
        _0xb539x6d = uary[_0xb539x6b];
        _0xb539xe = (_0xb539x6d & 252) >> 2;
        _0xb539xf = (_0xb539x6d & 3) << 4;
        _0xb539x34 += _0xb539x68[_0xb539xe] + _0xb539x68[_0xb539xf] + "==";
    } else {
        if (_0xb539x6a == 2) {
            _0xb539x6d = (uary[_0xb539x6b] << 8) | uary[_0xb539x6b + 1];
            _0xb539xe = (_0xb539x6d & 16128) >> 8;
            _0xb539xf = (_0xb539x6d & 1008) >> 4;
            _0xb539x10 = (_0xb539x6d & 15) << 2;
            _0xb539x34 += _0xb539x68[_0xb539xe] + _0xb539x68[_0xb539xf] + _0xb539x68[_0xb539x10] + "=";
        }
        ;
    }
    ;
    return "data:image/jpeg;base64," + _0xb539x34;
};
PeerImageUtil.convertBase64ToByte = function (data) {
    var hdr = "base64,";
    var idx = data.indexOf(hdr);
    if (idx != -1) {
        data = data.substr(idx + hdr.length);
    }
    ;
    var _0xb539x20 = (data.length / 4) * 3;
    var _0xb539x70 = new ArrayBuffer(_0xb539x20);
    var _0xb539x71 = this._keyStr.indexOf(data.charAt(data.length - 1));
    var _0xb539x72 = this._keyStr.indexOf(data.charAt(data.length - 2));
    var _0xb539x20 = (data.length / 4) * 3;
    if (_0xb539x71 == 64) {
        _0xb539x20--;
    }
    ;
    if (_0xb539x72 == 64) {
        _0xb539x20--;
    }
    ;
    var _0xb539x73;
    var _0xb539x74, _0xb539x75, _0xb539x76;
    var _0xb539x77, _0xb539x78, _0xb539x79, _0xb539x7a;
    var _0xb539x1b = 0;
    var _0xb539x32 = 0;
    if (_0xb539x70) {
        _0xb539x73 = new Uint8Array(_0xb539x70);
    } else {
        _0xb539x73 = new Uint8Array(_0xb539x20);
    }
    ;
    data = data.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    for (_0xb539x1b = 0; _0xb539x1b < _0xb539x20; _0xb539x1b += 3) {
        _0xb539x77 = this._keyStr.indexOf(data.charAt(_0xb539x32++));
        _0xb539x78 = this._keyStr.indexOf(data.charAt(_0xb539x32++));
        _0xb539x79 = this._keyStr.indexOf(data.charAt(_0xb539x32++));
        _0xb539x7a = this._keyStr.indexOf(data.charAt(_0xb539x32++));
        _0xb539x74 = (_0xb539x77 << 2) | (_0xb539x78 >> 4);
        _0xb539x75 = ((_0xb539x78 & 15) << 4) | (_0xb539x79 >> 2);
        _0xb539x76 = ((_0xb539x79 & 3) << 6) | _0xb539x7a;
        _0xb539x73[_0xb539x1b] = _0xb539x74;
        if (_0xb539x79 != 64) {
            _0xb539x73[_0xb539x1b + 1] = _0xb539x75;
        }
        ;
        if (_0xb539x7a != 64) {
            _0xb539x73[_0xb539x1b + 2] = _0xb539x76;
        }
        ;
    }
    ;
    return _0xb539x73;
};
