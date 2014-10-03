
var _ = require('underscore');

// constructor for PeerManager
function PeerManager() {
    this._peers = [];
}

var proto = PeerManager.prototype;

proto.list = function () {
    //no need to transfer the socket object
    return _.map(this._peers, function (peer) {
        return {id: peer.uuid};
    });
};

proto.add = function(peer) {
    //missing values?
    if (!peer.socket || !peer.uuid ) return false;

    //already existent?
    if (this.getPeerByUuid(peer.uuid)) return false;

    this._peers.push(peer);

    //TODO sort array?

    return true;
};

proto.remove = function (peer) {
    if (!peer) return false;
    this._peers = _.without(this._peers, peer);
    return true;
};

proto.getPeerByUuid = function(uuid) {
    return _.findWhere(this._peers, {uuid: uuid});
};

proto.getPeerBySocket = function(socket) {
    return _.findWhere(this._peers, {socket: socket});
};

module.exports = exports = new PeerManager(); // Singleton

