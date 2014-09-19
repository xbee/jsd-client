
/// <reference path="../node/node.d.ts" />

interface EventEmitter2 {
    newListener: boolean;
    delimiter: string;
    wildcard: boolean;
    event: string;
    maxListeners: number;

    setMaxListeners(n: number)
    once(event: string, fn: Function): EventEmitter2
    many(event: string, ttl: number, fn: Function): EventEmitter2
    emit(event: string, ...args: any[]): boolean
    on(type: any, listener: Function): EventEmitter2
    onAny(fn: Function): EventEmitter2
    addListener(event: string, listener: Function): EventEmitter2
    off(event: string, listener: Function): EventEmitter2
    offAny(fn: Function): EventEmitter2
    removeListener(event: string, listener: Function): EventEmitter2
    removeAllListeners(event: string[]): EventEmitter2
    listeners(event: string): any[]
    listenersAny(): any[]

}

declare var EventEmitter2: {
    prototype: EventEmitter2;
    new(conf: any): EventEmitter2;
};


