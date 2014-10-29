

try {
    var logger = jsd.util.logger;

    var app = new jsd.Client();
    app.start();

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