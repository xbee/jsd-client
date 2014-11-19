((exports) ->

  #    attributes (ordered)
  #    swarmId - 4bytes - only the intial 4 bytes will be encoded. We have a slight chance for collision, but even if there is, the pollution detection will prevent serious problems.
  #        chunkId - 4bytes (UInt32) means that we have a limitation of 2^32 chunks per swarm -> ~4TB for each file.
  #        payload data - chunk
  #    length: chunk size + swarmId length under 1200 bytes constraint
  #    constraints:
  #        peer will send only hash varified chunks
  Data = (@swarmId, @chunkId, @payload) ->
    @tag = exports.P2P_DATA
    return

  #    swarmId (4bytes)
  #    chunkIds - optional - array of ids each 4bytes
  #    Example of 2 chunks encoding: 0x010203040A0B0C0D. 0x01-0x04 are the first encoded chunk, 0x0A-0x0D are the second encoded chunk)
  Request = (@swarmId, @chunkIds=[]) ->
    @tag = exports.P2P_REQUEST
    return

  #Cancel (0x13)
  #attributes (ordered)
  #swarmId (4 bytes)
  #chunkIds/all (optional) if empty (not included) then all chunks are to be canceled. If included, chunks are encoded in 4bytes-per-chunk - for example  0x010203040A0B0C0D
  Cancel = (@swarmId, @chunkIds=[]) ->
    @tag = exports.P2P_CANCEL
    @all = (chunkIds.length is 0)
    return

  ###*
  @param swarmId
  @param seeder true if seeder
  @param complete true if availabilityMap, false if update
  @param blockIds in list of chunks, or availabilityMap
  @constructor
  ###
  Have = (@swarmId, @seeder, availabilityMap, blockIds) ->
    @tag = exports.P2P_HAVE
    @blockIds = []
    unless seeder
      if availabilityMap
        @complete = true
        @availabilityMap = availabilityMap
      else
        @complete = false
        @blockIds = blockIds
    return

  #    swarmId full (20bytes)
  #    last requested blockId (not random) (uint)
  #    transport statistics (for P2P total, HTTP)
  #    total bytes dl/up
  #    dl/up speed (max,min,avg)
  #    rejected connections (NAT problems, etc.)
  #    num of connections (byte)
  #    connections (special parsing)
  #    info gathered on those connections?
  ##bytes recv, sent, dl/up speed (max,min,avg)
  #    chunk drop % (expiration)
  ##blocks failed hash verification
  #    latency MS (best so far)
  #    browser - user agent
  #    vendor (byte)
  #    major (byte)
  #        ?minor (byte)
  #        availability block map (variable length)
  Report = (@swarmId,
            @lastRequestedBlockId,
            @totalBytesUpP2P,
            @totalBytesDownP2P,
            @totalBytesDownHTTP,
            @totalWasteP2P,
            @totalWasteHTTP,
            @speedUp,
            @speedDown,
            @connections,
            @ua,
            @availabilityMap,
            @numOfBlocksHave,
            @fileSize,
            @completedDownload) ->
    @tag = exports.REPORT
    return

  Join = (@swarmId) ->
    @tag = exports.JOIN
    return

  ###*
  Represents metadata needed to manage the swarm
  @param swarmId uniqueId or null if needs to create new
  @param size the size of the swarm in bytes
  @param hashes list of digests for each block
  @param blockSize size of a single block in bytes
  @param origin optional identification of the swarm creator (i.e. customerId, name of uploader, company)
  @constructor
  ###
  FileInfo = (@swarmId,
              @size,
              @hashes,
              @blockSize,
              @origin,
              @name,
              @lastModified,
              @type) ->
    @tag = exports.FILE_INFO
    return

  SwarmError = (swarmId, @error) ->
    @tag = exports.SWARM_ERROR
    return

  Match = (@swarmId, @peerId, @availabilityMap) ->
    @tag = exports.MATCH #protocol tag
    #@swarmId = swarmId #the swarm that consists the two peers
    #@peerId = peerId #the matched peerid
    #@availabilityMap = availabilityMap #bitarray consisting available blocks
    return

  Connection = (@totalBytesDown,
                @totalBytesUp,
                @speedDown,
                @speedUp,
                @chunksExpired,
                @chunksRequested,
                @latency,
                @connected,
                @connectingDuration,
                @failure) ->
#    @totalBytesDown = totalBytesDown #        total bytes dl
#    @totalBytesUp = totalBytesUp #        total bytes up
#    @speedDown = speedDown #        dl speed kbs max, min, avg
#    @speedUp = speedUp #        up speed kbs max, min, avg
#    @chunksRequested = chunksRequested
#    @chunksExpired = chunksExpired # number of chunks expired (loss)
#    @latency = latency # best latency
#    @connected = connected #is the connection connected/not connected
#    @connectingDuration = connectingDuration
#    @failure = failure #was there a problem
    return

  Sdp = (@originId, @destId, @sdpMessage, @port, @type) ->
    @tag = exports.SDP
#    @originId = originId
#    @destId = destId
#    @sdpMessage = sdpMessage
    #deprecated: just to support Firefox 21-
#    @port = port
#    @type = type
    return

  SwarmHealth = (swarmId, numOfSeedersInSwarm, NumOfPeersInSwarm, totalCompletedDownloads) ->
    @tag = exports.SWARM_HEALTH
    @swarmId = swarmId
    @numOfSeedersInSwarm = numOfSeedersInSwarm
    @NumOfPeersInSwarm = NumOfPeersInSwarm
    @totalCompletedDownloads = totalCompletedDownloads
    return

  Query = (@swarmId, @resUrl, @metaData) ->
    @tag = exports.QUERY
    return

  exports.P2P_DATA = 0x11
  exports.P2P_REQUEST = 0x12
  exports.P2P_CANCEL = 0x13
  exports.P2P_HAVE = 0x14
  exports.REPORT = 0x21
  exports.FILE_INFO = 0x22
  exports.MATCH = 0x23
  exports.JOIN = 0x24
  exports.SWARM_HEALTH = 0x29
  exports.SWARM_ERROR = 0x30
  exports.SDP = 0x31
  exports.COMPLETED_DOWNLOAD = 0x32

  exports.QUERY = 0x40

  exports.SWARM_NOT_FOUND = 0
  exports.SWARM_ONLY_FIREFOX = 11
  exports.SWARM_ONLY_CHROME = 12

  exports.Have = Have
  exports.Cancel = Cancel
  exports.Request = Request
  exports.Data = Data
  exports.Report = Report
  exports.Connection = Connection
  exports.FileInfo = FileInfo
  exports.Match = Match
  exports.Join = Join
  exports.Sdp = Sdp
  exports.SwarmHealth = SwarmHealth
  exports.SwarmError = SwarmError
  return

) (if typeof exports is "undefined" then J.Protocol else exports)
