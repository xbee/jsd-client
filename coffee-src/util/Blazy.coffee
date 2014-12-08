
#= require Singleton

class Blazy extends Singleton

    constructor: (@options={}) ->
        #init vars
        @destroyed = true
        @images = []

        #options
        @options.error = @options.error or false
        @options.offset = @options.offset or 100
        @options.success = @options.success or false
        @options.selector = @options.selector or ".b-lazy"
        @options.separator = @options.separator or "|"
        @options.container = (if @options.container then document.querySelectorAll(@options.container) else false)
        @options.errorClass = @options.errorClass or "b-error"
        @options.breakpoints = @options.breakpoints or false
        @options.successClass = @options.successClass or "b-loaded"
        @options.src = @source = @options.src or "data-src"
        @isRetina = window.devicePixelRatio > 1

        #throttle, ensures that we don't call the functions too often
        validateT = throttle validate, 25
        saveWinOffsetT = throttle saveWinOffset, 50
        @saveWinOffset

        #handle multi-served image src
        each @options.breakpoints, (object) ->
            if object.width >= window.screen.width
                @source = object.src
                false

        # start lazy load
        @initialize()
        return

    # public functions
    #***********************************

    # private helper functions
    #***********************************
    initialize: ->

        # First we create an array of images to lazy load
        @images = createImageArray @options.selector

        # Then we bind resize and scroll events if not already binded
        if @destroyed
            @destroyed = false
            if @options.container
                each @options.container, (object) ->
                    bindEvent object, "scroll", validateT
                    return

            bindEvent window, "resize", saveWinOffsetT
            bindEvent window, "resize", validateT
            bindEvent window, "scroll", validateT

        # And finally, we start to lazy load. Should bLazy ensure domready?
        @validate()
        return

    validate: ->
        i = 0

        while i < count
            image = @images[i]
            if elementInView(image) or isElementLoaded(image)
                Blazy::load image
                images.splice i, 1
                count--
                i--
            i++
        @destroy  if count is 0
        return

    loadImage: (ele) ->
        # if element is visible
        if ele.offsetWidth > 0 and ele.offsetHeight > 0
            dataSrc = ele.getAttribute(source) or ele.getAttribute(options.src) # fallback to default data-src
            if dataSrc
                dataSrcSplitted = dataSrc.split(@options.separator)
                src = dataSrcSplitted[(if isRetina and dataSrcSplitted.length > 1 then 1 else 0)]
                img = new Image()

                # cleanup markup, remove data source attributes
                each @options.breakpoints, (object) ->
                    ele.removeAttribute object.src
                    return

                ele.removeAttribute @options.src
                img.onerror = ->
                    @options.error ele, "invalid"  if @options.error
                    ele.className = ele.className + " " + @options.errorClass
                    return

                img.onload = ->
                    # Is element an image or should we add the src as a background image?
                    (if ele.nodeName.toLowerCase() is "img" then ele.src = src else ele.style.backgroundImage = "url(\"" + src + "\")")
                    ele.className = ele.className + " " + @options.successClass
                    @options.success ele  if @options.success
                    return

                img.src = src #preload image
            else
                @options.error ele, "missing"  if @options.error
                ele.className = ele.className + " " + @options.errorClass
        return

    elementInView: (ele) ->
        bottomline = undefined
        rect = undefined
        rect = ele.getBoundingClientRect()
        bottomline = winHeight + @options.offset
        rect.left >= 0 and rect.right <= winWidth + @options.offset and (rect.top >= 0 and rect.top <= bottomline or rect.bottom <= bottomline and rect.bottom >= 0 - @options.offset)

    isElementLoaded: (ele) ->
        (" " + ele.className + " ").indexOf(" " + @options.successClass + " ") isnt -1

    saveWinOffset: ->
        @winHeight = window.innerHeight or document.documentElement.clientHeight
        @winWidth = window.innerWidth or document.documentElement.clientWidth
        return


createImageArray = (selector) ->
    i = undefined
    nodelist = undefined
    nodelist = document.querySelectorAll(selector)
    i = nodelist.length
    images = []
    images.unshift nodelist[i]  while i--
    return images

bindEvent = (ele, type, fn) ->
    if ele.attachEvent
        ele.attachEvent and ele.attachEvent("on" + type, fn)
    else
        ele.addEventListener type, fn, false
    return

unbindEvent = (ele, type, fn) ->
    if ele.detachEvent
        ele.detachEvent and ele.detachEvent("on" + type, fn)
    else
        ele.removeEventListener type, fn, false
    return

each = (object, fn) ->
    i = undefined
    l = undefined
    if object and fn
        l = object.length
        i = 0
        i++  while i < l and fn(object[i], i) isnt false
    return
