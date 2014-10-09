
require.config({
    paths: {
        'domready': '../lib/requirejs-domready/domReady',
        'lodash': '../lib/lodash/dist/lodash',
        'eventemitter2': '../lib/eventemitter2/lib/eventemitter2',
        'idbwrapper': '../lib/idbwrapper/idbstore',
        'node-uuid': '../lib/node-uuid/uuid',
        'observe-js': '../lib/observe-js/src/observe',
        'q': '../lib/q/q',
        'jquery': '../lib/jquery',
        'sockjs': '../lib/sockjs/sockjs',
//        'swfobject': '../lib/evercookie/js/swfobject-2.2.min',
//        'evercookie': '../lib/evercookie/js/evercookie',
        'state-machine': '../lib/javascript-state-machine/state-machine',
        'fingerprint': '../lib/fingerprintjs/fingerprint',
        'sha1': '../lib/cryptojs/rollups/sha1'
//        'clientjs': '../lib/clientjs/dist/client.min'
    },
    shim: {}
});

define(['jquery', 'app', 'fingerprint', 'sha1'],
function ($, jsd, fingerprint, sha1) {

    try {
      var logger = jsd.logger;
      var app = new jsd.App();

      app.init();
      app.start();

      var peer = null;
      var createPeerConnection = function(peerid) {
        peer = app.session.createPeer(peerid);
        peer.isSource = true;
        peer.isTarget = false;
        app.session.peers.add(peer);
        peer.createConnection();
      };

      window.peer = peer;
      window.createPeerConnection = createPeerConnection;

      $('#uuid').val(app.settings.uuid);
      $('#call').click(function () {
        var target = $('#target').val();
        if (target) {
          window.createPeerConnection(target);
        } else {
          console.error('You need input the target id');
        }
      });
//      var my_hasher = function(value, seed) {
//        return CryptoJS.SHA1(value).toString(CryptoJS.enc.Hex);
//      };

//      var fp = new fingerprint({hasher: my_hasher});
//      var bid = fp.get();
//      var mid = my_hasher(fp.getCanvasFingerprint(), 32);

//      console.info('Your bid: ', bid);
//      console.info('Your mid: ', mid);

//      app.settings.uuid = bid;
//      app.settings.mid = mid;

//      window.clientjs = clientjs;
      window.fingerprint = fingerprint;
      window.jsdapp = app;
      window.jsd = jsd;

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

});



