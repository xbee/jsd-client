
exports.FULL = 100;
exports.NONE = 0;

// the order has importance!
exports[exports.FULL] = [
    '../src/util/namespaces.js',
    '../src/util/lodash.js',
    '../src/util/eventemitter2.js',
    '../src/util/observe.js',
    '../src/util/sha1.js',
    '../src/util/fingerprint.js',
    '../src/util/state-machine.js',
    '../src/transport/sockjs.js',
    '../src/data/FileBufferReader.js',
    '../src/clientconfig.js',
    '../src/util/logger.js',
    '../src/util/myid.js',
    '../src/settings.js',
    '../src/util/detect.js',
    '../src/core/signalsession.js',
    '../src/core/peersession.js',
    '../src/core/offeranswer.js',
    '../src/core/peersessionmanager.js',
    '../src/client.js',
    '../src/bootstrap.js'
];