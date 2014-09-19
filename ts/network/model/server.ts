
/// <reference path="../../typings/lodash/lodash.d.ts" />
/// <reference path="../../typings/EventEmitter2/EventEmitter2.d.ts" />
/// <reference path="../../typings/sockjs/sockjs.d.ts" />
/// <reference path="../../typings/q/Q.d.ts" />
/// <reference path="../../settings.ts" />
/// <reference path="../geolocation.ts" />

//import sockjs = require('sockjs');
import geo = require('../geolocation');

import jsd = require('../../settings');

var settings: jsd.SettingModel = jsd.settings;

var geolocation: geo.GeoLocation = new geo.GeoLocation();

interface Host {
    host: string;
    port: number;
    isSecure: boolean;
}

class Server {

    host: string;
    port: number;
    isSecure: boolean;
    url: string; // set via WS
    id: number = 0; // for local use only
    uuid: string; // config.uuid
    socket: any = null;
    isConnected: boolean = false;

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
            this.socket.on('message', this.messageHandler);
            this.socket.on('connect', function () {
                logger.log('Server ' + self.id, self.url, 'connected');
                self.isConnected = true;
                deferred.resolve(null);
            });

            this.socket.on('error', function (e) {
                self.disconnect();
                logger.log('Server ' + self.id, self.url, 'error');
            });

            this.socket.on('disconnect', function (e) {
                self.disconnect();
                logger.log('Server ' + self.id, self.url, 'disconnected', e.code + ' : ' + e.reason);

                switch (e.code) {
                    case 1011 :
                        logger.log('Server ' + self.id, self.url, 'is idle! Please restart it.');
                        break;
                }
            });
        }
        catch (e) {
            deferred.reject(null);
            self.disconnect();
        }

        return deferred.promise;
    }

    disconnect(): Server {
        this.socket = null;
        this.isConnected = false;
        return this;
    }

    send(cmd:string, data:any, waitForResponse:boolean): Q.Promise<{}> {

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

            function responseHandler(e) {
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

    sendAuthentication() {
        return geolocation.getGeoLocation()
            .then(function (location) {
                return this.send('peer:auth', {uuid: settings.uuid, location: location}, true);
        });
    }

    sendPeerOffer(targetPeerUuid, offer): Q.Promise<any> {

        return geolocation.getGeoLocation()
            .then(function (location) {
                this.send('peer:offer', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, offer: offer, location: location}, false);
            });
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

    private messageHandler(e: any) {
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