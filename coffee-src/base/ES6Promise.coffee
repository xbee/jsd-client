###*
Multiline Documentation
###

#!
# * @overview es6-promise - a tiny implementation of Promises/A+.
# * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
# * @license   Licensed under MIT license
# *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
# * @version   2.0.0
#
"use strict"


$$utils$$objectOrFunction = (x) ->
    typeof x is "function" or (typeof x is "object" and x isnt null)
$$utils$$isFunction = (x) ->
    typeof x is "function"
$$utils$$isMaybeThenable = (x) ->
    typeof x is "object" and x isnt null
$$utils$$F = ->

# If len is 1, that means that we need to schedule an async flush.
# If additional callbacks are queued before the queue is flushed, they
# will be processed by this flush that we are scheduling.

# test for web worker but not in IE10

# node
$$asap$$useNextTick = ->
    ->
        process.nextTick $$asap$$flush
        return
$$asap$$useMutationObserver = ->
    iterations = 0
    observer = new $$asap$$BrowserMutationObserver($$asap$$flush)
    node = document.createTextNode("")
    observer.observe node,
        characterData: true

    ->
        node.data = (iterations = ++iterations % 2)
        return

# web worker
$$asap$$useMessageChannel = ->
    channel = new MessageChannel()
    channel.port1.onmessage = $$asap$$flush
    ->
        channel.port2.postMessage 0
        return
$$asap$$useSetTimeout = ->
    ->
        setTimeout $$asap$$flush, 1
        return
$$asap$$flush = ->
    i = 0

    while i < $$asap$$len
        callback = $$asap$$queue[i]
        arg = $$asap$$queue[i + 1]
        callback arg
        $$asap$$queue[i] = `undefined`
        $$asap$$queue[i + 1] = `undefined`
        i += 2
    $$asap$$len = 0
    return

# Decide what async method to use to triggering processing of queued callbacks:
$$$internal$$noop = ->
$$$internal$$selfFullfillment = ->
    new TypeError("You cannot resolve a promise with itself")
$$$internal$$cannotReturnOwn = ->
    new TypeError("A promises callback cannot return that same promise.")
$$$internal$$getThen = (promise) ->
    try
        return promise.then
    catch error
        $$$internal$$GET_THEN_ERROR.error = error
        return $$$internal$$GET_THEN_ERROR
    return
$$$internal$$tryThen = (then_, value, fulfillmentHandler, rejectionHandler) ->
    try
        then_.call value, fulfillmentHandler, rejectionHandler
    catch e
        return e
    return
$$$internal$$handleForeignThenable = (promise, thenable, then_) ->
    $$asap$$default ((promise) ->
        sealed = false
        error = $$$internal$$tryThen(then_, thenable, (value) ->
            return  if sealed
            sealed = true
            if thenable isnt value
                $$$internal$$resolve promise, value
            else
                $$$internal$$fulfill promise, value
            return
        , (reason) ->
            return  if sealed
            sealed = true
            $$$internal$$reject promise, reason
            return
        , "Settle: " + (promise._label or " unknown promise"))
        if not sealed and error
            sealed = true
            $$$internal$$reject promise, error
        return
    ), promise
    return

$$$internal$$handleOwnThenable = (promise, thenable) ->
    if thenable._state is $$$internal$$FULFILLED
        $$$internal$$fulfill promise, thenable._result
    else if promise._state is $$$internal$$REJECTED
        $$$internal$$reject promise, thenable._result
    else
        $$$internal$$subscribe thenable, `undefined`, ((value) ->
            $$$internal$$resolve promise, value
            return
        ), (reason) ->
            $$$internal$$reject promise, reason
            return
    return

$$$internal$$handleMaybeThenable = (promise, maybeThenable) ->
    if maybeThenable.constructor is promise.constructor
        $$$internal$$handleOwnThenable promise, maybeThenable
    else
        then_ = $$$internal$$getThen(maybeThenable)
        if then_ is $$$internal$$GET_THEN_ERROR
            $$$internal$$reject promise, $$$internal$$GET_THEN_ERROR.error
        else if then_ is `undefined`
            $$$internal$$fulfill promise, maybeThenable
        else if $$utils$$isFunction(then_)
            $$$internal$$handleForeignThenable promise, maybeThenable, then_
        else
            $$$internal$$fulfill promise, maybeThenable
    return

$$$internal$$resolve = (promise, value) ->
    if promise is value
        $$$internal$$reject promise, $$$internal$$selfFullfillment()
    else if $$utils$$objectOrFunction(value)
        $$$internal$$handleMaybeThenable promise, value
    else
        $$$internal$$fulfill promise, value
    return
$$$internal$$publishRejection = (promise) ->
    promise._onerror promise._result  if promise._onerror
    $$$internal$$publish promise
    return
$$$internal$$fulfill = (promise, value) ->
    return  if promise._state isnt $$$internal$$PENDING
    promise._result = value
    promise._state = $$$internal$$FULFILLED
    $$asap$$default $$$internal$$publish, promise  if promise._subscribers.length isnt 0
    return
$$$internal$$reject = (promise, reason) ->
    return  if promise._state isnt $$$internal$$PENDING
    promise._state = $$$internal$$REJECTED
    promise._result = reason
    $$asap$$default $$$internal$$publishRejection, promise
    return
$$$internal$$subscribe = (parent, child, onFulfillment, onRejection) ->
    subscribers = parent._subscribers
    length = subscribers.length
    parent._onerror = null
    subscribers[length] = child
    subscribers[length + $$$internal$$FULFILLED] = onFulfillment
    subscribers[length + $$$internal$$REJECTED] = onRejection
    $$asap$$default $$$internal$$publish, parent  if length is 0 and parent._state
    return
$$$internal$$publish = (promise) ->
    subscribers = promise._subscribers
    settled = promise._state
    return  if subscribers.length is 0
    child = undefined
    callback = undefined
    detail = promise._result
    i = 0

    while i < subscribers.length
        child = subscribers[i]
        callback = subscribers[i + settled]
        if child
            $$$internal$$invokeCallback settled, child, callback, detail
        else
            callback detail
        i += 3
    promise._subscribers.length = 0
    return

$$$internal$$ErrorObject = ->
    @error = null
    return
$$$internal$$tryCatch = (callback, detail) ->
    try
        return callback(detail)
    catch e
        $$$internal$$TRY_CATCH_ERROR.error = e
        return $$$internal$$TRY_CATCH_ERROR
    return

$$$internal$$invokeCallback = (settled, promise, callback, detail) ->
    hasCallback = $$utils$$isFunction(callback)
    value = undefined
    error = undefined
    succeeded = undefined
    failed = undefined
    if hasCallback
        value = $$$internal$$tryCatch(callback, detail)
        if value is $$$internal$$TRY_CATCH_ERROR
            failed = true
            error = value.error
            value = null
        else
            succeeded = true
        if promise is value
            $$$internal$$reject promise, $$$internal$$cannotReturnOwn()
            return
    else
        value = detail
        succeeded = true
    if promise._state isnt $$$internal$$PENDING

        # $$$internal$$noop
        $$$internal$$noop
    else if hasCallback and succeeded
        $$$internal$$resolve promise, value
    else if failed
        $$$internal$$reject promise, error
    else if settled is $$$internal$$FULFILLED
        $$$internal$$fulfill promise, value
    else $$$internal$$reject promise, value  if settled is $$$internal$$REJECTED
    return

$$$internal$$initializePromise = (promise, resolver) ->
    try
        resolver (resolvePromise = (value) ->
            $$$internal$$resolve promise, value
            return
        ), rejectPromise = (reason) ->
            $$$internal$$reject promise, reason
            return
    catch e
        $$$internal$$reject promise, e
    return

$$$enumerator$$makeSettledResult = (state, position, value) ->
    if state is $$$internal$$FULFILLED
        state: "fulfilled"
        value: value
    else
        state: "rejected"
        reason: value
$$$enumerator$$Enumerator = (Constructor, input, abortOnReject, label) ->
    @_instanceConstructor = Constructor
    @promise = new Constructor($$$internal$$noop, label)
    @_abortOnReject = abortOnReject
    if @_validateInput(input)
        @_input = input
        @length = input.length
        @_remaining = input.length
        @_init()
        if @length is 0
            $$$internal$$fulfill @promise, @_result
        else
            @length = @length or 0
            @_enumerate()
            $$$internal$$fulfill @promise, @_result  if @_remaining is 0
    else
        $$$internal$$reject @promise, @_validationError()
    return
# abort on reject

#jshint validthis:true

#jshint validthis:true

#jshint validthis:true
$$es6$promise$promise$$needsResolver = ->
    throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")
    return
$$es6$promise$promise$$needsNew = ->
    throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")
    return

###*
Promise objects represent the eventual result of an asynchronous operation. The
primary way of interacting with a promise is through its `then` method, which
registers callbacks to receive either a promise鈥檚 eventual value or the reason
why the promise cannot be fulfilled.

Terminology
-----------

- `promise` is an object or function with a `then` method whose behavior conforms to this specification.
- `thenable` is an object or function that defines a `then` method.
- `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
- `exception` is a value that is thrown using the throw statement.
- `reason` is a value that indicates why a promise was rejected.
- `settled` the final resting state of a promise, fulfilled or rejected.

A promise can be in one of three states: pending, fulfilled, or rejected.

Promises that are fulfilled have a fulfillment value and are in the fulfilled
state.  Promises that are rejected have a rejection reason and are in the
rejected state.  A fulfillment value is never a thenable.

Promises can also be said to *resolve* a value.  If this value is also a
promise, then the original promise's settled state will match the value's
settled state.  So a promise that *resolves* a promise that rejects will
itself reject, and a promise that *resolves* a promise that fulfills will
itself fulfill.


Basic Usage:
------------

```js
var promise = new Promise(function(resolve, reject) {
// on success
resolve(value);

// on failure
reject(reason);
});

promise.then(function(value) {
// on fulfillment
}, function(reason) {
// on rejection
});
```

Advanced Usage:
---------------

Promises shine when abstracting away asynchronous interactions such as
`XMLHttpRequest`s.

```js
function getJSON(url) {
return new Promise(function(resolve, reject){
var xhr = new XMLHttpRequest();

xhr.open('GET', url);
xhr.onreadystatechange = handler;
xhr.responseType = 'json';
xhr.setRequestHeader('Accept', 'application/json');
xhr.send();

function handler() {
if (this.readyState === this.DONE) {
if (this.status === 200) {
resolve(this.response);
} else {
reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
}
}
};
});
}

getJSON('/posts.json').then(function(json) {
// on fulfillment
}, function(reason) {
// on rejection
});
```

Unlike callbacks, promises are great composable primitives.

```js
Promise.all([
getJSON('/posts'),
getJSON('/comments')
]).then(function(values){
values[0] // => postsJSON
values[1] // => commentsJSON

return values;
});
```

@class Promise
@param {function} resolver
Useful for tooling.
@constructor
###
$$es6$promise$promise$$Promise = (resolver) ->
    @_id = $$es6$promise$promise$$counter++
    @_state = `undefined`
    @_result = `undefined`
    @_subscribers = []
    if $$$internal$$noop isnt resolver
        $$es6$promise$promise$$needsResolver()  unless $$utils$$isFunction(resolver)
        $$es6$promise$promise$$needsNew()  unless this instanceof $$es6$promise$promise$$Promise
        $$$internal$$initializePromise this, resolver
    return

$$utils$$_isArray = undefined
unless Array.isArray
    $$utils$$_isArray = (x) ->
        Object::toString.call(x) is "[object Array]"
else
    $$utils$$_isArray = Array.isArray
$$utils$$isArray = $$utils$$_isArray
$$utils$$now = Date.now or ->
        new Date().getTime()

$$utils$$o_create = (Object.create or (o) ->
    throw new Error("Second argument not supported")  if arguments.length > 1
    throw new TypeError("Argument must be an object")  if typeof o isnt "object"
    $$utils$$F:: = o
    new $$utils$$F()
)
$$asap$$len = 0
$$asap$$default = asap = (callback, arg) ->
    $$asap$$queue[$$asap$$len] = callback
    $$asap$$queue[$$asap$$len + 1] = arg
    $$asap$$len += 2
    $$asap$$scheduleFlush()  if $$asap$$len is 2
    return

$$asap$$browserGlobal = (if (typeof window isnt "undefined") then window else {})
$$asap$$BrowserMutationObserver = $$asap$$browserGlobal.MutationObserver or $$asap$$browserGlobal.WebKitMutationObserver
$$asap$$isWorker = typeof Uint8ClampedArray isnt "undefined" and typeof importScripts isnt "undefined" and typeof MessageChannel isnt "undefined"
$$asap$$queue = new Array(1000)
$$asap$$scheduleFlush = undefined
if typeof process isnt "undefined" and {}.toString.call(process) is "[object process]"
    $$asap$$scheduleFlush = $$asap$$useNextTick()
else if $$asap$$BrowserMutationObserver
    $$asap$$scheduleFlush = $$asap$$useMutationObserver()
else if $$asap$$isWorker
    $$asap$$scheduleFlush = $$asap$$useMessageChannel()
else
    $$asap$$scheduleFlush = $$asap$$useSetTimeout()
$$$internal$$PENDING = undefined
$$$internal$$FULFILLED = 1
$$$internal$$REJECTED = 2
$$$internal$$GET_THEN_ERROR = new $$$internal$$ErrorObject()
$$$internal$$TRY_CATCH_ERROR = new $$$internal$$ErrorObject()
$$$enumerator$$Enumerator::_validateInput = (input) ->
    $$utils$$isArray input

$$$enumerator$$Enumerator::_validationError = ->
    new Error("Array Methods must be provided an Array")

$$$enumerator$$Enumerator::_init = ->
    @_result = new Array(@length)
    return

$$$enumerator$$default = $$$enumerator$$Enumerator
$$$enumerator$$Enumerator::_enumerate = ->
    length = @length
    promise = @promise
    input = @_input
    i = 0

    while promise._state is $$$internal$$PENDING and i < length
        @_eachEntry input[i], i
        i++
    return

$$$enumerator$$Enumerator::_eachEntry = (entry, i) ->
    c = @_instanceConstructor
    if $$utils$$isMaybeThenable(entry)
        if entry.constructor is c and entry._state isnt $$$internal$$PENDING
            entry._onerror = null
            @_settledAt entry._state, i, entry._result
        else
            @_willSettleAt c.resolve(entry), i
    else
        @_remaining--
        @_result[i] = @_makeResult($$$internal$$FULFILLED, i, entry)
    return

$$$enumerator$$Enumerator::_settledAt = (state, i, value) ->
    promise = @promise
    if promise._state is $$$internal$$PENDING
        @_remaining--
        if @_abortOnReject and state is $$$internal$$REJECTED
            $$$internal$$reject promise, value
        else
            @_result[i] = @_makeResult(state, i, value)
    $$$internal$$fulfill promise, @_result  if @_remaining is 0
    return

$$$enumerator$$Enumerator::_makeResult = (state, i, value) ->
    value

$$$enumerator$$Enumerator::_willSettleAt = (promise, i) ->
    enumerator = this
    $$$internal$$subscribe promise, `undefined`, ((value) ->
        enumerator._settledAt $$$internal$$FULFILLED, i, value
        return
    ), (reason) ->
        enumerator._settledAt $$$internal$$REJECTED, i, reason
        return

    return

$$promise$all$$default = all = (entries, label) ->
    new $$$enumerator$$default(this, entries, true, label).promise

$$promise$race$$default = race = (entries, label) ->
    onFulfillment = (value) ->
        $$$internal$$resolve promise, value
        return
    onRejection = (reason) ->
        $$$internal$$reject promise, reason
        return
    Constructor = this
    promise = new Constructor($$$internal$$noop, label)
    unless $$utils$$isArray(entries)
        $$$internal$$reject promise, new TypeError("You must pass an array to race.")
        return promise
    length = entries.length
    i = 0

    while promise._state is $$$internal$$PENDING and i < length
        $$$internal$$subscribe Constructor.resolve(entries[i]), `undefined`, onFulfillment, onRejection
        i++
    promise

$$promise$resolve$$default = resolve = (object, label) ->
    Constructor = this
    return object  if object and typeof object is "object" and object.constructor is Constructor
    promise = new Constructor($$$internal$$noop, label)
    $$$internal$$resolve promise, object
    promise

$$promise$reject$$default = reject = (reason, label) ->
    Constructor = this
    promise = new Constructor($$$internal$$noop, label)
    $$$internal$$reject promise, reason
    promise

$$es6$promise$promise$$counter = 0
$$es6$promise$promise$$default = $$es6$promise$promise$$Promise
$$es6$promise$promise$$Promise.all = $$promise$all$$default
$$es6$promise$promise$$Promise.race = $$promise$race$$default
$$es6$promise$promise$$Promise.resolve = $$promise$resolve$$default
$$es6$promise$promise$$Promise.reject = $$promise$reject$$default
$$es6$promise$promise$$Promise:: =
    constructor: $$es6$promise$promise$$Promise

    ###*
The primary way of interacting with a promise is through its `then` method,
which registers callbacks to receive either a promise's eventual value or the
reason why the promise cannot be fulfilled.

```js
findUser().then(function(user){
// user is available
}, function(reason){
// user is unavailable, and you are given the reason why
});
```

Chaining
--------

The return value of `then` is itself a promise.  This second, 'downstream'
promise is resolved with the return value of the first promise's fulfillment
or rejection handler, or rejected if the handler throws an exception.

```js
findUser().then(function (user) {
return user.name;
}, function (reason) {
return 'default name';
}).then(function (userName) {
// If `findUser` fulfilled, `userName` will be the user's name, otherwise it
// will be `'default name'`
});

findUser().then(function (user) {
throw new Error('Found user, but still unhappy');
}, function (reason) {
throw new Error('`findUser` rejected and we're unhappy');
}).then(function (value) {
// never reached
}, function (reason) {
// if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
// If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
});
```
If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

```js
findUser().then(function (user) {
throw new PedagogicalException('Upstream error');
}).then(function (value) {
// never reached
}).then(function (value) {
// never reached
}, function (reason) {
// The `PedgagocialException` is propagated all the way down to here
});
```

Assimilation
------------

Sometimes the value you want to propagate to a downstream promise can only be
retrieved asynchronously. This can be achieved by returning a promise in the
fulfillment or rejection handler. The downstream promise will then be pending
until the returned promise is settled. This is called *assimilation*.

```js
findUser().then(function (user) {
return findCommentsByAuthor(user);
}).then(function (comments) {
// The user's comments are now available
});
```

If the assimliated promise rejects, then the downstream promise will also reject.

```js
findUser().then(function (user) {
return findCommentsByAuthor(user);
}).then(function (comments) {
// If `findCommentsByAuthor` fulfills, we'll have the value here
}, function (reason) {
// If `findCommentsByAuthor` rejects, we'll have the reason here
});
```

Simple Example
--------------

Synchronous Example

```javascript
var result;

try {
result = findResult();
// success
} catch(reason) {
// failure
}
```

Errback Example

```js
findResult(function(result, err){
if (err) {
// failure
} else {
// success
}
});
```

Promise Example;

```javascript
findResult().then(function(result){
// success
}, function(reason){
// failure
});
```

Advanced Example
--------------

Synchronous Example

```javascript
var author, books;

try {
author = findAuthor();
books  = findBooksByAuthor(author);
// success
} catch(reason) {
// failure
}
```

Errback Example

```js

function foundBooks(books) {

}

function failure(reason) {

}

findAuthor(function(author, err){
if (err) {
failure(err);
// failure
} else {
try {
findBoooksByAuthor(author, function(books, err) {
if (err) {
failure(err);
} else {
try {
foundBooks(books);
} catch(reason) {
failure(reason);
}
}
});
} catch(error) {
failure(err);
}
// success
}
});
```

Promise Example;

```javascript
findAuthor().
then(findBooksByAuthor).
then(function(books){
// found books
}).catch(function(reason){
// something went wrong
});
```

@method then
@param {Function} onFulfilled
@param {Function} onRejected
Useful for tooling.
@return {Promise}
    ###
    then: (onFulfillment, onRejection) ->
        parent = this
        state = parent._state
        return this  if state is $$$internal$$FULFILLED and not onFulfillment or state is $$$internal$$REJECTED and not onRejection
        child = new @constructor $$$internal$$noop
        result = parent._result
        if state
            callback = arguments[state - 1]
            $$asap$$default ->
                $$$internal$$invokeCallback state, child, callback, result
                return
        else
            $$$internal$$subscribe parent, child, onFulfillment, onRejection

        child


    ###*
`catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
as the catch block of a try/catch statement.

```js
function findAuthor(){
throw new Error('couldn't find that author');
}

// synchronous
try {
findAuthor();
} catch(reason) {
// something went wrong
}

// async with promises
findAuthor().catch(function(reason){
// something went wrong
});
```

@method catch
@param {Function} onRejection
Useful for tooling.
@return {Promise}
    ###
    catch: (onRejection) ->
        @then null, onRejection

$$es6$promise$polyfill$$default = polyfill = ->
    local = undefined
    if typeof global isnt "undefined"
        local = global
    else if typeof window isnt "undefined" and window.document
        local = window
    else
        local = self

    # Some of these methods are missing from
    # Firefox/Chrome experimental implementations

    # Older version of the spec had a resolver object
    # as the arg rather than a function
    es6PromiseSupport = "Promise" of local and "resolve" of local.Promise and "reject" of local.Promise and "all" of local.Promise and "race" of local.Promise and (do () ->
            resolve = undefined
            new local.Promise((r) ->
                resolve = r
                return
            )
            $$utils$$isFunction resolve
    )
    local.Promise = $$es6$promise$promise$$default  unless es6PromiseSupport
    return

ES6Promise =
    Promise: $$es6$promise$promise$$default
    polyfill: $$es6$promise$polyfill$$default

# support AMD
if define?.amd?
    define -> ES6Promise

# support the browser
else if window?
    window.ES6Promise ?= ES6Promise

# support commonJS
else if module?.exports?
    module.exports = ES6Promise
