# Last time updated at Sep 18, 2014, 08:32:23

# Latest file can be found here: https://cdn.webrtc-experiment.com/FileBufferReader.js

# Muaz Khan    - www.MuazKhan.com
# MIT License  - www.WebRTC-Experiment.com/licence
# Source Code  - https://github.com/muaz-khan/FileBufferReader
# Demo         - https://www.WebRTC-Experiment.com/FileBufferReader/

# ___________________
# FileBufferReader.js

# FileBufferReader.js uses binarize.js to convert Objects into array-buffers and vice versa.
# FileBufferReader.js is MIT licensed: www.WebRTC-Experiment.com/licence
# binarize.js is written by @agektmr: https://github.com/agektmr/binarize.js.

# issues/features need to be fixed & implemented:
# -. Now "ArrayBuffer" is returned instead of "DataView".
# -. "onEnd" for sender now having "url" property as well; same as file receiver.
# -. "extra" must not be an empty object i.e. {} -because "binarize" fails to parse empty objects.
# -. "extra" must not have "date" types; -because "binarize" fails to parse date-types.
#

#= require <binarize.coffee>

# Firefox limit is 16k
# passed over "onEnd"
# 64k max sctp limit (AFAIK!)

# uuid is used to uniquely identify sending instance

# ________________
# FileConverter.js
merge = (mergein, mergeto) ->
    mergein = {}  unless mergein
    return mergein  unless mergeto
    for item of mergeto
      mergein[item] = mergeto[item]
    mergein

class JDataFileBufferReader

    constructor: ->
      @chunks = {}
      @onBegin = @onProgress = @onEnd = ->
      @receiver = new File.Receiver(@)
      @convertToObject = JDataFileConverter.ConvertToObject
      @convertToArrayBuffer = JDataFileConverter.ConvertToArrayBuffer

    readAsArrayBuffer: (file, callback, extra) ->
      extra = extra or {}
      extra.chunkSize = extra.chunkSize or 12 * 1000
      File.Read file, ((args) ->
        file.extra = extra or {}
        file.url = URL.createObjectURL(file)
        args.file = file
        @chunks[args.uuid] = args
        callback args.uuid
        return
      ), extra
      return

    getNextChunk: (uuid, callback) ->
      chunks = @chunks[uuid]
      return  unless chunks
      currentChunk = chunks.listOfChunks[chunks.currentPosition]
      isLastChunk = currentChunk and currentChunk.end
      @ConvertToArrayBuffer currentChunk, (buffer) ->
        @onBegin chunks.file  if chunks.currentPosition is 0
        @onEnd chunks.file  if isLastChunk
        callback buffer, isLastChunk, currentChunk.extra
        @onProgress
          currentPosition: chunks.currentPosition
          maxChunks: chunks.maxChunks
          uuid: chunks.uuid
          extra: currentChunk.extra

        @chunks[uuid].currentPosition++
        return
      return

    addChunk: (chunk, callback) ->
      @receiver.receive chunk, (uuid) ->
        @ConvertToArrayBuffer
          readyForNextChunk: true
          uuid: uuid
        , callback
        return
      return


class JDataFileSelector
    selectFile: (callback, multiple) ->
      file = document.createElement("input")
      file.type = "file"
      file.multiple = true  if multiple
      file.onchange = ->
        callback (if multiple then file.files else file.files[0])
        return

      @fireClickEvent file
      return
    fireClickEvent: (element) ->
      evt = new window.MouseEvent("click",
        view: window
        bubbles: true
        cancelable: true
      )
      element.dispatchEvent evt
      return
    selectSingleFile: (callback, multiple) ->
      @selectFile callback, multiple
    selectMultipleFiles: (callback) ->
      @selectFile callback, true


JDataFile =
    Read: (file, callback, extra) ->
      addChunks = (fileName, binarySlice, callback) ->
        numOfChunksInSlice = Math.ceil(binarySlice.byteLength / chunkSize)
        i = 0

        while i < numOfChunksInSlice
          start = i * chunkSize
          listOfChunks[currentPosition] =
            uuid: uuid
            value: binarySlice.slice(start, Math.min(start + chunkSize, binarySlice.byteLength))
            currentPosition: currentPosition
            maxChunks: maxChunks
            extra: extra

          currentPosition++
          i++
        hasEntireFile = true  if currentPosition is maxChunks
        callback()
        return
      numOfChunksInSlice = undefined
      currentPosition = 1
      hasEntireFile = undefined
      listOfChunks = {}
      chunkSize = extra.chunkSize or 60 * 1000
      sliceId = 0
      cacheSize = chunkSize
      chunksPerSlice = Math.floor(Math.min(100000000, cacheSize) / chunkSize)
      sliceSize = chunksPerSlice * chunkSize
      maxChunks = Math.ceil(file.size / chunkSize)
      uuid = file.uuid or (Math.random() * new Date().getTime()).toString(36).replace(/\./g, "-")
      listOfChunks[0] =
        uuid: uuid
        maxChunks: maxChunks
        size: file.size
        name: file.name
        lastModifiedDate: file.lastModifiedDate + ""
        type: file.type
        start: true
        extra: extra

      file.maxChunks = maxChunks
      file.uuid = uuid
      blob = undefined
      reader = new FileReader()
      reader.onloadend = (evt) ->
        if evt.target.readyState is FileReader.DONE
          addChunks file.name, evt.target.result, ->
            sliceId++
            if (sliceId + 1) * sliceSize < file.size
              blob = file.slice(sliceId * sliceSize, (sliceId + 1) * sliceSize)
              reader.readAsArrayBuffer blob
            else if sliceId * sliceSize < file.size
              blob = file.slice(sliceId * sliceSize, file.size)
              reader.readAsArrayBuffer blob
            else
              listOfChunks[currentPosition] =
                uuid: uuid
                maxChunks: maxChunks
                size: file.size
                name: file.name
                lastModifiedDate: file.lastModifiedDate + ""
                type: file.type
                end: true
                extra: extra

              callback
                currentPosition: 0
                listOfChunks: listOfChunks
                maxChunks: maxChunks + 1
                uuid: uuid
                extra: extra

            return

        return

      blob = file.slice(sliceId * sliceSize, (sliceId + 1) * sliceSize)
      reader.readAsArrayBuffer blob
      return

    Receiver: (config) ->
      receive = (chunk, callback) ->
        unless chunk.uuid
          JDataFileConverter.ConvertToObject chunk, (object) ->
            receive object
            return

          return
        if chunk.start and not packets[chunk.uuid]
          packets[chunk.uuid] = []
          config.onBegin chunk  if config.onBegin
        packets[chunk.uuid].push chunk.value  if not chunk.end and chunk.value
        if chunk.end
          _packets = packets[chunk.uuid]
          finalArray = []
          length = _packets.length
          i = 0

          while i < length
            finalArray.push _packets[i]  unless not _packets[i]
            i++
          blob = new Blob(finalArray,
            type: chunk.type
          )
          blob = merge(blob, chunk)
          blob.url = URL.createObjectURL(blob)
          blob.uuid = chunk.uuid
          console.error "Something went wrong. Blob Size is 0."  unless blob.size
          config.onEnd blob  if config.onEnd
        config.onProgress chunk  if chunk.value and config.onProgress
        callback chunk.uuid  unless chunk.end
        return
      packets = {}
      receive: receive

    SaveToDisk: (fileUrl, fileName) ->
      hyperlink = document.createElement("a")
      hyperlink.href = fileUrl
      hyperlink.target = "_blank"
      hyperlink.download = fileName or fileUrl
      mouseEvent = new MouseEvent("click",
        view: window
        bubbles: true
        cancelable: true
      )
      hyperlink.dispatchEvent mouseEvent
      (window.URL or window.webkitURL).revokeObjectURL hyperlink.href
      return

JDataFileConverter =
    ConvertToArrayBuffer: (object, callback) ->
      binarize.pack object, (dataView) ->
        callback dataView.buffer
        return

      return

    ConvertToObject: (buffer, callback) ->
      binarize.unpack buffer, callback
      return


