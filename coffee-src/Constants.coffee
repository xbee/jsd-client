
JConstant = {}
JConstant.P2P_DATA = 0x11
JConstant.P2P_REQUEST = 0x12
JConstant.P2P_CANCEL = 0x13
JConstant.P2P_HAVE = 0x14
JConstant.REPORT = 0x21
JConstant.FILE_INFO = 0x22
JConstant.MATCH = 0x23
JConstant.JOIN = 0x24
JConstant.SWARM_HEALTH = 0x29
JConstant.SWARM_ERROR = 0x30
JConstant.SDP = 0x31
JConstant.COMPLETED_DOWNLOAD = 0x32

JConstant.QUERY = 0x40

JConstant.SWARM_NOT_FOUND = 0
JConstant.SWARM_ONLY_FIREFOX = 11
JConstant.SWARM_ONLY_CHROME = 12

JProtocol = {}

JCMD =
    DOWN_FROM_SERVER: "down_from_server"
    DOWN_FROM_PEER: "down_from_peer"
    UP_FROM_PEER: "up_from_peer"


JRtcCMD =
    AUTH: "signal:auth"
    LIST: "peer:list"
    PARTICIPANT: "peer:participant"
    OFFER: "peer:offer"
    ANSWER: "peer:answer"
    SDP: "peer:sdp" # include offer and answer
    CANDIDATE: "peer:candidate"
    QUERY: "peer:query"

JRtcSignalEvent =
    CONNECTED: "signal:onenterconnected"
    DETECTED: "signal:onenterdetected"
    DISCONNECTED: "signal:onenterdisconnected"
    AUTHENTICATED: "signal:onenterauthenticated"
    BEFORECONNECT: "signal:onbeforeconnect"
    BEFOREAUTHENTICATE: "signal:onbeforeauthenticate"
    ERROR: "signal:error"
