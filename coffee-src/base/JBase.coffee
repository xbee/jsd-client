
#= require Mediator
#= require <scaleApp.coffee>

class JBase extends Mediator

    constructor: (@sandbox) ->
        @log = @sandbox.log
        @opts = @sandbox.opts


