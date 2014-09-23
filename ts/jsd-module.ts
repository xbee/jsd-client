
/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/EventEmitter2/EventEmitter2.d.ts" />


class JsdModule {

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

    constructor() {
        this.emit = this._ee.emit;
        this.on = this._ee.on;
        this.off = this._ee.off;
        this.onAny = this._ee.onAny;
        this.offAny = this._ee.offAny;
        this.removeAllListeners = this._ee.removeAllListeners;
    }

    extend(obj: any) {
        var self: any = this;
        return _.extend(self, obj);
    }

}

export = JsdModule;