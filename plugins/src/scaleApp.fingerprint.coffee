#= require FingerPrint

plugin = (core) ->

    core.Sandbox::fp = FingerPrint

# AMD support
if define?.amd?
    define -> plugin

# Browser support
else if window?.scaleApp?
    window.scaleApp.plugins.fp ?= plugin

# Node.js support
else if module?.exports?
    module.exports = plugin
