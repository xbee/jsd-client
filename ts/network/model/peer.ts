/// <reference path="../../typings/lodash/lodash.d.ts" />
/// <reference path="../../typings/EventEmitter2/EventEmitter2.d.ts" />
/// <reference path="../../typings/webrtc/RTCPeerConnection.d.ts" />
/// <reference path="../../typings/q/Q.d.ts" />
/// <reference path="../../settings.ts" />

import jsd = require('../../settings');

var settings: jsd.SettingModel = jsd.settings;

var connectionConstraint: RTCMediaConstraints = {
    optional: [
        {RtpDataChannels: true},
        {DtlsSrtpKeyAgreement: true}
    ],
    mandatory: {
        OfferToReceiveAudio: false,
        OfferToReceiveVideo: false
    }
};

var channelConstraint: RTCDataChannelInit;

class Peer {

    id: any;
    /**
     * @property connection
     * @type {RTCPeerCpnnection}
     */
    connection: any = undefined;

    /**
     * @property channel
     * @type {RTCDataChannel}
     */
    channel: any = undefined;

    /**
     * Indicates if there is a stable conenction to this peer
     * @property isConnected
     * @default false
     * @type {Boolean}
     */
    isConnected: boolean = false;

    /**
     * Whether this peer is the initiator of a connection
     * @property isSource
     * @default false
     * @type {Boolean}
     */
    isSource: boolean = false;

    /**
     * Whether this peer is the initiator of a connection
     * @property isTarget
     * @default false
     * @type {Boolean}
     */
    isTarget: boolean = false;

    /**
     * Universal unique identifier for this peer
     * @property uuid
     * @type {String}
     */
    uuid: string;

    /**
     * Geolocation of this peer
     * @property location
     * @type {Object}
     */
    location: any;

    /**
     * Distance to this peer in kilometers
     * @property distance
     * @default undefined
     * @type {Number}
     */
    distance: number;

    /**
     * Uuids of the servers this peer is connected to,
     * used to find a signaling-channel.
     * @property servers
     * @type {Array}
     */
    servers: any[] = [];


    /**
     * A timestamp to prove when the last timout
     * occured when trying to connect to the peer.
     * @property timeout
     * @default undefined
     * @type {Number}
     */
    timeout: number;

    /**
     * List of timers for synchronization
     * @type {Array}
     */
    syncTimers: any[] = [];


    /**
     * Indicator to tell which protocol is currently used
     * SCTP or SRTP
     *
     * @property protocol
     * @default undefined
     * @type {String}
     */
    protocol: string;

    emit: (event:string, ...args: any[]) => boolean;
    on: (type: string, listener: Function) => EventEmitter2;
    off: (type: string, listener: Function) => EventEmitter2;
    onAny: (fn: Function) => EventEmitter2;
    offAny: (fn: Function) => EventEmitter2;
    removeAllListeners: (type: string[]) => EventEmitter2;

    private _ee: EventEmitter2 = new EventEmitter2({
        wildcard: true, // should the event emitter use wildcards.
        delimiter: ':', // the delimiter used to segment namespaces, defaults to `.`.
        newListener: false, // if you want to emit the newListener event set to true.
        maxListeners: 10 // the max number of listeners that can be assigned to an event, defaults to 10.
    });

    constructor(config: any) {
        var _self = this;
        var logger: any = console;

        this.id = config.id;

        this.on = this._ee.on;
        this.off = this._ee.off;
        this.onAny = this._ee.onAny;
        this.offAny = this._ee.offAny;
        this.emit = this._ee.emit;

        // Protocol switch SRTP(=default) or SCTP
        if (settings.protocol.toLowerCase() === 'sctp') {
            this.protocol = 'sctp';
            logger.log('Peer ' + _self.id, 'Using SCTP');

            connectionConstraint = {
                optional: [
                    {RtpDataChannels: false},
                    {DtlsSrtpKeyAgreement: true}
                ],
                mandatory: {
                    OfferToReceiveAudio: false,
                    OfferToReceiveVideo: false
                }
            };

            channelConstraint = {
                reliable: false,
                maxRetransmits: 0
            };
        } else {
            this.protocol = 'srtp';
            logger.log('Peer ' + _self.id, 'Using SRTP');
        }
    }

//    enumLocalIPs(cb) {
//        var RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
//        if (!RTCPeerConnection) return false;
//        var addrs = Object.create(null);
//        addrs['0.0.0.0'] = false;
//        function addAddress(newAddr) {
//            if (newAddr in addrs) return;
//            addrs[newAddr] = true;
//            cb(newAddr);
//        }
//        function grepSDP(sdp) {
//            var hosts = [];
//            sdp.split('\r\n').forEach(function (line) {
//                if (~line.indexOf('a=candidate')) {
//                    var parts = line.split(' '),
//                        addr = parts[4],
//                        type = parts[7];
//                    if (type === 'host') addAddress(addr);
//                } else if (~line.indexOf('c=')) {
//                    var parts = line.split(' '),
//                        addr = parts[2];
//                    addAddress(addr);
//                }
//            });
//        }
//        var rtc = new RTCPeerConnection({iceServers:[]});
//        if (window.mozRTCPeerConnection)
//            rtc.createDataChannel('', {reliable:false});
//        rtc.onicecandidate = function (evt) {
//            if (evt.candidate)
//                grepSDP(evt.candidate.candidate);
//        };
//        setTimeout(function() {
//            rtc.createOffer(function (offerDesc) {
//                grepSDP(offerDesc.sdp);
//                rtc.setLocalDescription(offerDesc);
//            }, function (e) {});
//        }, 50);
//        return true;
//    }
    getSignalChannel(): any {
        var signal;

        signal = _.intersection(this.servers.getServerUuidsAsArray(), this.servers);

        //get a sharedNode that we are connected to
        do {
            signal = this.servers.getServerByUuid(signal.shift());
        }
        while (!signal.isConnected);

        return signal;
    }
}