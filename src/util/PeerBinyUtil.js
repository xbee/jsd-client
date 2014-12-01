
PeerBinaryUtil = function () {
};
PeerBinaryUtil["calculateHash"] = function (_0xb539x1a) {
    var _0xb539x19 = 0, _0xb539x1b, _0xb539x1c, _0xb539x1d;
    if (_0xb539x1a["length"] == 0) {
        return _0xb539x19;
    }
    ;
    for (_0xb539x1b = 0, _0xb539x1d = _0xb539x1a["length"]; _0xb539x1b < _0xb539x1d; _0xb539x1b++) {
        _0xb539x1c = _0xb539x1a["charCodeAt"](_0xb539x1b);
        _0xb539x19 = ((_0xb539x19 << 5) - _0xb539x19) + _0xb539x1c;
        _0xb539x19 |= 0;
    }
    ;
    if (_0xb539x19 < 0) {
        _0xb539x19 *= -1;
    }
    ;
    return _0xb539x19;
};
PeerBinaryUtil["LONG_BYTE_LENGTH"] = 8;
PeerBinaryUtil["longToByteArray"] = function (ln) {
    var ary = [0, 0, 0, 0, 0, 0, 0, 0];
    if (ln < 0) {
        ln *= -1;
    }
    ;
    for (var idx = 0; idx < ary["length"]; idx++) {
        var v = ln & 0xff;
        ary[idx] = v;
        ln = (ln - v) / 256;
    }
    ;
    return ary;
};
PeerBinaryUtil["byteArrayToLong"] = function (_0xb539x1f) {
    var _0xb539x18 = 0;
    for (var _0xb539x1b = _0xb539x1f["length"] - 1; _0xb539x1b >= 0; _0xb539x1b--) {
        _0xb539x18 = (_0xb539x18 * 256) + _0xb539x1f[_0xb539x1b];
    }
    ;
    return _0xb539x18;
};
PeerBinaryUtil["calculateLoopSize"] = function (_0xb539x1, _0xb539x21) {
    var _0xb539x22 = _0xb539x1 % _0xb539x21;
    return _0xb539x22 == 0 ? _0xb539x1 / _0xb539x21 : ((_0xb539x1 - _0xb539x22) / _0xb539x21) + 1;
};
PeerBinaryUtil["byteToString"] = function (bts) {
    if (bts["buffer"] != undefined) {
        bts = bts["buffer"];
    }
    ;
    var _0xb539x24 = 0x8000;
    var _0xb539x16 = 0;
    var _0xb539x25 = bts["byteLength"];
    var _0xb539x26 = "";
    var _0xb539x27;
    while (_0xb539x16 < _0xb539x25) {
        _0xb539x27 = bts["slice"](_0xb539x16, Math["min"](_0xb539x16 + _0xb539x24, _0xb539x25));
        _0xb539x26 += String["fromCharCode"]["apply"](null, new Uint8Array(_0xb539x27));
        _0xb539x16 += _0xb539x24;
    }
    ;
    return _0xb539x26;
};
PeerBinaryUtil["bytesToSize"] = function (sz, dignum) {
    var kb = 1024;
    var mb = kb * 1024;
    var gb = mb * 1024;
    var tb = gb * 1024;
    if ((sz >= 0) && (sz < kb)) {
        return sz + " B";
    } else {
        if ((sz >= kb) && (sz < mb)) {
            return (sz / kb)["toFixed"](dignum) + " KB";
        } else {
            if ((sz >= mb) && (sz < gb)) {
                return (sz / mb)["toFixed"](dignum) + " MB";
            } else {
                if ((sz >= gb) && (sz < tb)) {
                    return (sz / gb)["toFixed"](dignum) + " GB";
                } else {
                    if (sz >= tb) {
                        return (sz / tb)["toFixed"](dignum) + " TB";
                    } else {
                        return sz + " B";
                    }
                    ;
                }
                ;
            }
            ;
        }
        ;
    }
    ;
};
PeerBinaryUtil["ByteArray"] = function (bts) {
    this["buf"] = new ArrayBuffer(bts);
    this["bufView"] = new Uint8Array(this["buf"]);
    this["index"] = 0;
};
PeerBinaryUtil["ByteArray"]["prototype"]["addArray"] = function (_0xb539x23, _0xb539x2d, _0xb539x2e) {
    var _0xb539x1b = _0xb539x2d == undefined ? 0 : _0xb539x2d;
    var _0xb539x2f = _0xb539x2e == undefined ? _0xb539x23["length"] : _0xb539x2e;
    for (; _0xb539x1b < _0xb539x2f; _0xb539x1b++, this["index"]++) {
        this["bufView"][this["index"]] = _0xb539x23[_0xb539x1b];
    }
    ;
};
PeerBinaryUtil["ByteArray"]["prototype"]["getArray"] = function () {
    return this["bufView"];
};
PeerBinaryUtil["ByteArray"]["prototype"]["getArrayBuffer"] = function () {
    return this["buf"];
};
PeerBinaryUtil["ByteArray"]["prototype"]["getLong"] = function () {
    return PeerBinaryUtil["byteArrayToLong"](this["bufView"]);
};
PeerBinaryUtil["FileByteArray"] = function (_0xb539x30) {
    this["url"] = _0xb539x30["getUrl"]();
    this["buf"] = new ArrayBuffer(_0xb539x30["getSize"]());
    this["bufView"] = new Uint8Array(this["buf"]);
    this["index"] = 0;
    this["loopSize"] = PeerBinaryUtil["calculateLoopSize"](_0xb539x30["getSize"](), PeerConnection.SLICE);
};
PeerBinaryUtil["FileByteArray"]["prototype"]["push"] = function (_0xb539x16, _0xb539x1f, _0xb539x2d, _0xb539x2e) {
    var _0xb539x1b = _0xb539x16 * PeerConnection["SLICE"];
    var _0xb539x31 = (_0xb539x2e - _0xb539x2d) + _0xb539x1b;
    for (var _0xb539x32 = _0xb539x2d; _0xb539x1b < _0xb539x31; _0xb539x1b++, _0xb539x32++) {
        this["bufView"][_0xb539x1b] = _0xb539x1f[_0xb539x32];
    }
    ;
    this["index"]++;
    if (this["loopSize"] == this["index"]) {
        return true;
    }
    ;
    return false;
};
PeerBinaryUtil["FileByteArray"]["prototype"]["getUrl"] = function () {
    return this["url"];
};
PeerBinaryUtil["FileByteArray"]["prototype"]["getArray"] = function () {
    return this["bufView"];
};
