
/// <reference path="../node/node.d.ts" />

interface                       EventEmitter {
    newListener: boolean;
    delimiter: string;
    wildcard: boolean;
    event: string;
    maxListeners: number;

    setMaxListeners(n: number)
    once(event: string, fn: Function): EventEmitter
    many(event: string, ttl: number, fn: Function): EventEmitter
    emit(event: string, ...args: any[]): boolean
    on(type: any, listener: Function): EventEmitter
    onAny(fn: Function): EventEmitter
    addListener(event: string, listener: Function): EventEmitter
    off(event: string, listener: Function): EventEmitter
    offAny(fn: Function): EventEmitter
    removeListener(event: string, listener: Function): EventEmitter
    removeAllListeners(event: string[]): EventEmitter
    listeners(event: string): any[]
    listenersAny(): any[]

}

declare var EventEmitter: {
    prototype: EventEmitter;
    new(conf: any): EventEmitter;
};


