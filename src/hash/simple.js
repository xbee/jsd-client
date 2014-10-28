

function hashCode(str) {
    var ret = 1125899906842597; // prime
    for(var ret = 0, i = 0, len = str.length; i < len; i++) {
        ret = (31 * ret + str.charCodeAt(i)) << 0;
    }
    return ret;
}

String.prototype.hashCode = function() {
    var ret = 1125899906842597; // prime
    for(var ret = 0, i = 0, len = this.length; i < len; i++) {
        ret = (31 * ret + this.charCodeAt(i)) << 0;
    }
    return ret;
};

