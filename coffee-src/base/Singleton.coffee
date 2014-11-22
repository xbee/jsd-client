
# Create a private class that we can initialize however
# defined inside the wrapper scope.
#class ProtectedClass
#    constructor: (@message) ->
#    echo: -> @message

class Singleton
    # You can add statements inside the class definition
    # which helps establish private scope (due to closures)
    # instance is defined as null to force correct scope
    @_instance = null
    # This is a static method used to either retrieve the
    # instance or create a new one.
    @getInstance: ->
        @_instance ?= new @ arguments...
