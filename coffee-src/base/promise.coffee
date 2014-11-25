# [promise.coffee](http://github.com/CodeCatalyst/promise.coffee) v1.0.6
# Copyright (c) 2012-2103 [CodeCatalyst, LLC](http://www.codecatalyst.com/).
# Open source under the [MIT License](http://en.wikipedia.org/wiki/MIT_License).

nextTick = if process?.nextTick? then process.nextTick else if setImmediate? then setImmediate else ( task ) -> setTimeout( task, 0 )

class JCallbackQueue
    constructor: ->
        queuedCallbacks = new Array(1e4)
        queuedCallbackCount = 0
        execute = ->
            index = 0
            while index < queuedCallbackCount
                queuedCallbacks[ index ]()
                queuedCallbacks[ index ] = null
                index++
            queuedCallbackCount = 0
            return
        @schedule = ( callback ) ->
            queuedCallbacks[ queuedCallbackCount++ ] = callback
            nextTick( execute ) if queuedCallbackCount is 1
            return

callbackQueue = new JCallbackQueue()
enqueue = ( task ) -> callbackQueue.schedule( task )

isFunction = ( value ) -> value and typeof value is 'function'
isObject = ( value ) -> value and typeof value is 'object'

class JConsequence
    constructor: ( @onFulfilled, @onRejected ) ->
        @resolver = new JResolver()
        @promise = @resolver.promise

    trigger: ( action, value ) ->
        switch action
            when 'fulfill'
                @propagate( value, @onFulfilled, @resolver, @resolver.resolve )
            when 'reject'
                @propagate( value, @onRejected, @resolver, @resolver.reject )
        return

    propagate: ( value, callback, resolver, resolverMethod ) ->
        if isFunction( callback )
            enqueue( ->
                try
                    resolver.resolve( callback( value ) )
                catch error
                    resolver.reject( error )
                return
            )
        else
            resolverMethod.call( resolver, value )
        return

class JResolver
    constructor: ->
        @promise = new JPromise( @ )
        @consequences = []
        @completed = false
        @completionAction = null
        @completionValue = null

    then: ( onFulfilled, onRejected ) ->
        consequence = new JConsequence( onFulfilled, onRejected )
        if @completed
            consequence.trigger( @completionAction, @completionValue )
        else
            @consequences.push( consequence )
        return consequence.promise

    resolve: ( value ) ->
        if @completed
            return
        try
            if value is @promise
                throw new TypeError( 'A JPromise cannot be resolved with itself.' )
            if ( isObject( value ) or isFunction( value ) ) and isFunction( thenFn = value.then )
                isHandled = false
                try
                    self = @
                    thenFn.call(
                        value
                        ( value ) ->
                            if not isHandled
                                isHandled = true
                                self.resolve( value )
                            return
                        ( error ) ->
                            if not isHandled
                                isHandled = true
                                self.reject( error )
                            return
                    )
                catch error
                    @reject( error ) if not isHandled
            else
                @complete( 'fulfill', value )
        catch error
            @reject( error )
        return

    reject: ( reason ) ->
        if @completed
            return
        @complete( 'reject', reason )
        return

    complete: ( action, value ) ->
        @completionAction = action
        @completionValue = value
        @completed = true
        for consequence in @consequences
            consequence.trigger( @completionAction, @completionValue )
        @consequences = null
        return

class JPromise
    constructor: ( resolver ) ->
        @then = ( onFulfilled, onRejected ) -> resolver.then( onFulfilled, onRejected )

class JDeferred
    constructor: ->
        resolver = new JResolver()

        @promise = resolver.promise
        @resolve = ( value ) -> resolver.resolve( value )
        @reject = ( reason ) -> resolver.reject( reason )

    @resolve: ( value ) ->
        deferred = new JDeferred()
        deferred.resolve( value )
        return deferred.promise

    @reject: ( reason ) ->
        deferred = new JDeferred()
        deferred.reject( reason )
        return deferred.promise

#target = exports ? window
#target.JDeferred = JDeferred
#target.defer = -> new JDeferred()
