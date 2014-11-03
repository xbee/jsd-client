
jsd.config = {
    DEBUG: true,
    LOG_LEVEL:2,
    MAX_PENDING_CHUNKS:200, //max number of chunks pending per peer
    MOZ_MAX_PENDING_CHUNKS:8, //max number of chunks pending per peer for mozilla
    BLOCK_SIZE:5242880,
    CHUNK_SIZE:1024,
    CHUNK_EXPIRATION_TIMEOUT:1500,
    // 16320 = 15 * 1024 + 512 + 256 + 128 + 64
    MAX_CHUNK_SIZE: 16320, // The original 60000 bytes setting does not work when sending data from Firefox to Chrome, which is "cut off" after 16384 bytes and delivered individually.
    REPORT_INTERVAL:10000,
    STAT_CALC_INTERVAL:1000,
    MONITOR_INTERVAL:1000,
    STUN_SERVERS:['stun.l.google.com:19302'],
    TURN_SERVERS:[],
    TURN_CREDENTIALS:[],
    P2P_PREFETCH_THRESHOLD:100,
    PC_FAIL_TIMEOUT:15000,
    PC_RESEND_INTERVAL:1000,
    SOCKET_RECONNECTION_INTERVAL:2000,

    ALLOWED_FILE_SIZE:250*1024*1024, //in bytes 250MB
    USE_FS:false,
    CACHE_SIZE:50000000, //in bytes
    FS_ROOT_DIR:'jsd/',
    FS_SIZE: 4294967296 //in bytes
};

