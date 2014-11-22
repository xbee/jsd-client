
##= require <scaleApp.coffee>
#= require JDataFileBufferReader

JSandbox = (core, @instanceId, @options={}, @moduleId) ->

    @log = JLogger.getInstance({logPrefix: 'Jdy'})

    @fileBufferReader = new JDataFileBufferReader()

    # get browser id
    @browId = toolbox.browserId()
    # get options object
    @opts = JOptions.getInstance()
#    @uuid =
    # e.g. provide the Mediator methods 'on', 'emit', etc.
    core._mediator.installTo @
    @

# ... and of course you can define shared methods etc.
JSandbox::foo = -> #...
