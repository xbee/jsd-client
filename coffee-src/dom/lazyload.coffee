# lazyload.js (c) Lorenzo Giuliani
# * MIT License (http://www.opensource.org/licenses/mit-license.html)
# *
# * expects a list of:
# * `<img src="blank.gif" data-src="my_image.png" width="600" height="400" class="lazy">`
# 
((window) ->
  loadResource = (url, timeout, callback) ->
    args = Array::slice.call(arguments, 2)
    xhr = new XMLHttpRequest()
    xhr.ontimeout = ->
      console.log "request timeout: ", url
      return

    xhr.onload = ->
      if xhr.readyState is 4
        if xhr.status is 200 or xhr.status is 304
          
          #callback.apply(xhr.response, args);
          callback xhr.response
        else
          console.error "Error", xhr.statusText
      return

    xhr.onerror = (e) ->
      console.error xhr.statusText
      return

    xhr.open "GET", url, true
    xhr.responseType = "blob"
    xhr.timeout = (if not timeout? then 2000 else timeout)
    xhr.send null
    return
  loadImage = (el, fn) ->
    
    # replace src with objecturl
    img = new Image()
    src = el.getAttribute("data-src")
    
    # TODO: judge from server or from peer?
    # if from peer then
    # TODO: get image from peer
    # else get image from server by XHR
    loadResource src, (blob) ->
      objectURL = URL.createObjectURL(blob)
      img.onload = ->
        unless not el.parent
          el.parent.replaceChild img, el
        else
          el.src = objectURL
        (if fn then fn() else null)
        return

      img.src = objectURL
      console.log img
      return

    return
  elementInViewport = (el) ->
    rect = el.getBoundingClientRect()
    rect.top >= 0 and rect.left >= 0 and rect.top <= (window.innerHeight or document.documentElement.clientHeight)
  $q = (q, res) ->
    if document.querySelectorAll
      res = document.querySelectorAll(q)
    else
      d = document
      a = d.styleSheets[0] or d.createStyleSheet()
      a.addRule q, "f:b"
      l = d.all
      b = 0
      c = []
      f = l.length

      while b < f
        l[b].currentStyle.f and c.push(l[b])
        b++
      a.removeRule 0
      res = c
    res

  addEventListener = (evt, fn) ->
    (if window.addEventListener then @addEventListener(evt, fn, false) else (if (window.attachEvent) then @attachEvent("on" + evt, fn) else this["on" + evt] = fn))
    return

  _has = (obj, key) ->
    Object::hasOwnProperty.call obj, key

  images = new Array()
  query = $q("img.lazy")
  processScroll = ->
    i = 0

    while i < images.length
      if elementInViewport(images[i])
        loadImage images[i], ->
          images.splice i, i
          return

      i++
    return

  
  # Array.prototype.slice.call is not callable under our lovely IE8
  i = 0

  while i < query.length
    images.push query[i]
    i++
  processScroll()
  addEventListener "scroll", processScroll
  return
) this
