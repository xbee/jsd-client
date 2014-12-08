
IndexDBCache = (@version=1, @opts={}) ->

    @init = (@dbName, stores) ->
        hasIDB = typeof window.indexedDB isnt 'undefined'
        throw new Error("Your browser does not support IndexDB")  unless hasIDB
        throw new Error("DB must have a dbName")  unless @dbName
        idb = indexedDB.open(@dbName, @version)
        idb.onupgradeneeded = ((e) =>
            @_initStores idb.result, stores or []  if e.oldVersion < @version
            return
        )
        idb.onerror = (event) ->
            console.log "IndexedDB errpor: " + idb.errorCode
            return

        return

    @_initStores = (db, stores) ->
        for store of stores
            unless db.objectStoreNames.contains(store.name)
                opts = (if store.keyPath then keyPath: store.keyPath else {})

                # generates keys, starting at 1
                opts.autoIncrement = true  unless opts.keyPath
                store = db.createObjectStore(store.name, opts)
            return

        return

    @put = (store, obj, next) ->
        idb = indexedDB.open(@dbName, @version)
        idb.onsuccess = (evt) ->
            idb.result.transaction([store], "readwrite")
                .objectStore(store)
                .put(obj)
                .onsuccess = (event) ->
                    next event.target.result  if next
                    return

            return

        return

    @find = (store, next) ->
        return next(err: "Store was undefined")  unless store
        idb = indexedDB.open(@dbName, @version)
        idb.onsuccess = (evt) ->
            items = []
            idb.result.transaction([store], "readwrite")
                .objectStore(store)
                .openCursor(IDBKeyRange.lowerBound(0), "next")
                .onsuccess = (event) ->
                    cursor = event.target.result
                    if cursor
                        items.push cursor.value
                        cursor.continue
                    else
                        next items  if next
                    return

            return

        idb.onerror = (event) ->
            console.log "IndexedDB error on find: " + idb.errorCode
            return

        return

    @findOne = (store, key, next) ->
        idb = indexedDB.open(@dbName, @version)
        idb.onsuccess = (evt) ->
            idb.result.transaction([store], "readonly")
                .objectStore(store)
                .get(key)
                .onsuccess = (evt) ->
                    next evt.target.result  if next
                    return

            return

        return

    @remove = (store, key, next) ->
        idb = indexedDB.open(@dbName, @version)
        idb.onsuccess = (evt) ->
            idb.result.transaction([store], "readwrite")
                .objectStore(store)
                .delete(key)
                .onsuccess = (evt) ->
                    next evt  if next
                    return

            return

        return

    return
