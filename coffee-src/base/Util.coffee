
#= require <FingerPrint>

fnRgx =
  ///
    function    # start with 'function'
    [^(]*       # any character but not '('
    \(          # open bracket = '(' character
      ([^)]*)   # any character but not ')'
    \)          # close bracket = ')' character
  ///

argRgx = /([^\s,]+)/g

getArgumentNames = (fn) ->
  (fn?.toString().match(fnRgx)?[1] or '').match(argRgx) or []

# run asynchronous tasks in parallel
runParallel = (tasks=[], cb=(->), force) ->
  count   = tasks.length
  results = []

  return cb null, results if count is 0

  errors  = []; hasErr = false

  for t,i in tasks then do (t,i) ->
    next = (err, res...) ->
      if err
        errors[i] = err
        hasErr    = true
        return cb errors, results unless force
      else
        results[i] = if res.length < 2 then res[0] else res
      if --count <= 0
        if hasErr
          cb errors, results
        else
          cb null, results
    try
      t next
    catch e
      next e

# run asynchronous tasks one after another
runSeries = (tasks=[], cb=(->), force) ->
  i = -1
  count   = tasks.length
  results = []
  return cb null, results if count is 0

  errors = []; hasErr = false

  next = (err, res...) ->
    if err
      errors[i] = err
      hasErr    = true
      return cb errors, results unless force
    else
      if i > -1 # first run
        results[i] = if res.length < 2 then res[0] else res
    if ++i >= count
      if hasErr
        cb errors, results
      else
        cb null, results
    else
      try
        tasks[i] next
      catch e
        next e
  next()

# run asynchronous tasks one after another
# and pass the argument
runWaterfall = (tasks, cb) ->
  i = -1
  return cb() if tasks.length is 0

  next = (err, res...) ->
    return cb err if err?
    if ++i >= tasks.length
      cb null, res...
    else
      tasks[i] res..., next
  next()

doForAll = (args=[], fn, cb, force)->
  tasks = for a in args then do (a) -> (next) -> fn a, next
  util.runParallel tasks, cb, force

browserId = ->
    #my_hasher = (value, seed) ->
    #    jsd.util.CryptoJS.SHA1(value).toString jsd.util.CryptoJS.enc.Hex
    #fp = new Fingerprint({hasher: my_hasher});
    fp = new FingerPrint()
    bid = fp.get()
    return String(bid)

shortId = ->
    "xxxxxxxx".replace /[xy]/g, (c) ->
        r = Math.random() * 16 | 0
        v = (if c is "x" then r else (r & 0x3 | 0x8))
        v.toString 16

uuid = ->
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace /[xy]/g, (c) ->
        r = Math.random() * 16 | 0
        v = (if c is "x" then r else (r & 0x3 | 0x8))
        v.toString 16

# Merge objects, returning a fresh copy with attributes from both sides.
# Used every time `Base#compile` is called, to allow properties in the
# options hash to propagate down the tree without polluting other branches.
merge = (options, overrides) ->
    extend (extend {}, options), overrides

# Extend a source object with the properties of another object (shallow copy).
extend = (object, properties) ->
    for key, val of properties
        object[key] = val
    object


clone = (obj) ->
    if not obj? or typeof obj isnt 'object'
        return obj

    if obj instanceof Date
        return new Date(obj.getTime())

    if obj instanceof RegExp
        flags = ''
        flags += 'g' if obj.global?
        flags += 'i' if obj.ignoreCase?
        flags += 'm' if obj.multiline?
        flags += 'y' if obj.sticky?
        return new RegExp(obj.source, flags)

    newInstance = new obj.constructor()

    for key of obj
        newInstance[key] = clone obj[key]

    return newInstance

#x =
#    foo: 'bar'
#    bar: 'foo'
#
#y = clone(x)
#
#y.foo = 'test'
#
#console.log x.foo isnt y.foo, x.foo, y.foo
## => true, bar, test


loadResourceByXHR = (url, callback) ->

    #deferred = Q.defer;
    oReq = new XMLHttpRequest()
    oReq.open "GET", url, true

    # oReq.setRequestHeader('Range', 'bytes=100-200');
    oReq.responseType = "blob"
    oReq.onload = (oEvent) ->

        # blob just valid in this scope
        blob = oReq.response

        # do something with blob
        callback blob
        return

    oReq.send()
    return


toolbox =
  doForAll: doForAll
  runParallel : runParallel
  runSeries : runSeries
  runWaterfall : runWaterfall
  getArgumentNames: getArgumentNames
  hasArgument: (fn, idx=1) -> toolbox.getArgumentNames(fn).length >= idx
  merge: merge
  extend: extend
  clone: clone
  browserId: browserId
  shortId: shortId
  uuid: uuid
  loadResourceByXHR: loadResourceByXHR

