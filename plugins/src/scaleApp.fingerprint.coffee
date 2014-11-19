plugin = (core) ->

    class FingerPrint
        constructor: (options) ->
            nativeForEach = undefined
            nativeMap = undefined
            nativeForEach = Array::forEach
            nativeMap = Array::map
            @each = (obj, iterator, context) ->
                return  if obj is null
                if nativeForEach and obj.forEach is nativeForEach
                    obj.forEach iterator, context
                else if obj.length is +obj.length
                    i = 0
                    l = obj.length

                    while i < l
                        return  if iterator.call(context, obj[i], i, obj) is {}
                        i++
                else
                    for key of obj
                        return  if iterator.call(context, obj[key], key, obj) is {}  if obj.hasOwnProperty(key)
                return

            @map = (obj, iterator, context) ->
                results = []

                # Not using strict equality so that this acts as a
                # shortcut to checking for `null` and `undefined`.
                return results  unless obj?
                return obj.map(iterator, context)  if nativeMap and obj.map is nativeMap
                @each obj, (value, index, list) ->
                    results[results.length] = iterator.call(context, value, index, list)
                    return

                results

            if typeof options is "object"
                @hasher = options.hasher
                @screen_resolution = options.screen_resolution
                @canvas = options.canvas
                @ie_activex = options.ie_activex
            else @hasher = options  if typeof options is "function"
            return

        get: ->
            keys = []
            keys.push navigator.userAgent
            keys.push navigator.language
            keys.push screen.colorDepth
            if @screen_resolution
                resolution = @getScreenResolution()
                # headless browsers, such as phantomjs
                keys.push @getScreenResolution().join("x")  if typeof resolution isnt "undefined"
            keys.push new Date().getTimezoneOffset()
            keys.push @hasSessionStorage()
            keys.push @hasLocalStorage()
            keys.push !!window.indexedDB

            #body might not be defined at this point or removed programmatically
            if document.body
                keys.push typeof (document.body.addBehavior)
            else
                keys.push typeof `undefined`
            keys.push typeof (window.openDatabase)
            keys.push navigator.cpuClass
            keys.push navigator.platform
            keys.push navigator.doNotTrack
            keys.push @getPluginsString()
            keys.push @getCanvasFingerprint()  if @canvas and @isCanvasSupported()
            if @hasher
                @hasher keys.join("###"), 31
            else
                @murmurhash3_32_gc keys.join("###"), 31


        ###*
        JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)

        @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
        @see http://github.com/garycourt/murmurhash-js
        @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
        @see http://sites.google.com/site/murmurhash/

        @param {string} key ASCII only
        @param {number} seed Positive integer only
        @return {number} 32-bit positive integer hash
        ###
        murmurhash3_32_gc: (key, seed) ->
            remainder = undefined
            bytes = undefined
            h1 = undefined
            h1b = undefined
            c1 = undefined
            c2 = undefined
            k1 = undefined
            i = undefined
            remainder = key.length & 3 # key.length % 4
            bytes = key.length - remainder
            h1 = seed
            c1 = 0xcc9e2d51
            c2 = 0x1b873593
            i = 0
            while i < bytes
                k1 = (key.charCodeAt(i) & 0xff) | ((key.charCodeAt(++i) & 0xff) << 8) | ((key.charCodeAt(++i) & 0xff) << 16) | ((key.charCodeAt(++i) & 0xff) << 24)
                ++i
                k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff
                k1 = (k1 << 15) | (k1 >>> 17)
                k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff
                h1 ^= k1
                h1 = (h1 << 13) | (h1 >>> 19)
                h1b = (((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff
                h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16))
            k1 = 0
            switch remainder
                when 3
                    k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16
                when 2
                    k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8
                when 1
                    k1 ^= (key.charCodeAt(i) & 0xff)
                    k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff
                    k1 = (k1 << 15) | (k1 >>> 17)
                    k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff
                    h1 ^= k1
            h1 ^= key.length
            h1 ^= h1 >>> 16
            h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff
            h1 ^= h1 >>> 13
            h1 = (((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) & 0xffffffff
            h1 ^= h1 >>> 16
            h1 >>> 0


        # https://bugzilla.mozilla.org/show_bug.cgi?id=781447
        hasLocalStorage: ->
            try
                return !!window.localStorage
            catch e
                return true # SecurityError when referencing it means it exists
            return

        hasSessionStorage: ->
            try
                return !!window.sessionStorage
            catch e
                return true # SecurityError when referencing it means it exists
            return

        isCanvasSupported: ->
            elem = document.createElement("canvas")
            !!(elem.getContext and elem.getContext("2d"))

        isIE: ->
            if navigator.appName is "Microsoft Internet Explorer"
                return true
                # IE 11
            else return true  if navigator.appName is "Netscape" and /Trident/.test(navigator.userAgent)
            false

        getPluginsString: ->
            if @isIE() and @ie_activex
                @getIEPluginsString()
            else
                @getRegularPluginsString()

        getRegularPluginsString: ->
            @map(navigator.plugins, (p) ->
                mimeTypes = @map(p, (mt) ->
                    [
                        mt.type
                        mt.suffixes
                    ].join "~"
                ).join(",")
                [
                    p.name
                    p.description
                    mimeTypes
                ].join "::"
            , this).join ";"

        getIEPluginsString: ->
            if window.ActiveXObject
                names = [ #flash plugin
                    "ShockwaveFlash.ShockwaveFlash"
                    "AcroPDF.PDF" # Adobe PDF reader 7+
                    "PDF.PdfCtrl" # Adobe PDF reader 6 and earlier, brrr
                    "QuickTime.QuickTime" # QuickTime
                    # 5 versions of real players
                    "rmocx.RealPlayer G2 Control"
                    "rmocx.RealPlayer G2 Control.1"
                    "RealPlayer.RealPlayer(tm) ActiveX Control (32-bit)"
                    "RealVideo.RealVideo(tm) ActiveX Control (32-bit)"
                    "RealPlayer"
                    "SWCtl.SWCtl" # ShockWave player
                    "WMPlayer.OCX" # Windows media player
                    "AgControl.AgControl" # Silverlight
                    "Skype.Detection"
                ]

                # starting to detect plugins in IE
                @map(names, (name) ->
                    try
                        new ActiveXObject(name)
                        return name
                    catch e
                        return null
                    return
                ).join ";"
            else
                "" # behavior prior version 0.5.0, not breaking backwards compat.

        getScreenResolution: ->
            [
                screen.height
                screen.width
            ]

        getCanvasFingerprint: ->
            canvas = document.createElement("canvas")
            ctx = canvas.getContext("2d")

            # https://www.browserleaks.com/canvas#how-does-it-work
            txt = "http://jdy.io"
            ctx.textBaseline = "top"
            ctx.font = "14px 'Arial'"
            ctx.textBaseline = "alphabetic"
            ctx.fillStyle = "#f60"
            ctx.fillRect 125, 1, 62, 20
            ctx.fillStyle = "#069"
            ctx.fillText txt, 2, 15
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)"
            ctx.fillText txt, 4, 17
            canvas.toDataURL()

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
