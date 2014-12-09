#= require IDBStore

noop = ->
JStorage = ->
    @idb = new IDBStore
        dbVersion: 1
        storeName: 'customer'
        keyPath: 'id'
        autoIncrement: true
        onStoreReady: ->
            console.log('Store ready!')
    return

JStorage.ITEMS_KEY = "PeerFiles"
JStorage.FILE_PREFIX = "Peer:"
JStorage.getFileList = ->
    onsuccess = (items) ->
        items.forEach( (item) ->
            console.log(item)

        )
  if typeof (Storage) isnt "undefined"
    item = localStorage.getItem(JStorage.ITEMS_KEY)
    if item?
      @fileList = JSON.parse(item)
    else
      @fileList = new Array()
  @fileList

JStorage.get = (_0xb539x11) ->
  noop()  if typeof (Storage) isnt "undefined"
  null

JStorage.put = (url, data, hash, size) ->
  result = true
  result &= JStorage.putLocalStorage(JStorage.FILE_PREFIX + url, data)
  @fileList = new Array()  unless @fileList?
  fobj =
    url: url
    hash: hash
    size: size

  @fileList.push fobj
  result &= JStorage.putLocalStorage(JStorage.ITEMS_KEY, JSON.stringify(@fileList))
  false

JStorage.putLocalStorage = (_0xb539x65, _0xb539x18) ->
  if typeof (Storage) isnt "undefined"
    try
      return true
    catch e
      PeerStatistic.log e.message  if e.QUOTA_EXCEEDED_ERR is e.code
  false
