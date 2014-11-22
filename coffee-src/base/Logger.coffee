
#= require Singleton

# Create dummy console functions if they don't exist in browser
window.console ?= {}
methods = [
    'assert', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group'
    'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd'
    'time', 'timeEnd', 'trace', 'warn'
]
(console[method] ?= ->) for method in methods


# Writers

class ConsoleWriter
    write: (msg) ->
        console.log(msg)

class LocalStorageWriter
    constructor: (@maxEntries) -> {}

    write: (msg) ->
        s = localStorage['app:log']
        s = if s then JSON.parse(s) else []
        s.unshift msg
        s.pop() while s.length > @maxEntries
        try localStorage['app:log'] = JSON.stringify(s)

writers =
    'ConsoleWriter': ConsoleWriter
    'LocalStorageWriter': LocalStorageWriter


# Formatters


class SimpleFormatter
    format: (msg, datetime, level, prefix) ->
        dt = datetime
        if typeof datetime is Date then dt = datetime.toString()
        if prefix is '' then "#{dt}[#{level.name}]: #{msg}"
        else "#{dt}|#{prefix}[#{level.name}]: #{msg}"

class JSONFormatter
    format: (msg, datetime, level, prefix) ->
        if prefix is '' then JSON.stringify {msg, datetime, level: level.name}
        else JSON.stringify {prefix, msg, datetime, level: level.name}

class HTMLFormatter
    format: (msg, datetime, level, prefix) ->
        if prefix is '' then JSON.stringify {msg, datetime, level: level.name}
        else JSON.stringify {prefix, msg, datetime, level: level.name}


formatters =
    'SimpleFormatter': SimpleFormatter
    'JSONFormatter': JSONFormatter
    'HTMLFormatter': HTMLFormatter


# Logger

class JLogger extends Singleton

    constructor: (options) ->
        @history = []
        @logLevel = @levels[options?.logLevel ? 'DEBUG']
        @maxEntries = options?.maxEntries ? 20
        @logPrefix = options?.logPrefix ? ''
        formatterName = options?.formatter ? 'SimpleFormatter'
        @formatter = new formatters[formatterName]()
        writerName = options?.writer ? 'ConsoleWriter'
        @writer = new writers[writerName](@maxEntries)

    levels:
        TRACE:  {value: 0, name: 'TRACE'}
        DEBUG:  {value: 1, name: 'DEBUG'}
        INFO:   {value: 2, name: 'INFO'}
        WARN:   {value: 3, name: 'WARN'}
        ERROR:  {value: 4, name: 'ERROR'}
        FATAL:  {value: 5, name: 'FATAL'}

    clear: -> @history = []

    log: (level, msg) =>
        dt = do (t=new Date())->
            current = t
            date = []
            hours = (if current.getHours() < 10 then ("0" + current.getHours()) else current.getHours())
            minutes = (if current.getMinutes() < 10 then ("0" + current.getMinutes()) else current.getMinutes())
            seconds = (if current.getSeconds() < 10 then ("0" + current.getSeconds()) else current.getSeconds())
            mseconds = current.getMilliseconds()
            date.push hours
            date.push minutes
            date.push seconds
            date.push mseconds
            date.join ":"
        if level.value >= @logLevel.value
            msg = @formatter.format(msg, dt, level, @logPrefix)
            @writer.write msg

            # Save to log history
            @history.unshift msg
            @history.pop() while @history.length > @maxEntries
        return

    trace: (msg) ->
        @log @levels.TRACE, msg

    debug: (msg) ->
        @log @levels.DEBUG, msg

    info: (msg) ->
        @log @levels.INFO, msg

    warn: (msg) ->
        @log @levels.WARN, msg

    error: (msg) ->
        @log @levels.ERROR, msg

    fatal: (msg) ->
        @log @levels.FATAL, msg



