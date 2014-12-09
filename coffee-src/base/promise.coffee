#
# Promise Class
#
# A variant of promise-light (https://github.com/taylorhakes/promise-light) by https://github.com/taylorhakes - an A+ and ECMASCRIPT 6 compliant Promise implementation.
#
# Modified by David Fahlander to be indexedDB compliant (See discussion: https://github.com/promises-aplus/promises-spec/issues/45) .
# This implementation will not use setTimeout or setImmediate when it's not needed. The behavior is 100% Promise/A+ compliant since
# the caller of new Promise() can be certain that the promise wont be triggered the lines after constructing the promise. We fix this by using the member variable constructing to check
# whether the object is being constructed when reject or resolve is called. If so, the use setTimeout/setImmediate to fulfill the promise, otherwise, we know that it's not needed.
#
# This topic was also discussed in the following thread: https://github.com/promises-aplus/promises-spec/issues/45 and this implementation solves that issue.
#
# Another feature with this Promise implementation is that reject will return false in case no one catched the reject call. This is used
# to stopPropagation() on the IDBRequest error event in case it was catched but not otherwise.
#
# Also, the event new Promise().onuncatched is called in case no one catches a reject call. This is used for us to manually bubble any request
# errors to the transaction. We must not rely on IndexedDB implementation to do this, because it only does so when the source of the rejection
# is an error event on a request, not in case an ordinary exception is thrown.
Promise = (do ->

    # The use of asap in handle() is remarked because we must NOT use setTimeout(fn,0) because it causes premature commit of indexedDB transactions - which is according to indexedDB specification.
    # If not FF13 and earlier failed, we could use this call here instead: setTimeout.call(this, [fn, 0].concat(arguments));
    # IE10+ and node.
    enqueueImmediate = (fn, args) ->
        operationsQueue.push [
            fn
            _slice.call(arguments, 1)
        ]
        return
    executeOperationsQueue = ->
        queue = operationsQueue
        operationsQueue = []
        i = 0
        l = queue.length

        while i < l
            item = queue[i]
            item[0].apply window, item[1]
            ++i
        return

    #var PromiseID = 0;
    Promise = (fn) ->
        throw new TypeError("Promises must be constructed via new")  if typeof this isnt "object"
        throw new TypeError("not a function")  if typeof fn isnt "function"
        @_state = null # null (=pending), false (=rejected) or true (=resolved)
        @_value = null # error or result
        @_deferreds = []
        @_catched = false # for onuncatched
        #this._id = ++PromiseID;
        self = this
        constructing = true
        @_PSD = Promise.PSD
        try
            doResolve this, fn, ((data) ->
                if constructing
                    asap resolve, self, data
                else
                    resolve self, data
                return
            ), (reason) ->
                if constructing
                    asap reject, self, reason
                    false
                else
                    reject self, reason

        finally
            constructing = false
        return
    handle = (self, deferred) ->
        if self._state is null
            self._deferreds.push deferred
            return
        cb = (if self._state then deferred.onFulfilled else deferred.onRejected)

        # This Deferred doesnt have a listener for the event being triggered (onFulfilled or onReject) so lets forward the event to any eventual listeners on the Promise instance returned by then() or catch()
        return ((if self._state then deferred.resolve else deferred.reject))(self._value)  if cb is null
        ret = undefined
        isRootExec = isRootExecution
        isRootExecution = false
        asap = enqueueImmediate
        try
            ret = cb(self._value)
            setCatched self  if not self._state and (not ret or typeof ret.then isnt "function" or ret._state isnt false) # Caller did 'return Promise.reject(err);' - don't regard it as catched!
        catch e
            catched = deferred.reject(e)
            if not catched and self.onuncatched
                try
                    self.onuncatched e
            return
        deferred.resolve ret
        if isRootExec
            executeOperationsQueue()  while operationsQueue.length > 0
            asap = _asap
            isRootExecution = true
        return
    setCatched = (promise) ->
        promise._catched = true
        setCatched promise._parent  if promise._parent
        return
    resolve = (promise, newValue) ->
        outerPSD = Promise.PSD
        Promise.PSD = promise._PSD
        try #Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
            throw new TypeError("A promise cannot be resolved with itself.")  if newValue is promise
            if newValue and (typeof newValue is "object" or typeof newValue is "function")
                if typeof newValue.then is "function"
                    doResolve promise, ((resolve, reject) ->
                        newValue.then resolve, reject
                        return
                    ), ((data) ->
                        resolve promise, data
                        return
                    ), (reason) ->
                        reject promise, reason
                        return

                    return
            promise._state = true
            promise._value = newValue
            finale.call promise
        catch e
            reject e
        finally
            Promise.PSD = outerPSD
        return
    reject = (promise, newValue) ->
        outerPSD = Promise.PSD
        Promise.PSD = promise._PSD
        promise._state = false
        promise._value = newValue
        finale.call promise
        if not promise._catched and promise.onuncatched
            try
                promise.onuncatched promise._value
        Promise.PSD = outerPSD
        promise._catched
    finale = ->
        i = 0
        len = @_deferreds.length

        while i < len
            handle this, @_deferreds[i]
            i++
        @_deferreds = []
        return
    Deferred = (onFulfilled, onRejected, resolve, reject) ->
        @onFulfilled = (if typeof onFulfilled is "function" then onFulfilled else null)
        @onRejected = (if typeof onRejected is "function" then onRejected else null)
        @resolve = resolve
        @reject = reject
        return

    ###*
    Take a potentially misbehaving resolver function and make sure
    onFulfilled and onRejected are only called once.

    Makes no guarantees about asynchrony.
    ###
    doResolve = (promise, fn, onFulfilled, onRejected) ->
        done = false
        try
            fn (Promise_resolve = (value) ->
                return  if done
                done = true
                onFulfilled value
                return
            ), Promise_reject = (reason) ->
                return promise._catched  if done
                done = true
                onRejected reason

        catch ex
            return  if done
            return onRejected(ex)
        return

    _slice = [].slice
    _do_asap = (fn, arg1, arg2, argN) ->
        args = arguments
        setTimeout (->
            fn.apply window, _slice.call(args, 1)
            return
        ), 0
        return
    _asap = if typeof (setImmediate) is "undefined" then _do_asap else setImmediate

    asap = _asap
    isRootExecution = true
    operationsQueue = []
    Promise.all = ->
        args = Array::slice.call((if arguments.length is 1 and Array.isArray(arguments[0]) then arguments[0] else arguments))
        new Promise((resolve, reject) ->
            res = (i, val) ->
                try
                    if val and (typeof val is "object" or typeof val is "function")
                        then_ = val.then
                        if typeof then_ is "function"
                            then_.call val, ((val) ->
                                res i, val
                                return
                            ), reject
                            return
                    args[i] = val
                    resolve args  if --remaining is 0
                catch ex
                    reject ex
                return
            return resolve([])  if args.length is 0
            remaining = args.length
            i = 0

            while i < args.length
                res i, args[i]
                i++
            return
        )


    # Prototype Methods
    Promise::then = (onFulfilled, onRejected) ->
        self = this
        p = new Promise((resolve, reject) ->
            if self._state is null
                handle self, new Deferred(onFulfilled, onRejected, resolve, reject)
            else
                asap handle, self, new Deferred(onFulfilled, onRejected, resolve, reject)
            return
        )
        p._PSD = @_PSD
        p.onuncatched = @onuncatched # Needed when exception occurs in a then() clause of a successful parent promise. Want onuncatched to be called even in callbacks of callbacks of the original promise.
        p._parent = this # Used for recursively calling onuncatched event on self and all parents.
        p

    Promise::["catch"] = (onRejected) ->
        return @then(null, onRejected)  if arguments.length is 1

        # First argument is the Error type to catch
        type = arguments[0]
        callback = arguments[1]
        if typeof type is "function"
            @then null, (e) ->

                # Catching errors by its constructor type (similar to java / c++ / c#)
                # Sample: promise.catch(TypeError, function (e) { ... });
                if e instanceof type
                    callback e
                else
                    Promise.reject e

        else
            @then null, (e) ->

                # Catching errors by the error.name property. Makes sense for indexedDB where error type
                # is always DOMError but where e.name tells the actual error type.
                # Sample: promise.catch('ConstraintError', function (e) { ... });
                if e and e.name is type
                    callback e
                else
                    Promise.reject e


    Promise::["finally"] = (onFinally) ->
        @then ((value) ->
            onFinally()
            value
        ), (err) ->
            onFinally()
            Promise.reject err


    Promise::onuncatched = null # Optional event triggered if promise is rejected but no one listened.
    Promise.resolve = (value) ->
        p = new Promise(->
        )
        p._state = true
        p._value = value
        p

    Promise.reject = (value) ->
        p = new Promise(->
        )
        p._state = false
        p._value = value
        p

    Promise.race = (values) ->
        new Promise((resolve, reject) ->
            values.map (value) ->
                value.then resolve, reject
                return

            return
        )

    Promise.PSD = null # Promise Specific Data - a TLS Pattern (Thread Local Storage) for Promises. TODO: Rename Promise.PSD to Promise.data
    Promise.newPSD = (fn) ->

        # Create new PSD scope (Promise Specific Data)
        outerScope = Promise.PSD
        Promise.PSD = (if outerScope then Object.create(outerScope) else {})
        try
            return fn()
        finally
            Promise.PSD = outerScope
        return

    Promise
)
