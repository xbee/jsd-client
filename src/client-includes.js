
exports.FULL = 100;
exports.NONE = 0;

var srcPath = '/src/';

// the order has importance!
var files = [
    'util/namespaces.js',
    'util/lodash.js',
    'util/eventemitter2.js',
    'util/aop.js',
    'util/observe.js',
    'event/radio.js',
    //'event/autobahn.js', // include when.js + crypto-js
    'event/postal.js',
    'util/sha1.js',
    'util/fingerprint.js',
    'util/state-machine.js',
    'transport/sockjs.js',
    //'data/jdataview.js',
    //'data/jbinary.js',
    'data/binarize.js',
    'data/FileBufferReader.js',
    'clientconfig.js',
    'data/binarypack.js',
    'util/logger.js',
    'util/index.js',
    //'transport/reliable.js',
    'util/myid.js',
    'settings.js',
    'util/detect.js',
    'core/SignalSession.js',
    'core/channelevents.js',
    'core/PeerSession.js',
    'core/offeranswer.js',
    'core/peersessionmanager.js',
    'client.js',
    'bootstrap.js'
];

exports[exports.FULL] = files.map(function(fn) {
   return srcPath + fn;
});
