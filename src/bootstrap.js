

try {
    var logger = jsd.util.logger;

    var app = new jsd.App();
    app.init();
    app.start();

    window.jsdapp = app;
    window.jsd = jsd;

    var peer = null;
    var createPeerConnection = function(peerid) {
        app.session.sendParticipantRequest(peerid);
    };

    var getPeer = function() {
        var peerid = $('#target').val();
        if (peerid) {
            return app.session.psm.getPeerByUuid(peerid);
        } else {
            return null;
        }
    };

    window.peer = peer;
    window.createPeerConnection = createPeerConnection;

    $('#uuid').val(app.settings.uuid);
    $('#call').click(function () {
        var target = $('#target').val();
        if (target) {
            app.createPeerConnection(target);
        } else {
            console.error('You need input the target id');
        }
    });
    var objectURL = undefined;
    $('#loadfile').click(function () {
        if (!objectURL) {
            var url = 'http://localhost:8081/images/1.jpg';
            load_binary_resource(url, function(b) {
                objectURL = URL.createObjectURL(b);
            });
        }
    });

    /**
     * Event-Handler, called when Network state changes
     *
     * @private
     * @method networkConnectivityStateChangeHandler
     * @param {Object} e
     */
    function networkConnectivityStateChangeHandler(e) {
        if (e.type === 'online') {
            logger.log('Network', 'online!');
            logger.log('Network', 'try to reconnecting ...');
            app.start();
        }
        else {
            logger.warn('Network', 'offline!');
            app.stop();
        }
    }

    window.addEventListener('offline', networkConnectivityStateChangeHandler);
    window.addEventListener('online', networkConnectivityStateChangeHandler);

} catch(ex) {
    console.log(ex.stack);
}