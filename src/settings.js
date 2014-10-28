;(function (exports) {
    var _storeName = 'settings',
        _settings = readSettingsFromLocalStorage();

    /**
     * @private
     * @method readSettingsFromLocalStorage
     * @return {Object} Settings
     */
    function readSettingsFromLocalStorage() {
        return JSON.parse(localStorage.getItem(_storeName)) || {};
    }

    /**
     * @private
     * @method storeSettingsToLocalStorage
     */
    function storeSettingsToLocalStorage() {
        localStorage.setItem(_storeName, JSON.stringify(_settings));
    }

    //Chrome is currently the only one supporting native O_o
    //which would be
    //Object.observe(_settings, storeSettingsToLocalStorage);
    var observer = new ObjectObserver(_settings);
    observer.open(storeSettingsToLocalStorage);

    //Defaults
    _.defaults(_settings, {
        authToken: null, // Will never be sent to any peer (private)
        tokenExpiresAt: 0,
        maxPeers: 3,
        maxFactories: 1,
        maxWorkers: 1,
        fileStorageSize: 500 * 1024 * 1024, //500MB
        protocol: 'sctp', //srtp || sctp
        iceServers: [
            {
                'url': 'stun:stun.l.google.com:19302'
            },
            {
                'url': 'stun:stun.turnservers.com:3478'
            }
        ],
        signalServer: {
            'host': 'localhost',
            'port': 3081,
            'isSecure': false
        },
        syncInterval: 3600000, //1h
        apiKey: '1c69f278739ed7653f5a0f2d8ca51c0e41100492',
        uuid: jsd.util.getUid() //everyone will know (public)
    });

    exports.settings =  _settings;

})(typeof exports === 'undefined' ? jsd.util : exports);
