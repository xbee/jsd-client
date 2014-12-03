PeerRequest = function (url, cb, t) {
    this.url = url;
    this.callback = cb;
    this.hash = PeerBinaryUtil.calculateHash(url);
    this.size = 0;
    this.loadMethod = null;
    this.convertBase64Method = null;
    this.convertResponseTypeMethod = null;
    this.defineUrlType(t);
};
PeerRequest.prototype.defineUrlType = function (t) {
    if (t != undefined && t == PeerManager.BLOB_TYPE) {
        this.loadMethod = PeerImageUtil.loadImage;
        this.convertBase64Method = PeerImageUtil.convertByteToBase64;
        this.convertResponseTypeMethod = PeerImageUtil.convertByteToBlob;
    } else {
        if (t != undefined && t == PeerManager.TEXT_TYPE) {
            this.loadMethod = PeerImageUtil.loadImage;
            this.convertBase64Method = PeerImageUtil.convertByteToBase64;
            this.convertResponseTypeMethod = function (rt) {
                return PeerBinaryUtil.byteToString(rt);
            };
        } else {
            if (t != undefined && t == PeerManager.JSON_TYPE) {
                this.loadMethod = PeerImageUtil.loadImage;
                this.convertBase64Method = PeerImageUtil.convertByteToBase64;
                this.convertResponseTypeMethod = function (rt) {
                    return JSON.parse(PeerBinaryUtil.byteToString(rt));
                };
            } else {
                if (t != undefined && t == PeerManager.ARRAY_BUFFER_TYPE) {
                    this.loadMethod = PeerImageUtil.loadImage;
                    this.convertBase64Method = PeerImageUtil.convertByteToBase64;
                    this.convertResponseTypeMethod = function (rt) {
                        if (rt instanceof ArrayBuffer) {
                            return rt;
                        }
                        ;
                        return rt.buffer;
                    };
                } else {
                    if (t != undefined && t == PeerManager.IMAGE_TYPE) {
                        this.loadMethod = PeerImageUtil.loadImage;
                        this.convertBase64Method = PeerImageUtil.convertByteToBase64;
                        this.convertResponseTypeMethod = PeerImageUtil.convertByteToBase64;
                    } else {
                        var idx = this.url.lastIndexOf(".");
                        if (idx > 0) {
                            var ext = this.url.substr(idx + 1).toLowerCase();
                            if (ext == "jpg" || ext == "png" || ext == "gif" || ext == "jpeg") {
                                this.loadMethod = PeerImageUtil.loadImage;
                                this.convertBase64Method = PeerImageUtil.convertByteToBase64;
                                this.convertResponseTypeMethod = PeerImageUtil.convertByteToBase64;
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
        }
        ;
    }
    ;
};
PeerRequest.prototype.load = function (cb) {
    this.loadMethod(this.url, cb);
};
PeerRequest.prototype.convertBase64 = function (x) {
    return this.convertBase64Method(x);
};
PeerRequest.prototype.isResponseTypeBase64 = function () {
    return this.convertBase64Method == this.convertResponseTypeMethod;
};
PeerRequest.prototype.convertResponseType = function (x) {
    return this.convertResponseTypeMethod(x);
};
PeerRequest.prototype.sendCallback = function (cb) {
    this.callback(cb);
};
PeerRequest.prototype.getUrl = function () {
    return this.url;
};
PeerRequest.prototype.getHash = function () {
    return this.hash;
};
PeerRequest.prototype.setHash = function (x) {
    this.hash = x;
};
PeerRequest.prototype.getSize = function () {
    return this.size;
};
PeerRequest.prototype.setSize = function (sz) {
    this.size = sz;
};
