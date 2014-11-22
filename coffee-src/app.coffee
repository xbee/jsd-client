#= require <Sandbox.coffee>

installApp = (sa) ->

  # initialize the application
  init = ->

    # creata new Core instance
    core = new sa.Core(JSandbox)
    options =
        uuid: toolbox.shortid()

    # JdyModule: import from jdyModule.js
    # register the module
    core.register "jdyModule", JdyModule
    core.start "jdyModule", (err) ->
      return console.log(err.message)  if err
      console.log "started 'jdyModule' module"
      return

    return


  # return public API
  window.app = init: init
  return

installApp window.scaleApp
window.app.init
