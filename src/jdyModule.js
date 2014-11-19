
var MySandbox = function(core, instanceId, options, moduleId) {

    // define your API
    this.myFooProperty = "bar";

    // e.g. provide the Mediator methods 'on', 'emit', etc.
    core._mediator.installTo(this);

    // ... or define your custom communication methods
    this.myEmit = function(channel, data){
        core.emit(channel + '/' + instanceId, data);
    };

    // maybe you'd like to expose the instance ID
    this.id = instanceId;

    return this;
};

// ... and of course you can define shared methods etc.
MySandbox.prototype.foo = function() { /*...*/ };

// create the helloWorld module
var JdyModule = function(sandbox) {

    var engine = new J.Engine(sandbox);

    var urlConverter = function(url, cb) {

        // 1. query Tracker
        // DoYouHave hash url meta


        // if have one or more seeder
        // 2.1 then get from peer

        // 2.2 or get from server or keep the origin url ?
        J.Util.loadResourceByXHR(url, function(blob) {
            // convert blob to data url
            var objectURL = window.URL.createObjectURL(blob);

            // NOTE: objectURL just valid in this scope, outer will fail !!!
            // set image's url
            cb(objectURL);
        });

    };

    // boot your module
    var init = function(options) {
        // start the engine
        try {
            var logger = J.logger;

            var options = {
                // ----------------- event handlers ----------------------
                //
                signaler_onAuthenticated : function (event) {
                    logger.debug('Signal', 'signaler_onAuthenticated');
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
            engine.start(options);

            window.jce = engine;

            var peer = null;

            var getPeer = function() {
                var peerid = $('#target').val();
                if (peerid) {
                    return engine.getPeerById(peerid);
                } else {
                    return null;
                }
            };

            window.peer = peer;

            $('#uuid').val(engine.settings.uuid);
            $('#call').click(function () {
                var target = $('#target').val();
                if (target) {
                    engine.createPeerConnection(target);
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
    };

    // shutdown your module
    var destroy = function(){

        // stop the engine
        engine.stop();
    };

    // return public module API
    return {
        // public fields
        engine: engine,
        // public methods
        init: init,
        destroy: destroy,
        loadResource: urlConverter
    }
};


