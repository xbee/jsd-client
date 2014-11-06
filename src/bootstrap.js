

try {
    var logger = jsd.util.logger;

    var app = new jsd.Client();

    var options = {
        // ----------------- event handlers ----------------------
        //
        signaler_onAuthenticated : function (event) {
            logger.log('Signal', 'signaler_onAuthenticated');
            var self = this;

            function peerlistHandler(e) {
                var response = JSON.parse(e.data);
                if (response.cmd === CMD.LIST) {
                    self.signaler.socket.removeEventListener('message', peerlistHandler);
                    // received response of auth
                    if (response['data']['success'] && (response['data']['success'] === true)) {
                        if (response['data']['peers']) {
                            var pls = response['data']['peers'];
                            logger.log('Signal', 'peers: ', JSON.stringify(pls));
                            // handle the peer list datas
                            for (x in pls) {
                                $('#target').append($('<option>', {
                                    value: pls[x].id,
                                    text: pls[x].id
                                }));
                            }

                        }
                    }
                }
            }

            this.signaler.socket.addEventListener('message', peerlistHandler);
            // get the peer list
            this.signaler.getAllRelatedPeers();
        }
    };
    app.start(options);

    window.jsdapp = app;
    window.jsd = jsd;

    var peer = null;

    var getPeer = function() {
        var peerid = $('#target').val();
        if (peerid) {
            return app.getPeerById(peerid);
        } else {
            return null;
        }
    };

    window.peer = peer;

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


} catch(ex) {
    console.log(ex.stack);
}
