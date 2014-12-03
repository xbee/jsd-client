PeerStatistic = function () {
};
PeerStatistic.upload = 0;
PeerStatistic.totalDownload = 0;
PeerStatistic.imageServerDownload = 0;
PeerStatistic.imageServerPercent = 0;
PeerStatistic.peerDownload = 0;
PeerStatistic.peerPercent = 0;
PeerStatistic.listener = null;
PeerStatistic.isDebug = false;
PeerStatistic.isShowLog = false;
PeerStatistic.consoleTextArea = null;
PeerStatistic.addUploadSize = function (sz) {
    PeerStatistic.upload += sz;
    if (PeerStatistic.listener != null) {
        PeerStatistic.listener();
    }
    ;
};
PeerStatistic.addDownloadSize = function (sz, isFromPeer) {
    PeerStatistic.totalDownload += sz;
    if (isFromPeer) {
        PeerStatistic.peerDownload += sz;
    } else {
        PeerStatistic.imageServerDownload += sz;
    }
    ;
    PeerStatistic.peerPercent = (PeerStatistic.peerDownload * 100) / PeerStatistic.totalDownload;
    PeerStatistic.imageServerPercent = (PeerStatistic.imageServerDownload * 100) / PeerStatistic.totalDownload;
    if (PeerStatistic.listener != null) {
        PeerStatistic.listener();
    }
    ;
};
PeerStatistic.log = function (msg) {
    if (PeerStatistic.isShowLog) {
        if (PeerStatistic.isDebug) {
            PeerStatistic.consoleTextArea.value += msg + "\n";
        } else {
            console.log(msg);
        }
        ;
    }
    ;
};
