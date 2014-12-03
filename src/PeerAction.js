PeerAction = {};
PeerAction.SESSION_ID = "session_id";
PeerAction.FILE_NOT_FOUND = "file_not_found";
PeerAction.FILE_FOUND = "file_found";
PeerAction.OFFER_IMAGE_REQUEST = "offer_image_request";
PeerAction.OFFER_CANDIDATE = "offer_candidate";
PeerAction.OFFER_SDP = "offer_sdp";
PeerAction.ANSWER_CANDIDATE = "answer_candidate";
PeerAction.ANSWER_SDP = "answer_sdp";
PeerAction.HAS_IMAGE = "has_image";
PeerAction.REQUEST_IMAGE = "request_image";
PeerAction.APPLICATION = "appName";
PeerAction.REQUEST_CON_COUNT = "reqConCount";
PeerAction.COUNT = "count";
PeerAction.requestImageObject = function (url) {
    return {action: PeerAction.REQUEST_IMAGE, file: url};
};
PeerAction.hasImageObject = function (req) {
    return {
        action: PeerAction.HAS_IMAGE,
        size: req.getSize(),
        hash: req.getHash(),
        file: req.getUrl()
    };
};
PeerAction.requestFileObject = function (url) {
    return {action: PeerConnection.ACTION_REQUEST_FILE, url: url};
};
