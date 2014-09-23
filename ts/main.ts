/// <reference path="typings/EventEmitter2/EventEmitter2.d.ts" />
/// <reference path="typings/observe-js/observe-js.d.ts" />
/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/node-uuid/node-uuid.d.ts" />
/// <reference path="typings/webrtc/RTCPeerConnection.d.ts" />
/// <reference path="typings/q/Q.d.ts" />
/// <reference path="typings/sockjs/sockjs.d.ts" />

import Q = require('q');
import nuuid = require('node-uuid');

var logger: any = console;

declare module J2T {

    export interface Results {
        enabled: boolean;
        interval?: number;
        groupSize: number;
    }

    export interface Jobs {
        enabled: boolean;
        interval?: number;
        groupSize: number;
    }

    export interface Files {
        enabled: boolean;
        interval?: number;
        groupSize: number;
    }

    export interface Peers {
        enabled: boolean;
        interval?: number;
        groupSize: number;
    }

    export interface Servers {
        enabled: boolean;
        interval?: number;
        groupSize: number;
    }

    export interface IceServer {
        url: string;
    }

    export interface SignalServer {
        host: string;
        isSecure: boolean;
        port: number;
    }

    export interface Broadcast {
        messageTtl: number;
        peers: Peers;
        servers: Servers;
    }

    export interface Synchronization {
        peers: Peers;
        servers: Servers;
    }

    export interface Network {
        broadcast: Broadcast;
        synchronization: Synchronization;
        useGeoLocation: boolean;
        useIp: boolean;
        services: any[];
    }

    export interface SettingInterface {
        authToken: string;
        maxPeers: number;
        maxFactories: number;
        maxWorkers: number;
        protocol: string;
        iceServers: IceServer[];
        signalServers: SignalServer[];
        syncInterval: number;
        uuid: string;
        projectUuid: string;
        network: Network;
    }
}

class Uuid {
    static _format:RegExp = new RegExp('/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i');

    /**
     * Generates an universally unique identifier
     *
     * @method generate
     * @return {String} An Universally unique identifier v4
     * @see http://en.wikipedia.org/wiki/Universally_unique_identifier
     */
    static generate():string {
        return  nuuid.v4();
    }

    /**
     * Test if a uuid is valid
     *
     * @method isValid
     * @param uuid
     * @returns {boolean}
     */
    static isValid(uuid:string):boolean {
        return Uuid._format.test(uuid);
    }

}

class SettingModel implements J2T.SettingInterface {
    authToken:string;
    maxPeers:number = 3;
    maxFactories:number = 4;
    maxWorkers:number = 1;
    protocol:string = 'sctp';
    iceServers: J2T.IceServer[] = [
        {
            url: 'stun:stun.l.google.com:19302'
        },
        {
            url: 'stun:stun.turnservers.com:3478'
        }
    ];
    signalServers: J2T.SignalServer[] = [
        {
            host: 'localhost',
            isSecure: false,
            port: 3080
        }
    ];
    syncInterval:number = 3600000; // 1h
    uuid:string; //everyone will know (public)
    projectUuid: string; // for every site
    network:J2T.Network;

    constructor() {
        this.authToken = Uuid.generate();
        this.uuid = Uuid.generate();

        this.network.broadcast.messageTtl = 10000;
        this.network.broadcast.peers.enabled = true;
        this.network.broadcast.servers.enabled = true;
        this.network.broadcast.servers.groupSize = 1;
        this.network.synchronization.peers.enabled = true;
        this.network.synchronization.peers.groupSize = 15;
        this.network.synchronization.peers.interval = 3600000;
        this.network.synchronization.servers.enabled = true;
        this.network.synchronization.servers.groupSize = 15;
        this.network.synchronization.servers.interval = 3600000;
        this.network.useGeoLocation = true;
    }
}

class Settings {

    private _storeName:string = 'settings';
    settingstore:SettingModel;

    //Chrome is currently the only one supporting native O_o
    //which would be
    //Object.observe(settingstore, storeSettingsToLocalStorage);
    private _observer:Observer = new ObjectObserver(this.settingstore);

    /**
     * @private
     * @method readSettingsFromLocalStorage
     * @return {Object} Settings
     */
    private readSettingsFromLocalStorage():any {
        return JSON.parse(localStorage.getItem(this._storeName)) || {};
    }

    /**
     * @private
     * @method storeSettingsToLocalStorage
     */
    private storeSettingsToLocalStorage():any {
        localStorage.setItem(this._storeName, JSON.stringify(this.settingstore));
    }

    constructor() {
        this.settingstore = <SettingModel>this.readSettingsFromLocalStorage();
        this._observer.open(this.storeSettingsToLocalStorage);
    }

    private static _instance:Settings;

    public static getInstance():Settings {

        if (Settings._instance === null) {
            Settings._instance = new Settings();
        } else {
        }
        return Settings._instance;
    }
}

var settings: SettingModel = Settings.getInstance().settingstore;

interface Host {
    host: string;
    port: number;
    isSecure: boolean;
}

interface Message {
    cmd: string;
    data: any;
}

class SignalSession {

    host: string;
    port: number;
    isSecure: boolean;
    url: string; // set via WS
    id: number = 0; // for local use only
    uuid: string; // config.uuid
    socket: SockJS = null;
    isConnected: boolean = false;
    localIPs: string[] = undefined;

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

    constructor(config: Host) {
        this.emit = this._ee.emit;
        this.on = this._ee.on;
        this.off = this._ee.off;
        this.onAny = this._ee.onAny;
        this.offAny = this._ee.offAny;
        this.removeAllListeners = this._ee.removeAllListeners;

        this.enumLocalIPs(function(datas: string[]) {
           this.localIPs = datas;
        });
    }

    /*
     *  get all of local ip address
     */
    enumLocalIPs(cb: (localIps: string[]) => void) {
        var x = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        if (!x) return false;
        var addrs = Object.create(null);
        addrs['0.0.0.0'] = false;
        var addAddress = function(newAddr) {
            if (newAddr in addrs) return;
            addrs[newAddr] = true;
            cb(newAddr);
        };
        var grepSDP = function(sdp) {
            sdp.split('\r\n').forEach(function (line) {
                if (~line.indexOf('a=candidate')) {
                    var parts = line.split(' '),
                        addr = parts[4],
                        type = parts[7];
                    if (type === 'host') addAddress(addr);
                } else if (~line.indexOf('c=')) {
                    var parts = line.split(' '),
                        addr = parts[2];
                    addAddress(addr);
                }
            });
        };

        // typescript do not support polyfill
//    var rtc = new RTCPeerConnection({iceServers: []});
        var rtc: RTCPeerConnection;
        if (window.mozRTCPeerConnection) {
            rtc = new mozRTCPeerConnection({iceServers: []});
            rtc.createDataChannel('', {reliable: false});
        } else if(window.webkitRTCPeerConnection) {
            rtc = new webkitRTCPeerConnection({iceServers: []});
        }
        rtc.onicecandidate = function (evt) {
            if (evt.candidate)
                grepSDP(evt.candidate.candidate);
        };
        setTimeout(function() {
            rtc.createOffer(function (offerDesc) {
                grepSDP(offerDesc.sdp);
                rtc.setLocalDescription(offerDesc);
            }, function (e) {});
        }, 50);
        return true;
    }

    /**
     * @method connect
     * @return {Promise}
     */
    connect(): Q.Promise<{}> {
        var self = this;
        var logger = console;
        var deferred = Q.defer();

        try {
            var url = (this.isSecure ? 'https' : 'http') + '://' + this.host + ':' + this.port;
            this.socket = new SockJS(url,null,{debug:true, devel:true});
            this.url = url;

            //add listeners
            this.socket.onmessage = this.messageHandler;
            this.socket.onopen  = function (ev: SJSOpenEvent) {
                logger.log('Server ' + self.id, self.url, 'connected');
                self.isConnected = true;
                deferred.resolve(null);
            };

            this.socket.addEventListener('error', function (e) {
                self.disconnect();
                logger.log('Server ' + self.id, self.url, 'error');
            });

            this.socket.onclose = function (e: SJSCloseEvent) {
                self.disconnect();
                logger.log('Server ' + self.id, self.url, 'disconnected', e.code + ' : ' + e.reason);

                switch (e.code) {
                    case 1011 :
                        logger.log('Server ' + self.id, self.url, 'is idle! Please restart it.');
                        break;
                }
            };
        }
        catch (e) {
            deferred.reject(null);
            self.disconnect();
        }

        return deferred.promise;
    }

    disconnect(): SignalSession {
        this.socket = null;
        this.isConnected = false;
        return this;
    }

    send(cmd: string, data: any, waitForResponse: boolean): Q.Promise<any> {

        var self = this,
            deferred = Q.defer();

        if (!this.isConnected) {
            deferred.reject('Not connected to server!');
            return deferred.promise;
        }

        if (!data || !_.isObject(data) || _.isEmpty(data)) {
            deferred.reject('Data is not an object/empty!');
            return deferred.promise;
        }

        if (!cmd) {
            deferred.reject('Command is not defined!');
            return deferred.promise;
        }

        //add cmd to data
        data.cmd = cmd;
        //add auth token
        data.authToken = settings.authToken;

        //send data to websocket as String
        this.socket.send(JSON.stringify(data));

        // If we need to wait for the answer
        if (waitForResponse) {

            function responseHandler(e: any) {
                var response = JSON.parse(e.data);
                if (response.cmd === cmd) {
                    self.socket.removeEventListener('message', responseHandler);
                    deferred.resolve(response.data);
                }
            }

            this.socket.addEventListener('message', responseHandler);

            // No need to wait
        } else {
            deferred.resolve(null);
        }

        return deferred.promise;
    }

    sendAuthentication(): Q.Promise<{}> {
        return this.send('peer:auth', {apiKey: settings.projectUuid, ips: this.localIPs}, true);
    }

    sendPeerOffer(targetPeerUuid: string, offer: string): Q.Promise<any> {

        return this.send('peer:offer', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, offer: offer, ips: location}, false);
//        return geo.getGeoLocation()
//            .then(function (location) {
//
//            });
    }

    sendPeerAnswer(targetPeerUuid, answer): Q.Promise<any> {
        return this.send('peer:answer', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, answer: answer}, false);
    }

    sendPeerCandidate(targetPeerUuid, candidate): Q.Promise<any> {
        return this.send('peer:candidate', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, candidate: candidate}, false);
    }

    getAllRelatedPeers(): Q.Promise<any> {
        return this.send('peer:list', {projectUuid: settings.uuid}, true);
    }

    private messageHandler(e: SJSMessageEvent) {
        var self = this;
        var data = JSON.parse(e.data),
            cmd = data.cmd;

        console.log('Server ' + this.id, 'Received', data);

        switch (cmd.toLowerCase()) {
            case 'peer:offer' :
                this.emit('peer:offer', {nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, offer: data.data.offer, location: data.data.location});
                break;
            case 'peer:answer' :
                this.emit('peer:answer', {nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, answer: data.data.answer});
                break;
            case 'peer:candidate' :
                this.emit('peer:candidate', {nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, candidate: data.data.candidate});
                break;
        }
    }

    serialize(): Host {
        return {
            host: this.host,
            isSecure: this.isSecure,
            port: this.port
        }
    }
}

var TIMEOUT_WAIT_TIME = 10000, //10s
    QUEUE_RETRY_TIME = 75,
    ICE_SERVER_SETTINGS = {
        iceServers: settings.iceServers
    };

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

class PeerSession {

    _self: any = this;

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
     * @type {Object}
     */
    server: SignalSession;

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

    constructor(server: SignalSession, config: any) {
        var _self = this;

        this.id = config.id;
        if (server)
            this.server = server;

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

    /**
     * @private
     * @method timerCompleteHandler
     */
    private timerCompleteHandler(e) {
        var _self: any = this;
        if (!this.isConnected) {
            this.timeout = Date.now();
            this.emit('peer:timeout', _self);
        }
        else this.timeout = undefined;
    }

    /* Event Handler Start */
    iceCandidateHandler(e) {
        //II. The handler is called when network candidates become available.
        if (!e || !e.candidate) return;

        // III. In the handler, Alice sends stringified candidate data to Eve, via their signaling channel.
        this.server.sendPeerCandidate(this.uuid, e.candidate);

    }

    dataChannelHandler(e) {
        var _self = this;
        logger.log('Peer ' + _self.id, 'Received remote DataChannel');

        _self.channel = e.channel;

        _self.channel.onclose = this.channel_CloseHandler;
        _self.channel.onerror = this.channel_ErrorHandler;
        _self.channel.onmessage = this.channel_MessageHandler;
        _self.channel.onopen = this.channel_OpenHandler;

    }

    iceConnectionStateChangeHandler(e) {
        var _self = this;
        // Everything is fine
        if (_self.connection.iceConnectionState === 'connected' &&
            _self.connection.iceGatheringState === 'complete') {

            logger.log('Peer ' + _self.id, 'Connection established');
        }
        // Connection has closed
        else if (_self.connection.iceConnectionState === 'disconnected') {
            logger.log('Peer ' + _self.id, 'Connection closed');

            _self.isConnected = false;
            _self.emit('peer:disconnect', _self);
        }
    }

    negotiationNeededHandler(e) {
        var _self = this;
        logger.log('Peer ' + _self.id, 'Negotiation needed');

        //2. Alice creates an offer (an SDP session description) with the RTCPeerConnection createOffer() method.
        _self.connection.createOffer(function (sessionDescription) {

                //3. Alice calls setLocalDescription() with his offer.)
                _self.connection.setLocalDescription(sessionDescription);

                //4. Alice stringifies the offer and uses a signaling mechanism to send it to Eve.
                _self.server.sendPeerOffer(_self.uuid, sessionDescription);

            },
            function (err) {
                logger.error('Peer ' + _self.id, err, 'Was using', _self.protocol, 'protocol.');
            },
            connectionConstraint);
    }

    signalingStateChangeHandler(e) {
    }

    channel_ErrorHandler(e) {
        var _self = this;
        logger.log('Peer ' + _self.id, 'Channel has an error', e);
    }

    channel_MessageHandler(e) {
        var msg;
        var _self = this;

        _self.isConnected = true;

        if (e.data instanceof Blob) {
            msg = {blob: e.data};
        }
        else {
            try {
                msg = JSON.parse(e.data);
            }
            catch (err) {
                logger.error('Peer ' + _self.id, 'Error parsing msg:', e.data);
            }

        }

        _self.emit('peer:message', _.extend(msg, {target: _self}));
    }

    channel_OpenHandler(e) {
        var _self = this;
        logger.log('Peer ' + _self.id, 'DataChannel is open');

        _self.isConnected = true;
        _self.emit('peer:connect', _self);
    }

    channel_CloseHandler(e) {
        var _self = this;
        logger.log('Peer ' + _self.id, 'DataChannel is closed', e);
        _self.isConnected = false;
        _self.emit('peer:disconnect', _self);
    }

    /* Event Handler END */

    /**
     * Create a WebRTC-Connection
     *
     * @method createConnection
     * @return {Promise}
     */
    createConnection(): Q.Promise<any> {
        var _self = this;
        var deferred: any = Q.defer;
        this.isSource = true;
        this.isTarget = false;

        logger.log('Peer ' + _self.id, 'Creating connection');

        //1.Alice creates an RTCPeerConnection object.
        _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);

        //I. Alice creates an RTCPeerConnection object with an onicecandidate handler.

        //Add listeners to connection
        _self.connection.ondatachannel = this.dataChannelHandler;
        _self.connection.onicecandidate = this.iceCandidateHandler;
        _self.connection.oniceconnectionstatechange = this.iceConnectionStateChangeHandler;
        _self.connection.onnegotiationneeded = this.negotiationNeededHandler;
        _self.connection.onsignalingstatechange = this.signalingStateChangeHandler;

        // Start timeout countdown
        _.delay(this.timerCompleteHandler, TIMEOUT_WAIT_TIME);

        try {
            // Create  data-channel
            _self.channel = _self.connection.createDataChannel('Jiasudu', channelConstraint);
        }
        catch (e) {
            // If an error occured here, there is a problem about the connection,
            // so lets do a timeout and maybe retry later
            this.isConnected = false;
            this.timerCompleteHandler(null);
            deferred.reject();
        }

        // Add listeners to channel
        _self.channel.onclose = this.channel_CloseHandler;
        _self.channel.onerror = this.channel_ErrorHandler;
        _self.channel.onmessage = this.channel_MessageHandler;
        _self.channel.onopen = this.channel_OpenHandler;
        return deferred.promise;
    }

    /**
     * @method answerOffer
     * @param data
     * @return {Promise}
     */
    answerOffer(data): Q.Promise<any> {
        var _self = this;
        var uuid = this.uuid,
            deferred = Q.defer,
            signal = this.server;

        _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);
        _self.connection.ondatachannel = this.dataChannelHandler;
        _self.connection.onicecandidate = this.iceCandidateHandler;
        _self.connection.oniceconnectionstatechange = this.iceConnectionStateChangeHandler;
        _self.connection.onnegotiationneeded = this.negotiationNeededHandler;
        _self.connection.onsignalingstatechange = this.signalingStateChangeHandler;

        this.connection = _self.connection;

        //5. Eve calls setRemoteDescription() with Alice's offer, so that her RTCPeerConnection knows about Alice's setup.
        _self.connection.setRemoteDescription(new RTCSessionDescription(data.offer), function () {

            //6. Eve calls createAnswer(), and the success callback for this is passed a local session description: Eve's answer.
            _self.connection.createAnswer(function (sessionDescription) {

                    //7. Eve sets her answer as the local description by calling setLocalDescription().
                    _self.connection.setLocalDescription(sessionDescription);

                    //8. Eve then uses the signaling mechanism to send her stringified answer back to Alice.
                    signal.sendPeerAnswer(uuid, sessionDescription);

                },
                function (err) {
                    logger.log(err);
                },
                connectionConstraint);

        });

        return deferred.promise;
    }
}