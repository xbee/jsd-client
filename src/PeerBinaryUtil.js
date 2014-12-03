
PeerBinaryUtil = function () {
};
PeerBinaryUtil.calculateHash = function (data) {
    var result = 0, idx, ch, len;
    if (data.length == 0) {
        return result;
    }
    ;
    for (idx = 0, len = data.length; idx < len; idx++) {
        ch = data.charCodeAt(idx);
        result = ((result << 5) - result) + ch;
        result |= 0;
    }
    ;
    if (result < 0) {
        result *= -1;
    }
    ;
    return result;
};
PeerBinaryUtil.LONG_BYTE_LENGTH = 8;
PeerBinaryUtil.longToByteArray = function (ln) {
    var ary = [0, 0, 0, 0, 0, 0, 0, 0];
    if (ln < 0) {
        ln *= -1;
    }
    ;
    for (var idx = 0; idx < ary.length; idx++) {
        var v = ln & 0xff;
        ary[idx] = v;
        ln = (ln - v) / 256;
    }
    ;
    return ary;
};
PeerBinaryUtil.byteArrayToLong = function (bary) {
    var result = 0;
    for (var idx = bary.length - 1; idx >= 0; idx--) {
        result = (result * 256) + bary[idx];
    }
    ;
    return result;
};
PeerBinaryUtil.calculateLoopSize = function (total, usize) {
    var rem = total % usize;
    return rem == 0 ? total / usize : ((total - rem) / usize) + 1;
};
PeerBinaryUtil.byteToString = function (bts) {
    if (bts.buffer != undefined) {
        bts = bts.buffer;
    }
    ;
    var _0xb539x24 = 0x8000;
    var _0xb539x16 = 0;
    var _0xb539x25 = bts.byteLength;
    var _0xb539x26 = "";
    var _0xb539x27;
    while (_0xb539x16 < _0xb539x25) {
        _0xb539x27 = bts.slice(_0xb539x16, Math.min(_0xb539x16 + _0xb539x24, _0xb539x25));
        _0xb539x26 += String.fromCharCode.apply(null, new Uint8Array(_0xb539x27));
        _0xb539x16 += _0xb539x24;
    }
    ;
    return _0xb539x26;
};
PeerBinaryUtil.bytesToSize = function (sz, dignum) {
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
PeerBinaryUtil.ByteArray = function (bts) {
    this.buf = new ArrayBuffer(bts);
    this.bufView = new Uint8Array(this.buf);
    this.index = 0;
};
PeerBinaryUtil.ByteArray.prototype.addArray = function (_0xb539x23, _0xb539x2d, _0xb539x2e) {
    var _0xb539x1b = _0xb539x2d == undefined ? 0 : _0xb539x2d;
    var _0xb539x2f = _0xb539x2e == undefined ? _0xb539x23.length : _0xb539x2e;
    for (; _0xb539x1b < _0xb539x2f; _0xb539x1b++, this.index++) {
        this.bufView[this.index] = _0xb539x23[_0xb539x1b];
    }
    ;
};
PeerBinaryUtil.ByteArray.prototype.getArray = function () {
    return this.bufView;
};
PeerBinaryUtil.ByteArray.prototype.getArrayBuffer = function () {
    return this.buf;
};
PeerBinaryUtil.ByteArray.prototype.getLong = function () {
    return PeerBinaryUtil.byteArrayToLong(this.bufView);
};
PeerBinaryUtil.FileByteArray = function (req) {
    this.url = req.getUrl();
    this.buf = new ArrayBuffer(req.getSize());
    this.bufView = new Uint8Array(this.buf);
    this.index = 0;
    this.loopSize = PeerBinaryUtil.calculateLoopSize(req.getSize(), PeerConnection.SLICE);
};
PeerBinaryUtil.FileByteArray.prototype.push = function (_0xb539x16, _0xb539x1f, _0xb539x2d, _0xb539x2e) {
    var _0xb539x1b = _0xb539x16 * PeerConnection.SLICE;
    var _0xb539x31 = (_0xb539x2e - _0xb539x2d) + _0xb539x1b;
    for (var _0xb539x32 = _0xb539x2d; _0xb539x1b < _0xb539x31; _0xb539x1b++, _0xb539x32++) {
        this.bufView[_0xb539x1b] = _0xb539x1f[_0xb539x32];
    }
    ;
    this.index++;
    if (this.loopSize == this.index) {
        return true;
    }
    ;
    return false;
};
PeerBinaryUtil.FileByteArray.prototype.getUrl = function () {
    return this.url;
};
PeerBinaryUtil.FileByteArray.prototype.getArray = function () {
    return this.bufView;
};
