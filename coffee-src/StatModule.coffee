

#= require <Engine.coffee>

# create the helloWorld module
StatModule = (sandbox) ->

    totalBytesDownFromServer = 0
    totalBytesDownFromPeer = 0
    totalBytesDown = 0

    totalBytesUpFromPeer = 0
    totalBytesUp = 0

    # boot your module
    init = (options) ->
        #
        sandbox.on JCMD.DOWN_FROM_SERVER, messageHandler
        sandbox.on JCMD.DOWN_FROM_PEER, messageHandler
        sandbox.on JCMD.UP_FROM_PEER, messageHandler
        return

    # shutdown your module
    destroy = ->
        sandbox.off JCMD.DOWN_FROM_SERVER
        sandbox.off JCMD.DOWN_FROM_PEER
        sandbox.off JCMD.UP_FROM_PEER
        return

    messageHandler = (data, topic) ->
        switch topic
            when JCMD.DOWN_FROM_SERVER then addBytesDownFromServer data
            when JCMD.DOWN_FROM_PEER then addBytesDownFromPeer data
            when JCMD.UP_FROM_PEER then addBytesUpFromPeer data
        return

    addBytesDownFromServer = (n) ->
        totalBytesDownFromServer += n
        totalBytesDown += n

    addBytesDownFromPeer = (n) ->
        totalBytesDownFromPeer += n
        totalBytesDown += n

    addBytesUpFromPeer = (n) ->
        totalBytesUpFromPeer += n
        totalBytesUp += n

    # public methods
    init: init
    destroy: destroy
    # public fields
    totalBytesDown: totalBytesDown

