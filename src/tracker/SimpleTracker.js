//require('../../core/util/logger.js');
//var ITracker = require('./ITracker.js').ITracker;
//var protocol = require('../protocol/ProtocolMessages');
//var swarms = require('./Swarm.js');

J.SimpleTracker = J.ITracker.extend({

    MAX_PEERS_MATCH : 1,
    createSwarm:function (peerId, fileInfo, sender) {
        if (!fileInfo.swarmId) {
            fileInfo.swarmId = jsd.util.shortId();
        }

        J.addSwarm(fileInfo.swarmId, fileInfo);
        this.join(peerId, fileInfo.swarmId, fileInfo.originBrowser, sender)
    },

    join:function (peerId, swarmId, browser, sender) {
        var swarm = J.getSwarm(swarmId);
        if (swarm) {
            sender.send(peerId, swarm.metadata);
            //match only when swarm has peers in it already
            if (swarm.count > 0) {
                var peers = swarm.getRandomK(this.MAX_PEERS_MATCH);
                //create Match message
                //TODO: loop thru peers and send one by one
                if (peers && peers.length > 0) {
                    sender.send(peerId, new protocol.Match(swarm.id, peers));
                }
            }
            swarm.addPeer(peerId);
        } else {
            sender.send(peerId, new protocol.FileInfo());
        }
    },

    leave:function (peerId, sender) {
        J.removePeer(peerId);
    },

    validateToken:function (token, domain) {
        return true;
    },

    report:function(peerId,swarmId,sender){
        var swarm = J.getSwarm(swarmId);
        if (swarm) {
            //match only when swarm has peers in it already
            if (swarm.count > 0) {
                var peers = swarm.getRandomK(this.MAX_PEERS_MATCH);
                for(var i=peers.length;i>=0;--i) {
                    if(peers[i]==peerId)
                        peers.splice(i,1);
                }
                //create Match message
                if (peers && peers.length > 0 && peers[0]!=peerId) {
                    sender.send(peerId, new protocol.Match(swarm.id, peers, null, null, null));
                }
            }
            swarm.addPeer(peerId);
        }
    }

});

(function() {

    var tracker = new J.SimpleTracker();
    J.tracker = tracker;

})();

