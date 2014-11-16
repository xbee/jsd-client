var TIMEOUT_RETRY_TIME = 60000;
var MAX_RANDOM_ASSESSMENT_DELAY_TIME = 150;

(function () {
    var settings = jsd.util.settings;

    J.Rtc.PeerSessionManager = J.Evented.extend({

        initialize: function(node) {
            if (!node) {
                this._signaler = new SignalSession();
            } else {
                this._signaler = node;
            }
            // index is peer's id : peerId
            this._peers = {};
        },

        add: function (peer) {
            if (!this.getPeerByUuid(peer.peerId)) {
                this._peers[peer.peerId] = peer;
            }
        },

        /**
         * @method connect
         * @param {Array} [peers]
         * @return {Promise}
         */
        connect: function (peers) {
            if (typeof peers === "undefined") {
                peers = this._peers;
            }
            var promises = [];

            _.each(peers, function (peer) {
                // Never connect to null or self
                if (!peer || peer.peerId === settings.uuid)
                    return;

                // No need to connect if already connected
                if (!peer.isConnected) {
                    promises.push(peer.createConnection());
                }
            });

            return Q.all(promises);
        },

        /**
         * @method connectToNeighbourPeers
         * @return {Promise}
         */
        connectToNeighbourPeers: function () {
            return this.connect(this.getNeighbourPeers());
        },

        /**
         * @method getPeerByUuid
         * @param {String} uuid
         * @returns {Peer}
         */
        getPeerByUuid: function (uuid) {
            return _.find(this._peers, function (peer) {
                return peer.peerId === uuid;
            });
        },

        /**
         * @method getNeighbourPeers
         * @return {Array}
         */
        getNeighbourPeers: function () {
            // Assuming they are already sorted in a specific way
            // e.g. geolocation-distance
            // Remove all peers that had a timeout shortly
            var peers = this._peers.filter(function (peer) {
                // Timeout at all? && Timeout was long ago
                return !peer.timeout || peer.timeout + TIMEOUT_RETRY_TIME < Date.now();
            });

            return peers.slice(0, settings.maxPeers || 2);
        },

        /**
         * Get all known Peers Uuids as an array
         *
         * @method getPeerUuidsAsArray
         * @return {Array}
         */
        getPeerUuidsAsArray: function () {
            return _.map(this._peers, function (peer) {
                return peer.peerId;
            });
        },

        /**
         * Broadcast data to peers using a RAD--time.
         * Will exclude originPeerUuid from receivers if passed.
         *
         * @method broadcast
         * @param type
         * @param data
         * @param {String} [originPeerUuid]
         * @param {Boolean} reliable
         */
        broadcast: function (type, data, originPeerUuid, reliable) {
            if (typeof reliable === "undefined") {
                reliable = false;
            }
            var peers = this.getConnectedPeers();

            // Remove own uuid from list and
            // the peer we received the message from
            peers = _.reject(peers, function (peer) {
                return peer.peerId === settings.uuid || peer.peerId === originPeerUuid;
            });

            // Nobody to broadcast to
            if (peers.length === 0) {
                return;
            }

            if (!originPeerUuid) {
                //logger.log('Peers', 'Broadcasting', type, 'to', peers.length, 'peer(s)');
                data.timestamp = Date.now();
            } else {
                //logger.log('Peers', 'Rebroadcasting', type, 'to', peers.length, 'peer(s)');
            }

            // Broadcast to all connected peers
            peers.forEach(function (peer) {
                // Get a RAD before broadcasting
                var rad = Math.random() * MAX_RANDOM_ASSESSMENT_DELAY_TIME;
                _.delay(peer.broadcast, rad, type, data, reliable);
            });
        },

        /**
         * @method update
         * @param {Object} peerData
         */
        update: function (peerData) {
            // Multidimensional array form multiple nodes needs to be flattened
            peerData = _.flatten(peerData);

            peerData.forEach(function (data) {
                //make sure it's not self
                if (data.peerId === settings.uuid)
                    return;

                //already got this one?
                var peer = this.getPeerByUuid(data.peerId);

                //already got this peer?
                if (peer) {
                    //only add the node uuid
                    //peer.addNodes(data.nodes);
                    return;
                }

                // Local id for debugging
                data.id = this._peers.length + 1;

                // Save as new peer
                peer = new PeerSession(this.server, data);
                this.add(peer);

                // Pass-through events
                peer.onAny(function (e) {
                    this.emit(this.event, e);
                });
                // Calculate geolocation distance
                //            peer.distance = geolocation.getDistanceBetweenTwoLocations(peer.location);
            });
            // Sort peers by their geolocation-distance
            //        this._peers = _.sortBy(this._peers, function (peer) {
            //            return peer.distance;
            //        });
            // Update public list
            //        this.list = _peers;
        },

        /**
         * Get a list of all peers to which there is an active connection.
         *
         * @method getConnectedPeers
         *
         * @return {Array}
         */
        getConnectedPeers: function () {
            return _.where(this._peers, { isConnected: true });
        }
    });

})();
