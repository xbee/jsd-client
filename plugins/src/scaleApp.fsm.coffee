
#= require StateMachine

plugin = (core) ->

    # extend the sandbox class
    core.Sandbox::fsm = StateMachine

# AMD support
if define?.amd?
    define -> plugin

# Browser support
else if window?.scaleApp?
    window.scaleApp.plugins.fsm ?= plugin

# Node.js support
else if module?.exports?
    module.exports = plugin
