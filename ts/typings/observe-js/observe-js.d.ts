
/// <reference path="../node/node.d.ts" />

interface Path {
    toString(): string
    getValueFrom(obj: any, directObserver: any): any
    iterateObjects(obj: any, observe: any)
    compiledGetValueFromFn(): (target: any, name: string) => void
    setValueFrom(obj: any, value: any): boolean
}

declare var Path: {
    new(s: any, privateToken: any): Path
};

interface Observer {

    // Begins observation. Value changes will be reported by invoking |changeFn| with |opt_receiver| as
    // the target, if provided. Returns the initial value of the observation.
    open(changeFn: (...args: any[]) => void, opt_receiver?: any): any
    // Ends observation. Frees resources and drops references to observed objects.
    close()
    // Report any changes now (does nothing if there are no changes to report).
    deliver()
    //report_(changes: any): void
    // If there are changes to report, ignore them. Returns the current value of the observation.
    discardChanges(): any
}

//interface Object {
//    toString(): string;
//    toLocaleString(): string;
//    // ... rest ...
//}
//declare var Object: {
//    new (value?: any): Object;
//    (): any;
//    (value: any): any;
//    // ... rest ...
//}
declare var Observer: {
    hasObjectObserve: boolean
    prototype: Observer
    defineComputedProperty(target: any, name: string, observable: any): () => void
};

interface Platform {
    performMicrotaskCheckpoint(): void
    clearObservers(): void
}

interface ObjectObserver extends Observer {
//    connect_(callback: any, target: any)
    copyObject(object: any): any
//    check_(changeRecords: any, skipChanges: any): boolean
//    disconnect_()
    deliver()
    discardChanges(): any
}

interface ArrayObserver extends ObjectObserver {
    copyObject(arr): any
//    check_(changeRecords: any): boolean
}

interface PathObserver extends Observer {
//    connect_()
//    disconnect_()
//    iterateObjects_(observe)
//    check_(changeRecords: any, skipChanges: any): boolean
    setValue(newValue)
}

interface CompoundObserver extends Observer {
//    connect_()
//    closeObservers_()
//    disconnect_()
    addPath(object: any, path: any)
    addObserver(observer)
    startReset()
    finishReset()
//    iterateObjects_(observe)
//    check_(changeRecords: any, skipChanges: any): boolean
}

interface ObserverTransform {
    open(callback: any, target: any)
//    observedCallback_(value: any)
    discardChanges()
    deliver()
    setValue(value: any)
    close()
}

interface ArraySplice {
    calcEditDistances(current: any, currentStart: any, currentEnd: any, old: any, oldStart: any, oldEnd: any): any
    spliceOperationsFromEditDistances(distances: any): any
    calcSplices(current: any, currentStart: any, currentEnd: any, old: any, oldStart: any, oldEnd: any): any
    sharedPrefix(current: any, old: any, searchLength: number): number
    sharedSuffix(current: any, old: any, searchLength: number): number
    calculateSplices(current: any, previous: any): any
    equals(currentValue: any, previousValue: any): boolean
}

declare var ObjectObserver: {
    prototype: ObjectObserver;
    new (object: any): ObjectObserver
};

declare var ArrayObserver: {
    prototype: ArrayObserver;
    new (array: any): ArrayObserver
    applySplices(previous: any, current: any, splices: any)
    calculateSplices(current: any, previous: any): any
};

