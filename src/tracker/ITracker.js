

(function () {
    J.ITracker = J.Evented.extend({

        createSwarm:function(peerId, fileInfo, sender) {
            throw 'unimplemented method';
        },

        join:function(peerId, swarmId, originBrowser, sender) {
            throw 'unimplemented method';
        },

        leave:function(peerId, sender) {
            throw 'unimplemented method';
        },

        report:function(peerId, swarmId, report, sender) {
            throw 'unimplemented method';
        },

        onDownloadCompleted:function(swarmid) {
            throw 'unimplemented method';
        },

        validateToken:function(token,domain){
            throw 'unimplemented method';
        }

    })

})();
