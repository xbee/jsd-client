
#= require <Util.coffee>
#= require <Common.coffee>
#= require ES6Promise
#= require Queue
#= require JLogger
#= require LRUCache
#= require IndexDBCache
#= require Mediator
#= require Core

# export public API
api =

  # current version
  VERSION: "0.4.5"

  toolbox: toolbox

  Logger: JLogger

  Deferred: JDeferred

  # the mediator class
  Mediator: Mediator

  Promise: ES6Promise.Promise

  Queue: Queue

  IndexDBCache: IndexDBCache

  LRUCache: LRUCache

  # the core class
  Core: Core

  # container for available plugins
  plugins: {}

  # container for available modules
  modules: {}

# support AMD
if define?.amd?
  define -> api

# support the browser
else if window?
  window.scaleApp ?= api

# support commonJS
else if module?.exports?
  module.exports = api
