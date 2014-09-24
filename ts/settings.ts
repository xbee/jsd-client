/**
 * Created by michael on 14-9-18.
 */
/// <reference path="typings/observe-js/observe-js.d.ts" />
/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="setting_model.ts" />
/// <reference path="uuid.ts" />

import _ = require('lodash');
import uuid = require('./uuid');

export class SettingModel implements J2T.SettingInterface {
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
        this.authToken = uuid.generate();
        this.uuid = uuid.generate();

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
    settingstore:SettingModel = new SettingModel();

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

export var settings: SettingModel = Settings.getInstance().settingstore;




