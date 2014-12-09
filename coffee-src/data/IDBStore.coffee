#global window:false, self:false, define:false, module:false

###*
@license IDBWrapper - A cross-browser wrapper for IndexedDB
Copyright (c) 2011 - 2013 Jens Arps
http://jensarps.de/

Licensed under the MIT (X11) license
###
"use strict"
defaultErrorHandler = (error) ->
    throw error
    return

defaults =
    storeName: "Store"
    storePrefix: "IDBWrapper-"
    dbVersion: 1
    keyPath: "id"
    autoIncrement: true
    onStoreReady: ->

    onError: defaultErrorHandler
    indexes: []


###*
The IDBStore constructor

@constructor
@name IDBStore
@version 1.4.1

@param {Object} [kwArgs] An options object used to configure the store and
set callbacks
@param {String} [kwArgs.storeName='Store'] The name of the store
@param {String} [kwArgs.storePrefix='IDBWrapper-'] A prefix that is
internally used to construct the name of the database, which will be
kwArgs.storePrefix + kwArgs.storeName
@param {Number} [kwArgs.dbVersion=1] The version of the store
@param {String} [kwArgs.keyPath='id'] The key path to use. If you want to
setup IDBWrapper to work with out-of-line keys, you need to set this to
`null`
@param {Boolean} [kwArgs.autoIncrement=true] If set to true, IDBStore will
automatically make sure a unique keyPath value is present on each object
that is stored.
@param {Function} [kwArgs.onStoreReady] A callback to be called when the
store is ready to be used.
@param {Function} [kwArgs.onError=throw] A callback to be called when an
error occurred during instantiation of the store.
@param {Array} [kwArgs.indexes=[]] An array of indexData objects
defining the indexes to use with the store. For every index to be used
one indexData object needs to be passed in the array.
An indexData object is defined as follows:
@param {Object} [kwArgs.indexes.indexData] An object defining the index to
use
@param {String} kwArgs.indexes.indexData.name The name of the index
@param {String} [kwArgs.indexes.indexData.keyPath] The key path of the index
@param {Boolean} [kwArgs.indexes.indexData.unique] Whether the index is unique
@param {Boolean} [kwArgs.indexes.indexData.multiEntry] Whether the index is multi entry
@param {Function} [onStoreReady] A callback to be called when the store
is ready to be used.
@example
// create a store for customers with an additional index over the
// `lastname` property.
var myCustomerStore = new IDBStore({
dbVersion: 1,
storeName: 'customer-index',
keyPath: 'customerid',
autoIncrement: true,
onStoreReady: populateTable,
indexes: [
{ name: 'lastname', keyPath: 'lastname', unique: false, multiEntry: false }
]
});
@example
// create a generic store
var myCustomerStore = new IDBStore({
storeName: 'my-data-store',
onStoreReady: function(){
// start working with the store.
}
});
###

class IDBStore

    ###*
    A pointer to the IDBStore ctor

    @type IDBStore
    ###
    constructor: (kwArgs, onStoreReady) ->
        onStoreReady = kwArgs  if typeof onStoreReady is "undefined" and typeof kwArgs is "function"
        kwArgs = {}  unless Object::toString.call(kwArgs) is "[object Object]"
        for key of defaults
            this[key] = (if typeof kwArgs[key] isnt "undefined" then kwArgs[key] else defaults[key])
        @dbName = @storePrefix + @storeName
        @dbVersion = parseInt(@dbVersion, 10) or 1
        onStoreReady and (@onStoreReady = onStoreReady)
        env = (if typeof window is "object" then window else self)
        @idb = env.indexedDB or env.webkitIndexedDB or env.mozIndexedDB
        @keyRange = env.IDBKeyRange or env.webkitIDBKeyRange or env.mozIDBKeyRange
        @features = hasAutoIncrement: not env.mozIndexedDB
        @consts =
            READ_ONLY: "readonly"
            READ_WRITE: "readwrite"
            VERSION_CHANGE: "versionchange"
            NEXT: "next"
            NEXT_NO_DUPLICATE: "nextunique"
            PREV: "prev"
            PREV_NO_DUPLICATE: "prevunique"

        @openDB()
        return

    ###*
    The version of IDBStore

    @type String
    ###
    @version: "1.4.1"

    ###*
    A reference to the IndexedDB object

    @type Object
    ###
    db: null

    ###*
    The full name of the IndexedDB used by IDBStore, composed of
    this.storePrefix + this.storeName

    @type String
    ###
    dbName: null

    ###*
    The version of the IndexedDB used by IDBStore

    @type Number
    ###
    dbVersion: null

    ###*
    A reference to the objectStore used by IDBStore

    @type Object
    ###
    store: null

    ###*
    The store name

    @type String
    ###
    storeName: null

    ###*
    The key path

    @type String
    ###
    keyPath: null

    ###*
    Whether IDBStore uses autoIncrement

    @type Boolean
    ###
    autoIncrement: null

    ###*
    The indexes used by IDBStore

    @type Array
    ###
    indexes: null

    ###*
    A hashmap of features of the used IDB implementation

    @type Object
    @proprty {Boolean} autoIncrement If the implementation supports
    native auto increment
    ###
    features: null

    ###*
    The callback to be called when the store is ready to be used

    @type Function
    ###
    onStoreReady: null

    ###*
    The callback to be called if an error occurred during instantiation
    of the store

    @type Function
    ###
    onError: null

    ###*
    The internal insertID counter

    @type Number
    @private
    ###
    _insertIdCount: 0

    ###*
    Opens an IndexedDB; called by the constructor.

    Will check if versions match and compare provided index configuration
    with existing ones, and update indexes if necessary.

    Will call this.onStoreReady() if everything went well and the store
    is ready to use, and this.onError() is something went wrong.

    @private
    ###
    openDB: ->
        openRequest = @idb.open(@dbName, @dbVersion)
        preventSuccessCallback = false
        openRequest.onerror = (error) =>
            gotVersionErr = false
            if "error" of error.target
                gotVersionErr = error.target.error.name is "VersionError"
            else gotVersionErr = error.target.errorCode is 12  if "errorCode" of error.target
            if gotVersionErr
                @onError new Error("The version number provided is lower than the existing one.")
            else
                @onError error
            return


        # We should never ever get here.
        # Lets notify the user anyway.

        # check indexes

        # check if it complies
        openRequest.onsuccess = ((event) =>
            return  if preventSuccessCallback
            if @db
                @onStoreReady()
                return
            @db = event.target.result
            if typeof @db.version is "string"
                @onError new Error("The IndexedDB implementation in this browser is outdated. Please upgrade your browser.")
                return
            unless @db.objectStoreNames.contains(@storeName)
                @onError new Error("Something is wrong with the IndexedDB implementation in this browser. Please upgrade your browser.")
                return
            emptyTransaction = @db.transaction([@storeName], @consts.READ_ONLY)
            @store = emptyTransaction.objectStore(@storeName)
            existingIndexes = Array::slice.call(@getIndexList())
            @indexes.forEach ((indexData) ->
                indexName = indexData.name
                unless indexName
                    preventSuccessCallback = true
                    @onError new Error("Cannot create index: No index name given.")
                    return
                @normalizeIndexData indexData
                if @hasIndex(indexName)
                    actualIndex = @store.index(indexName)
                    complies = @indexComplies(actualIndex, indexData)
                    unless complies
                        preventSuccessCallback = true
                        @onError new Error("Cannot modify index \"" + indexName + "\" for current version. Please bump version number to " + (@dbVersion + 1) + ".")
                    existingIndexes.splice existingIndexes.indexOf(indexName), 1
                else
                    preventSuccessCallback = true
                    @onError new Error("Cannot create new index \"" + indexName + "\" for current version. Please bump version number to " + (@dbVersion + 1) + ".")
                return
            ), this
            if existingIndexes.length
                preventSuccessCallback = true
                @onError new Error("Cannot delete index(es) \"" + existingIndexes.toString() + "\" for current version. Please bump version number to " + (@dbVersion + 1) + ".")
            preventSuccessCallback or @onStoreReady()
            return
        )

        # IDBVersionChangeEvent

        # check if it complies

        # index differs, need to delete and re-create
        openRequest.onupgradeneeded = ((event) =>
            @db = event.target.result
            if @db.objectStoreNames.contains(@storeName)
                @store = event.target.transaction.objectStore(@storeName)
            else
                optionalParameters = autoIncrement: @autoIncrement
                optionalParameters.keyPath = @keyPath  if @keyPath isnt null
                @store = @db.createObjectStore(@storeName, optionalParameters)
            existingIndexes = Array::slice.call(@getIndexList())
            @indexes.forEach ((indexData) ->
                indexName = indexData.name
                unless indexName
                    preventSuccessCallback = true
                    @onError new Error("Cannot create index: No index name given.")
                @normalizeIndexData indexData
                if @hasIndex(indexName)
                    actualIndex = @store.index(indexName)
                    complies = @indexComplies(actualIndex, indexData)
                    unless complies
                        @store.deleteIndex indexName
                        @store.createIndex indexName, indexData.keyPath,
                            unique: indexData.unique
                            multiEntry: indexData.multiEntry

                    existingIndexes.splice existingIndexes.indexOf(indexName), 1
                else
                    @store.createIndex indexName, indexData.keyPath,
                        unique: indexData.unique
                        multiEntry: indexData.multiEntry

                return
            ), this
            if existingIndexes.length
                existingIndexes.forEach ((_indexName) ->
                    @store.deleteIndex _indexName
                    return
                ), this
            return
        )
        return


    ###*
    Deletes the database used for this store if the IDB implementations
    provides that functionality.
    ###
    deleteDatabase: ->
        @idb.deleteDatabase @dbName  if @idb.deleteDatabase
        return


    ###*
    data manipulation *
    ###

    ###*
    Puts an object into the store. If an entry with the given id exists,
    it will be overwritten. This method has a different signature for inline
    keys and out-of-line keys; please see the examples below.

    @param {*} [key] The key to store. This is only needed if IDBWrapper
    is set to use out-of-line keys. For inline keys - the default scenario -
    this can be omitted.
    @param {Object} value The data object to store.
    @param {Function} [onSuccess] A callback that is called if insertion
    was successful.
    @param {Function} [onError] A callback that is called if insertion
    failed.
    @returns {IDBTransaction} The transaction used for this operation.
    @example
    // Storing an object, using inline keys (the default scenario):
    var myCustomer = {
    customerid: 2346223,
    lastname: 'Doe',
    firstname: 'John'
    };
    myCustomerStore.put(myCustomer, mySuccessHandler, myErrorHandler);
    // Note that passing success- and error-handlers is optional.
    @example
    // Storing an object, using out-of-line keys:
    var myCustomer = {
    lastname: 'Doe',
    firstname: 'John'
    };
    myCustomerStore.put(2346223, myCustomer, mySuccessHandler, myErrorHandler);
    // Note that passing success- and error-handlers is optional.
    ###
    put: (key, value, onSuccess, onError) ->
        if @keyPath isnt null
            onError = onSuccess
            onSuccess = value
            value = key
        onError or (onError = defaultErrorHandler)
        onSuccess or (onSuccess = noop)
        hasSuccess = false
        result = null
        putRequest = undefined
        putTransaction = @db.transaction([@storeName], @consts.READ_WRITE)
        putTransaction.oncomplete = ->
            callback = (if hasSuccess then onSuccess else onError)
            callback result
            return

        putTransaction.onabort = onError
        putTransaction.onerror = onError
        if @keyPath isnt null # in-line keys
            @_addIdPropertyIfNeeded value
            putRequest = putTransaction.objectStore(@storeName).put(value)
        else # out-of-line keys
            putRequest = putTransaction.objectStore(@storeName).put(value, key)
        putRequest.onsuccess = (event) ->
            hasSuccess = true
            result = event.target.result
            return

        putRequest.onerror = onError
        putTransaction


    ###*
    Retrieves an object from the store. If no entry exists with the given id,
    the success handler will be called with null as first and only argument.

    @param {*} key The id of the object to fetch.
    @param {Function} [onSuccess] A callback that is called if fetching
    was successful. Will receive the object as only argument.
    @param {Function} [onError] A callback that will be called if an error
    occurred during the operation.
    @returns {IDBTransaction} The transaction used for this operation.
    ###
    get: (key, onSuccess, onError) ->
        onError or (onError = defaultErrorHandler)
        onSuccess or (onSuccess = noop)
        hasSuccess = false
        result = null
        getTransaction = @db.transaction([@storeName], @consts.READ_ONLY)
        getTransaction.oncomplete = ->
            callback = (if hasSuccess then onSuccess else onError)
            callback result
            return

        getTransaction.onabort = onError
        getTransaction.onerror = onError
        getRequest = getTransaction.objectStore(@storeName).get(key)
        getRequest.onsuccess = (event) ->
            hasSuccess = true
            result = event.target.result
            return

        getRequest.onerror = onError
        getTransaction


    ###*
    Removes an object from the store.

    @param {*} key The id of the object to remove.
    @param {Function} [onSuccess] A callback that is called if the removal
    was successful.
    @param {Function} [onError] A callback that will be called if an error
    occurred during the operation.
    @returns {IDBTransaction} The transaction used for this operation.
    ###
    remove: (key, onSuccess, onError) ->
        onError or (onError = defaultErrorHandler)
        onSuccess or (onSuccess = noop)
        hasSuccess = false
        result = null
        removeTransaction = @db.transaction([@storeName], @consts.READ_WRITE)
        removeTransaction.oncomplete = ->
            callback = (if hasSuccess then onSuccess else onError)
            callback result
            return

        removeTransaction.onabort = onError
        removeTransaction.onerror = onError
        deleteRequest = removeTransaction.objectStore(@storeName)["delete"](key)
        deleteRequest.onsuccess = (event) ->
            hasSuccess = true
            result = event.target.result
            return

        deleteRequest.onerror = onError
        removeTransaction


    ###*
    Runs a batch of put and/or remove operations on the store.

    @param {Array} dataArray An array of objects containing the operation to run
    and the data object (for put operations).
    @param {Function} [onSuccess] A callback that is called if all operations
    were successful.
    @param {Function} [onError] A callback that is called if an error
    occurred during one of the operations.
    @returns {IDBTransaction} The transaction used for this operation.
    ###
    batch: (dataArray, onSuccess, onError) ->
        onError or (onError = defaultErrorHandler)
        onSuccess or (onSuccess = noop)
        onError new Error("dataArray argument must be of type Array.")  unless Object::toString.call(dataArray) is "[object Array]"
        batchTransaction = @db.transaction([@storeName], @consts.READ_WRITE)
        batchTransaction.oncomplete = ->
            callback = (if hasSuccess then onSuccess else onError)
            callback hasSuccess
            return

        batchTransaction.onabort = onError
        batchTransaction.onerror = onError
        count = dataArray.length
        called = false
        hasSuccess = false
        onItemSuccess = ->
            count--
            if count is 0 and not called
                called = true
                hasSuccess = true
            return

        dataArray.forEach ((operation) ->
            type = operation.type
            key = operation.key
            value = operation.value
            onItemError = (err) ->
                batchTransaction.abort()
                unless called
                    called = true
                    onError err, type, key
                return

            if type is "remove"
                deleteRequest = batchTransaction.objectStore(@storeName)["delete"](key)
                deleteRequest.onsuccess = onItemSuccess
                deleteRequest.onerror = onItemError
            else if type is "put"
                putRequest = undefined
                if @keyPath isnt null # in-line keys
                    @_addIdPropertyIfNeeded value
                    putRequest = batchTransaction.objectStore(@storeName).put(value)
                else # out-of-line keys
                    putRequest = batchTransaction.objectStore(@storeName).put(value, key)
                putRequest.onsuccess = onItemSuccess
                putRequest.onerror = onItemError
            return
        ), this
        batchTransaction


    ###*
    Takes an array of objects and stores them in a single transaction.

    @param {Array} dataArray An array of objects to store
    @param {Function} [onSuccess] A callback that is called if all operations
    were successful.
    @param {Function} [onError] A callback that is called if an error
    occurred during one of the operations.
    @returns {IDBTransaction} The transaction used for this operation.
    ###
    putBatch: (dataArray, onSuccess, onError) ->
        batchData = dataArray.map((item) ->
            type: "put"
            value: item
        )
        @batch batchData, onSuccess, onError


    ###*
    Takes an array of keys and removes matching objects in a single
    transaction.

    @param {Array} keyArray An array of keys to remove
    @param {Function} [onSuccess] A callback that is called if all operations
    were successful.
    @param {Function} [onError] A callback that is called if an error
    occurred during one of the operations.
    @returns {IDBTransaction} The transaction used for this operation.
    ###
    removeBatch: (keyArray, onSuccess, onError) ->
        batchData = keyArray.map((key) ->
            type: "remove"
            key: key
        )
        @batch batchData, onSuccess, onError


    ###*
    Takes an array of keys and fetches matching objects

    @param {Array} keyArray An array of keys identifying the objects to fetch
    @param {Function} [onSuccess] A callback that is called if all operations
    were successful.
    @param {Function} [onError] A callback that is called if an error
    occurred during one of the operations.
    @param {String} [arrayType='sparse'] The type of array to pass to the
    success handler. May be one of 'sparse', 'dense' or 'skip'. Defaults to
    'sparse'. This parameter specifies how to handle the situation if a get
    operation did not throw an error, but there was no matching object in
    the database. In most cases, 'sparse' provides the most desired
    behavior. See the examples for details.
    @returns {IDBTransaction} The transaction used for this operation.
    @example
    // given that there are two objects in the database with the keypath
    // values 1 and 2, and the call looks like this:
    myStore.getBatch([1, 5, 2], onError, function (data) { … }, arrayType);

    // this is what the `data` array will be like:

    // arrayType == 'sparse':
    // data is a sparse array containing two entries and having a length of 3:
    [Object, 2: Object]
    0: Object
    2: Object
    length: 3
    __proto__: Array[0]
    // calling forEach on data will result in the callback being called two
    // times, with the index parameter matching the index of the key in the
    // keyArray.

    // arrayType == 'dense':
    // data is a dense array containing three entries and having a length of 3,
    // where data[1] is of type undefined:
    [Object, undefined, Object]
    0: Object
    1: undefined
    2: Object
    length: 3
    __proto__: Array[0]
    // calling forEach on data will result in the callback being called three
    // times, with the index parameter matching the index of the key in the
    // keyArray, but the second call will have undefined as first argument.

    // arrayType == 'skip':
    // data is a dense array containing two entries and having a length of 2:
    [Object, Object]
    0: Object
    1: Object
    length: 2
    __proto__: Array[0]
    // calling forEach on data will result in the callback being called two
    // times, with the index parameter not matching the index of the key in the
    // keyArray.
    ###
    getBatch: (keyArray, onSuccess, onError, arrayType) ->
        onError or (onError = defaultErrorHandler)
        onSuccess or (onSuccess = noop)
        arrayType or (arrayType = "sparse")
        onError new Error("keyArray argument must be of type Array.")  unless Object::toString.call(keyArray) is "[object Array]"
        batchTransaction = @db.transaction([@storeName], @consts.READ_ONLY)
        batchTransaction.oncomplete = ->
            callback = (if hasSuccess then onSuccess else onError)
            callback result
            return

        batchTransaction.onabort = onError
        batchTransaction.onerror = onError
        data = []
        count = keyArray.length
        called = false
        hasSuccess = false
        result = null
        onItemSuccess = (event) ->
            if event.target.result or arrayType is "dense"
                data.push event.target.result
            else data.length++  if arrayType is "sparse"
            count--
            if count is 0
                called = true
                hasSuccess = true
                result = data
            return

        keyArray.forEach ((key) ->
            onItemError = (err) ->
                called = true
                result = err
                onError err
                batchTransaction.abort()
                return

            getRequest = batchTransaction.objectStore(@storeName).get(key)
            getRequest.onsuccess = onItemSuccess
            getRequest.onerror = onItemError
            return
        ), this
        batchTransaction


    ###*
    Fetches all entries in the store.

    @param {Function} [onSuccess] A callback that is called if the operation
    was successful. Will receive an array of objects.
    @param {Function} [onError] A callback that will be called if an error
    occurred during the operation.
    @returns {IDBTransaction} The transaction used for this operation.
    ###
    getAll: (onSuccess, onError) ->
        onError or (onError = defaultErrorHandler)
        onSuccess or (onSuccess = noop)
        getAllTransaction = @db.transaction([@storeName], @consts.READ_ONLY)
        store = getAllTransaction.objectStore(@storeName)
        if store.getAll
            @_getAllNative getAllTransaction, store, onSuccess, onError
        else
            @_getAllCursor getAllTransaction, store, onSuccess, onError
        getAllTransaction


    ###*
    Implements getAll for IDB implementations that have a non-standard
    getAll() method.

    @param {Object} getAllTransaction An open READ transaction.
    @param {Object} store A reference to the store.
    @param {Function} onSuccess A callback that will be called if the
    operation was successful.
    @param {Function} onError A callback that will be called if an
    error occurred during the operation.
    @private
    ###
    _getAllNative: (getAllTransaction, store, onSuccess, onError) ->
        hasSuccess = false
        result = null
        getAllTransaction.oncomplete = ->
            callback = (if hasSuccess then onSuccess else onError)
            callback result
            return

        getAllTransaction.onabort = onError
        getAllTransaction.onerror = onError
        getAllRequest = store.getAll()
        getAllRequest.onsuccess = (event) ->
            hasSuccess = true
            result = event.target.result
            return

        getAllRequest.onerror = onError
        return


    ###*
    Implements getAll for IDB implementations that do not have a getAll()
    method.

    @param {Object} getAllTransaction An open READ transaction.
    @param {Object} store A reference to the store.
    @param {Function} onSuccess A callback that will be called if the
    operation was successful.
    @param {Function} onError A callback that will be called if an
    error occurred during the operation.
    @private
    ###
    _getAllCursor: (getAllTransaction, store, onSuccess, onError) ->
        all = []
        hasSuccess = false
        result = null
        getAllTransaction.oncomplete = ->
            callback = (if hasSuccess then onSuccess else onError)
            callback result
            return

        getAllTransaction.onabort = onError
        getAllTransaction.onerror = onError
        cursorRequest = store.openCursor()
        cursorRequest.onsuccess = (event) ->
            cursor = event.target.result
            if cursor
                all.push cursor.value
                cursor["continue"]()
            else
                hasSuccess = true
                result = all
            return

        cursorRequest.onError = onError
        return


    ###*
    Clears the store, i.e. deletes all entries in the store.

    @param {Function} [onSuccess] A callback that will be called if the
    operation was successful.
    @param {Function} [onError] A callback that will be called if an
    error occurred during the operation.
    @returns {IDBTransaction} The transaction used for this operation.
    ###
    clear: (onSuccess, onError) ->
        onError or (onError = defaultErrorHandler)
        onSuccess or (onSuccess = noop)
        hasSuccess = false
        result = null
        clearTransaction = @db.transaction([@storeName], @consts.READ_WRITE)
        clearTransaction.oncomplete = ->
            callback = (if hasSuccess then onSuccess else onError)
            callback result
            return

        clearTransaction.onabort = onError
        clearTransaction.onerror = onError
        clearRequest = clearTransaction.objectStore(@storeName).clear()
        clearRequest.onsuccess = (event) ->
            hasSuccess = true
            result = event.target.result
            return

        clearRequest.onerror = onError
        clearTransaction


    ###*
    Checks if an id property needs to present on a object and adds one if
    necessary.

    @param {Object} dataObj The data object that is about to be stored
    @private
    ###
    _addIdPropertyIfNeeded: (dataObj) ->
        dataObj[@keyPath] = @_insertIdCount++ + Date.now()  if not @features.hasAutoIncrement and typeof dataObj[@keyPath] is "undefined"
        return


    ###*
    indexing *
    ###

    ###*
    Returns a DOMStringList of index names of the store.

    @return {DOMStringList} The list of index names
    ###
    getIndexList: ->
        @store.indexNames


    ###*
    Checks if an index with the given name exists in the store.

    @param {String} indexName The name of the index to look for
    @return {Boolean} Whether the store contains an index with the given name
    ###
    hasIndex: (indexName) ->
        @store.indexNames.contains indexName


    ###*
    Normalizes an object containing index data and assures that all
    properties are set.

    @param {Object} indexData The index data object to normalize
    @param {String} indexData.name The name of the index
    @param {String} [indexData.keyPath] The key path of the index
    @param {Boolean} [indexData.unique] Whether the index is unique
    @param {Boolean} [indexData.multiEntry] Whether the index is multi entry
    ###
    normalizeIndexData: (indexData) ->
        indexData.keyPath = indexData.keyPath or indexData.name
        indexData.unique = !!indexData.unique
        indexData.multiEntry = !!indexData.multiEntry
        return


    ###*
    Checks if an actual index complies with an expected index.

    @param {Object} actual The actual index found in the store
    @param {Object} expected An Object describing an expected index
    @return {Boolean} Whether both index definitions are identical
    ###
    indexComplies: (actual, expected) ->
        complies = [
            "keyPath"
            "unique"
            "multiEntry"
        ].every((key) ->

            # IE10 returns undefined for no multiEntry
            return true  if key is "multiEntry" and actual[key] is `undefined` and expected[key] is false

            # Compound keys
            if key is "keyPath" and Object::toString.call(expected[key]) is "[object Array]"
                exp = expected.keyPath
                act = actual.keyPath

                # IE10 can't handle keyPath sequences and stores them as a string.
                # The index will be unusable there, but let's still return true if
                # the keyPath sequence matches.
                return exp.toString() is act  if typeof act is "string"

                # Chrome/Opera stores keyPath squences as DOMStringList, Firefox
                # as Array
                return false  unless typeof act.contains is "function" or typeof act.indexOf is "function"
                return false  if act.length isnt exp.length
                i = 0
                m = exp.length

                while i < m
                    return false  unless (act.contains and act.contains(exp[i])) or act.indexOf(exp[i] isnt -1)
                    i++
                return true
            expected[key] is actual[key]
        )
        complies


    ###*
    cursor *
    ###

    ###*
    Iterates over the store using the given options and calling onItem
    for each entry matching the options.

    @param {Function} onItem A callback to be called for each match
    @param {Object} [options] An object defining specific options
    @param {Object} [options.index=null] An IDBIndex to operate on
    @param {String} [options.order=ASC] The order in which to provide the
    results, can be 'DESC' or 'ASC'
    @param {Boolean} [options.autoContinue=true] Whether to automatically
    iterate the cursor to the next result
    @param {Boolean} [options.filterDuplicates=false] Whether to exclude
    duplicate matches
    @param {Object} [options.keyRange=null] An IDBKeyRange to use
    @param {Boolean} [options.writeAccess=false] Whether grant write access
    to the store in the onItem callback
    @param {Function} [options.onEnd=null] A callback to be called after
    iteration has ended
    @param {Function} [options.onError=throw] A callback to be called
    if an error occurred during the operation.
    @returns {IDBTransaction} The transaction used for this operation.
    ###
    iterate: (onItem, options) ->
        options = mixin(
            index: null
            order: "ASC"
            autoContinue: true
            filterDuplicates: false
            keyRange: null
            writeAccess: false
            onEnd: null
            onError: defaultErrorHandler
        , options or {})
        directionType = (if options.order.toLowerCase() is "desc" then "PREV" else "NEXT")
        directionType += "_NO_DUPLICATE"  if options.filterDuplicates
        hasSuccess = false
        cursorTransaction = @db.transaction([@storeName], @consts[(if options.writeAccess then "READ_WRITE" else "READ_ONLY")])
        cursorTarget = cursorTransaction.objectStore(@storeName)
        cursorTarget = cursorTarget.index(options.index)  if options.index
        cursorTransaction.oncomplete = ->
            unless hasSuccess
                options.onError null
                return
            if options.onEnd
                options.onEnd()
            else
                onItem null
            return

        cursorTransaction.onabort = options.onError
        cursorTransaction.onerror = options.onError
        cursorRequest = cursorTarget.openCursor(options.keyRange, @consts[directionType])
        cursorRequest.onerror = options.onError
        cursorRequest.onsuccess = (event) ->
            cursor = event.target.result
            if cursor
                onItem cursor.value, cursor, cursorTransaction
                cursor["continue"]()  if options.autoContinue
            else
                hasSuccess = true
            return

        cursorTransaction


    ###*
    Runs a query against the store and passes an array containing matched
    objects to the success handler.

    @param {Function} onSuccess A callback to be called when the operation
    was successful.
    @param {Object} [options] An object defining specific query options
    @param {Object} [options.index=null] An IDBIndex to operate on
    @param {String} [options.order=ASC] The order in which to provide the
    results, can be 'DESC' or 'ASC'
    @param {Boolean} [options.filterDuplicates=false] Whether to exclude
    duplicate matches
    @param {Object} [options.keyRange=null] An IDBKeyRange to use
    @param {Function} [options.onError=throw] A callback to be called if an error
    occurred during the operation.
    @returns {IDBTransaction} The transaction used for this operation.
    ###
    query: (onSuccess, options) ->
        result = []
        options = options or {}
        options.onEnd = ->
            onSuccess result
            return

        @iterate ((item) ->
            result.push item
            return
        ), options


    ###*
    Runs a query against the store, but only returns the number of matches
    instead of the matches itself.

    @param {Function} onSuccess A callback to be called if the opration
    was successful.
    @param {Object} [options] An object defining specific options
    @param {Object} [options.index=null] An IDBIndex to operate on
    @param {Object} [options.keyRange=null] An IDBKeyRange to use
    @param {Function} [options.onError=throw] A callback to be called if an error
    occurred during the operation.
    @returns {IDBTransaction} The transaction used for this operation.
    ###
    count: (onSuccess, options) ->
        options = mixin(
            index: null
            keyRange: null
        , options or {})
        onError = options.onError or defaultErrorHandler
        hasSuccess = false
        result = null
        cursorTransaction = @db.transaction([@storeName], @consts.READ_ONLY)
        cursorTransaction.oncomplete = ->
            callback = (if hasSuccess then onSuccess else onError)
            callback result
            return

        cursorTransaction.onabort = onError
        cursorTransaction.onerror = onError
        cursorTarget = cursorTransaction.objectStore(@storeName)
        cursorTarget = cursorTarget.index(options.index)  if options.index
        countRequest = cursorTarget.count(options.keyRange)
        countRequest.onsuccess = (evt) ->
            hasSuccess = true
            result = evt.target.result
            return

        countRequest.onError = onError
        cursorTransaction


    ###*
    ###

    # key ranges

    ###*
    ###

    ###*
    Creates a key range using specified options. This key range can be
    handed over to the count() and iterate() methods.

    Note: You must provide at least one or both of "lower" or "upper" value.

    @param {Object} options The options for the key range to create
    @param {*} [options.lower] The lower bound
    @param {Boolean} [options.excludeLower] Whether to exclude the lower
    bound passed in options.lower from the key range
    @param {*} [options.upper] The upper bound
    @param {Boolean} [options.excludeUpper] Whether to exclude the upper
    bound passed in options.upper from the key range
    @param {*} [options.only] A single key value. Use this if you need a key
    range that only includes one value for a key. Providing this
    property invalidates all other properties.
    @return {Object} The IDBKeyRange representing the specified options
    ###
    makeKeyRange: (options) ->

        #jshint onecase:true
        keyRange = undefined
        hasLower = typeof options.lower isnt "undefined"
        hasUpper = typeof options.upper isnt "undefined"
        isOnly = typeof options.only isnt "undefined"
        switch true
            when isOnly
                keyRange = @keyRange.only(options.only)
            when hasLower and hasUpper
                keyRange = @keyRange.bound(options.lower, options.upper, options.excludeLower, options.excludeUpper)
            when hasLower
                keyRange = @keyRange.lowerBound(options.lower, options.excludeLower)
            when hasUpper
                keyRange = @keyRange.upperBound(options.upper, options.excludeUpper)
            else
                throw new Error("Cannot create KeyRange. Provide one or both of \"lower\" or \"upper\" value, or an \"only\" value.")
        keyRange


###*
helpers *
###
noop = ->

empty = {}
mixin = (target, source) ->
    name = undefined
    s = undefined
    for name of source
        s = source[name]
        target[name] = s  if s isnt empty[name] and s isnt target[name]
    target

IDBStore.version = IDBStore.version
IDBStore
