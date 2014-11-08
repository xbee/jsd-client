
var _ = require('underscore');
var postal = require('postal');
var Aop = require('./aop');

function Peer(eip, ips, uuid, socket, host, token) {
    this.eip = eip;
    this.ips = ips;
    this.socket = socket;
    this.location = host;
    this.token = token;
    this.uuid = uuid;
}

// constructor for PeerManager
function PeerManager() {
    this._peers = [];
}

var proto = PeerManager.prototype;

PeerManager.prototype.publish = function(topic, args) {

};

PeerManager.prototype.list = function () {
    //no need to transfer the socket object
    return _.map(this._peers, function (peer) {
        return {id: peer.uuid};
    });
};

// A.eip === B.eip means same LAN
//
PeerManager.prototype.filter = function(other) {
  //no need to transfer the socket object
  var results = _.map(this._peers, function(peer) {
    if ((peer.eip === other.eip) &&
        (peer.uuid !== other.uuid) &&
        (peer.host === other.host)) {
      return {id: peer.uuid};
    }
  });
  // need exclude null value
  return _.reject(results, function(v) { return !v; });
};

PeerManager.prototype.add = function(peer) {
    // missing values?
    if (!peer.socket || !peer.uuid || !peer.token) return false;

    // already existent?
    if (this.getPeerByUuid(peer.uuid)) return false;

    this._peers.push(peer);

    // TODO sort array?

    return true;
};

PeerManager.prototype.remove = function (peer) {
    if (!peer) return false;
    this._peers = _.without(this._peers, peer);
    return true;
};

PeerManager.prototype.getPeerByUuid = function(uuid) {
    return _.findWhere(this._peers, {uuid: uuid});
};

PeerManager.prototype.getPeerBySocket = function(socket) {
    return _.findWhere(this._peers, {socket: socket});
};

function onChanged() {
    console.log('something changed: ', arguments[0]);
    // filter and send the results to peer
};

Aop.after("add", onChanged, [PeerManager.prototype]);
Aop.after("remove", onChanged, [PeerManager.prototype]);

module.exports = exports = new PeerManager(); // Singleton

