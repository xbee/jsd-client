/// <reference path="../../typings/lodash/lodash.d.ts" />
/// <reference path="../../typings/EventEmitter2/EventEmitter2.d.ts" />
/// <reference path="../../typings/sockjs/sockjs.d.ts" />
/// <reference path="../../typings/q/Q.d.ts" />

import Q = require('q');
import srvmod = require('../model/server');
import JsdModule = require('../../jsd-module');

class Servers extends JsdModule {

    private _servers: any[];

    list: any[] = this._servers;

    /**
     * @method connect
     * @return {Promise}
     */
    connect(): Q.Promise<any[]> {
        var logger: any = console;
        var promises: any[] = [];

        logger.log('Servers', 'Connecting...');

        this._servers.forEach(function (server) {
            promises.push(server.connect());
        });

        return Q.all(promises);
    }

    /**
     * @method update
     * @param {Array} nodeData
     */
    update(serverData: any[]) {
        var server: srvmod.Server;
        serverData.forEach(function (data: any) {
            server = new srvmod.Server(data);

            server.id = this._servers.length + 1;

            // Pass-through events
            server.onAny(function (e: any) {
                this.emit(this.event, e)
            });

            this._servers.push(server);
        });

        //Update public list
        this.list = this._servers;
    }

    /**
     * @method getServerByUrl
     * @param {String} url
     * @return {Server}
     */
    getServerByUrl(url: string) {
        return _.find(this._servers, function (server: srvmod.ServerInterface) {
            return server.url === url;
        });
    }

    /**
     * @method getServerUuidsAsArray
     * @return {Array}
     */
    getServerUuidsAsArray(): string[] {
        return _.map(this._servers, function (server: srvmod.ServerInterface) {
            return server.uuid;
        })
    }

    /**
     * @method getMissingServerUuidsAsArray
     * @param {Array} externalList
     * @return {Array}
     */
    getMissingServerUuidsAsArray(externalList: string[]) {
        var internalList: string[] = this.getServerUuidsAsArray();
        return _.difference(externalList, internalList);
    }

    /**
     * @method getServerByUuid
     * @param {String} uuid
     * @return {Server}
     */
    getServerByUuid(uuid: string): srvmod.ServerInterface {
        return _.find(this._servers, function (server: srvmod.ServerInterface) {
            return server.uuid === uuid;
        });
    }

    /**
     * @method authenticate
     * @return {Promise}
     */
    authenticate(): Q.Promise<any[]> {
        var logger = console;

        var promises = [];

        logger.log('Servers', 'Authenticating...');

        this._servers.forEach(function (server) {
            var deferred = Q.defer();
            server.sendAuthentication()
                .then(function () {
                    deferred.resolve(null);
                });
            promises.push(deferred.promise);

        });

        return Q.all(promises);

    }

    /**
     * @method getRelatedPeers
     * @return {Array}
     */
    getRelatedPeers(): Q.Promise<any[]> {
        var promises = [];

        this._servers.forEach(function (server) {
            var deferred = Q.defer();
            server.getAllRelatedPeers().then(function (peers: any[]) {
                //add reference to server, to know where the peer is connected
                peers.forEach(function (peer: any) {
                    peer.servers = [server.uuid];
                });
                deferred.resolve(peers);
            });
            promises.push(deferred.promise);

        });
        return Q.all(promises);
    }
}