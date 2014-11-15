//var util = require('./util.js');
//// an in memory placeholder for the rooms
//var swarms = {};
//var J = {};

(function() {

    J.swarms = {};

    J.Swarm = J.Evented.extend({

        initialize : function(id, metadata) {
            this.id = id;
            this.count = 0;
            this.peers = {};
            this.metadata = metadata;
        },

        getCount : function() {
            return this.count;
        },

        getMetadata : function () {
            return this.metadata;
        },

        getRandomK : function (k) {
            return util.getRandomK(Object.keys(this.peers), k);
        },

        addPeer : function (id) {
            if (id) {
                this.count++;
                this.peers[id] = "placeholder";
            }
        },

        removePeer : function (id) {
            delete this.peers[id];
            this.count--;
        }
    });

    J.getSwarm = function getSwarm(id) {
        return J.swarms [id];
    };

    J.addSwarm = function (id, metadata) {
        return J.swarms[id] = new J.Swarm(id, metadata);
    };

    J.removePeer = function(id) {
        for (var swarmId in J.swarms) {
            var swarm = J.swarms[swarmId];
            swarm.removePeer(id);
        }
    };

})();



