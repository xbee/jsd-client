TIMEOUT_RETRY_TIME = 60000
MAX_RANDOM_ASSESSMENT_DELAY_TIME = 150

settings = jsd.util.settings

class JRtcPeerSessionManager extends JBase

    constructor: (@sandbox,node) ->
      super(@sandbox)
      unless node
        @_signaler = new JRtcSignalSession()
      else
        @_signaler = node

      # index is peer's id : peerId
      @_peers = {}
      return

    add: (peer) ->
      @_peers[peer.peerId] = peer  unless @getPeerByUuid(peer.peerId)
      return


    ###*
    @method connect
    @param {Array} [peers]
    @return {Promise}
    ###
    connect: (peers) ->
      peers = @_peers  if typeof peers is "undefined"
      promises = []
#      if not peer or peer.peerId is settings.uuid for peer in peers
      _.each peers, (peer) ->

        # Never connect to null or self
        return  if not peer or peer.peerId is settings.uuid

        # No need to connect if already connected
        promises.push peer.createConnection()  unless peer.isConnected
        return

      Q.all promises


    ###*
    @method connectToNeighbourPeers
    @return {Promise}
    ###
    connectToNeighbourPeers: ->
      @connect @getNeighbourPeers()


    ###*
    @method getPeerByUuid
    @param {String} uuid
    @returns {Peer}
    ###
    getPeerByUuid: (uuid) ->
      _.find @_peers, (peer) ->
        peer.peerId is uuid



    ###*
    @method getNeighbourPeers
    @return {Array}
    ###
    getNeighbourPeers: ->

      # Assuming they are already sorted in a specific way
      # e.g. geolocation-distance
      # Remove all peers that had a timeout shortly
      peers = @_peers.filter((peer) ->

        # Timeout at all? && Timeout was long ago
        not peer.timeout or peer.timeout + TIMEOUT_RETRY_TIME < Date.now()
      )
      peers.slice 0, settings.maxPeers or 2


    ###*
    Get all known Peers Uuids as an array

    @method getPeerUuidsAsArray
    @return {Array}
    ###
    getPeerUuidsAsArray: ->
      _.map @_peers, (peer) ->
        peer.peerId



    ###*
    Broadcast data to peers using a RAD--time.
    Will exclude originPeerUuid from receivers if passed.

    @method broadcast
    @param type
    @param data
    @param {String} [originPeerUuid]
    @param {Boolean} reliable
    ###
    broadcast: (type, data, originPeerUuid, reliable) ->
      reliable = false  if typeof reliable is "undefined"
      peers = @getConnectedPeers()

      # Remove own uuid from list and
      # the peer we received the message from
      peers = _.reject(peers, (peer) ->
        peer.peerId is settings.uuid or peer.peerId is originPeerUuid
      )

      # Nobody to broadcast to
      return  if peers.length is 0
      unless originPeerUuid

        #logger.log('Peers', 'Broadcasting', type, 'to', peers.length, 'peer(s)');
        data.timestamp = Date.now()
      else


      #logger.log('Peers', 'Rebroadcasting', type, 'to', peers.length, 'peer(s)');

      # Broadcast to all connected peers
      peers.forEach (peer) ->

        # Get a RAD before broadcasting
        rad = Math.random() * MAX_RANDOM_ASSESSMENT_DELAY_TIME
        _.delay peer.broadcast, rad, type, data, reliable
        return

      return


    ###*
    @method update
    @param {Object} peerData
    ###
    update: (peerData) ->

      # Multidimensional array form multiple nodes needs to be flattened
      peerData = _.flatten(peerData)
      peerData.forEach (data) ->

        #make sure it's not self
        return  if data.peerId is settings.uuid

        #already got this one?
        peer = @getPeerByUuid(data.peerId)

        #already got this peer?

        #only add the node uuid
        #peer.addNodes(data.nodes);
        return  if peer

        # Local id for debugging
        data.id = @_peers.length + 1

        # Save as new peer
        peer = new PeerSession(@server, data)
        @add peer

        # Pass-through events
        peer.onAny (e) ->
          @emit @event, e
          return

        return

      return


    # Calculate geolocation distance
    #            peer.distance = geolocation.getDistanceBetweenTwoLocations(peer.location);

    # Sort peers by their geolocation-distance
    #        this._peers = _.sortBy(this._peers, function (peer) {
    #            return peer.distance;
    #        });
    # Update public list
    #        this.list = _peers;

    ###*
    Get a list of all peers to which there is an active connection.

    @method getConnectedPeers

    @return {Array}
    ###
    getConnectedPeers: ->
      _.where @_peers,
        isConnected: true

