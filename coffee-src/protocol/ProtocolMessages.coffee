
#= require <Constants.coffee>

#    attributes (ordered)
#    swarmId - 4bytes - only the intial 4 bytes will be encoded. We have a slight chance for collision, but even if there is, the pollution detection will prevent serious problems.
#        chunkId - 4bytes (UInt32) means that we have a limitation of 2^32 chunks per swarm -> ~4TB for each file.
#        payload data - chunk
#    length: chunk size + swarmId length under 1200 bytes constraint
#    constraints:
#        peer will send only hash varified chunks
Data = (@swarmId, @chunkId, @payload) ->
    @tag = JConstant.P2P_DATA
    return

#    swarmId (4bytes)
#    chunkIds - optional - array of ids each 4bytes
#    Example of 2 chunks encoding: 0x010203040A0B0C0D. 0x01-0x04 are the first encoded chunk, 0x0A-0x0D are the second encoded chunk)
Request = (@swarmId, @chunkIds = []) ->
    @tag = JConstant.P2P_REQUEST
    return

#Cancel (0x13)
#attributes (ordered)
#swarmId (4 bytes)
#chunkIds/all (optional) if empty (not included) then all chunks are to be canceled. If included, chunks are encoded in 4bytes-per-chunk - for example  0x010203040A0B0C0D
Cancel = (@swarmId, @chunkIds = []) ->
    @tag = JConstant.P2P_CANCEL
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
    @tag = JConstant.P2P_HAVE
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
    @tag = JConstant.REPORT
    return

Join = (@swarmId) ->
    @tag = JConstant.JOIN
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
    @tag = JConstant.FILE_INFO
    return

SwarmError = (swarmId, @error) ->
    @tag = JConstant.SWARM_ERROR
    return

Match = (@swarmId, @peerId, @availabilityMap) ->
    @tag = JConstant.MATCH #protocol tag
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
    @tag = JConstant.SDP
    #    @originId = originId
    #    @destId = destId
    #    @sdpMessage = sdpMessage
    #deprecated: just to support Firefox 21-
    #    @port = port
    #    @type = type
    return

SwarmHealth = (swarmId, numOfSeedersInSwarm, NumOfPeersInSwarm, totalCompletedDownloads) ->
    @tag = JConstant.SWARM_HEALTH
    @swarmId = swarmId
    @numOfSeedersInSwarm = numOfSeedersInSwarm
    @NumOfPeersInSwarm = NumOfPeersInSwarm
    @totalCompletedDownloads = totalCompletedDownloads
    return

Query = (@swarmId, @resUrl, @metaData) ->
    @tag = JConstant.QUERY
    return



# public class

JProtocol.Have = Have
JProtocol.Cancel = Cancel
JProtocol.Request = Request
JProtocol.Data = Data
JProtocol.Report = Report
JProtocol.Connection = Connection
JProtocol.FileInfo = FileInfo
JProtocol.Match = Match
JProtocol.Join = Join
JProtocol.Sdp = Sdp
JProtocol.SwarmHealth = SwarmHealth
JProtocol.SwarmError = SwarmError
