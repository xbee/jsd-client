// Last time updated at Sep 18, 2014, 08:32:23

// Latest file can be found here: https://cdn.webrtc-experiment.com/FileBufferReader.js

// Muaz Khan    - www.MuazKhan.com
// MIT License  - www.WebRTC-Experiment.com/licence
// Source Code  - https://github.com/muaz-khan/FileBufferReader
// Demo         - https://www.WebRTC-Experiment.com/FileBufferReader/

// ___________________
// FileBufferReader.js

// FileBufferReader.js uses binarize.js to convert Objects into array-buffers and vice versa.
// FileBufferReader.js is MIT licensed: www.WebRTC-Experiment.com/licence
// binarize.js is written by @agektmr: https://github.com/agektmr/binarize.js.

/* issues/features need to be fixed & implemented:
 -. Now "ArrayBuffer" is returned instead of "DataView".
 -. "onEnd" for sender now having "url" property as well; same as file receiver.
 -. "extra" must not be an empty object i.e. {} -because "binarize" fails to parse empty objects.
 -. "extra" must not have "date" types; -because "binarize" fails to parse date-types.
 */

//require('binarize')

(function(exports) {
  var FileBufferReader = function() {
    var fileBufferReader = this;
    fileBufferReader.chunks = {};

    fileBufferReader.readAsArrayBuffer = function(file, callback, extra) {
      extra = extra || {};
      extra.chunkSize = extra.chunkSize || 12 * 1000; // Firefox limit is 16k

      File.Read(file, function(args) {
        file.extra = extra || {};
        file.url = URL.createObjectURL(file);
        args.file = file; // passed over "onEnd"
        fileBufferReader.chunks[args.uuid] = args;
        callback(args.uuid);
      }, extra);
    };

    fileBufferReader.getNextChunk = function(uuid, callback) {
      var chunks = fileBufferReader.chunks[uuid];
      if (!chunks) return;

      var currentChunk = chunks.listOfChunks[chunks.currentPosition];
      var isLastChunk = currentChunk && currentChunk.end;

      FileConverter.ConvertToArrayBuffer(currentChunk, function(buffer) {
        if (chunks.currentPosition == 0) {
          fileBufferReader.onBegin(chunks.file);
        }

        if (isLastChunk) {
          fileBufferReader.onEnd(chunks.file);
        }

        callback(buffer, isLastChunk, currentChunk.extra);
        fileBufferReader.onProgress({
          currentPosition: chunks.currentPosition,
          maxChunks: chunks.maxChunks,
          uuid: chunks.uuid,
          extra: currentChunk.extra
        });
        fileBufferReader.chunks[uuid].currentPosition++;
      });
    };

    fileBufferReader.onBegin = fileBufferReader.onProgress = fileBufferReader.onEnd = function() {};

    var receiver = new File.Receiver(fileBufferReader);

    fileBufferReader.addChunk = function(chunk, callback) {
      receiver.receive(chunk, function(uuid) {
        FileConverter.ConvertToArrayBuffer({
          readyForNextChunk: true,
          uuid: uuid
        }, callback);
      });
    };

    fileBufferReader.convertToObject = FileConverter.ConvertToObject;
    fileBufferReader.convertToArrayBuffer = FileConverter.ConvertToArrayBuffer;
  };

  var FileSelector = function() {
    var selector = this;

    selector.selectSingleFile = selectFile;
    selector.selectMultipleFiles = function(callback) {
      selectFile(callback, true);
    };

    function selectFile(callback, multiple) {
      var file = document.createElement('input');
      file.type = 'file';

      if (multiple) {
        file.multiple = true;
      }

      file.onchange = function() {
        callback(multiple ? file.files : file.files[0]);
      };
      fireClickEvent(file);
    }

    function fireClickEvent(element) {
      var evt = new window.MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });

      element.dispatchEvent(evt);
    }
  };

  var File = {
    Read: function(file, callback, extra) {
      var numOfChunksInSlice;
      var currentPosition = 1;
      var hasEntireFile;
      var listOfChunks = {};

      var chunkSize = extra.chunkSize || 60 * 1000; // 64k max sctp limit (AFAIK!)

      var sliceId = 0;
      var cacheSize = chunkSize;

      var chunksPerSlice = Math.floor(Math.min(100000000, cacheSize) / chunkSize);
      var sliceSize = chunksPerSlice * chunkSize;
      var maxChunks = Math.ceil(file.size / chunkSize);

      // uuid is used to uniquely identify sending instance
      var uuid = file.uuid || (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '-');

      listOfChunks[0] = {
        uuid: uuid,
        maxChunks: maxChunks,
        size: file.size,
        name: file.name,
        lastModifiedDate: file.lastModifiedDate + '',
        type: file.type,
        start: true,
        extra: extra
      };

      file.maxChunks = maxChunks;
      file.uuid = uuid;

      var blob, reader = new FileReader();
      reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) {
          addChunks(file.name, evt.target.result, function() {
            sliceId++;
            if ((sliceId + 1) * sliceSize < file.size) {
              blob = file.slice(sliceId * sliceSize, (sliceId + 1) * sliceSize);
              reader.readAsArrayBuffer(blob);
            } else if (sliceId * sliceSize < file.size) {
              blob = file.slice(sliceId * sliceSize, file.size);
              reader.readAsArrayBuffer(blob);
            } else {
              listOfChunks[currentPosition] = {
                uuid: uuid,
                maxChunks: maxChunks,
                size: file.size,
                name: file.name,
                lastModifiedDate: file.lastModifiedDate + '',
                type: file.type,
                end: true,
                extra: extra
              };
              callback({
                currentPosition: 0,
                listOfChunks: listOfChunks,
                maxChunks: maxChunks + 1,
                uuid: uuid,
                extra: extra
              });
            }
          });
        }
      };

      blob = file.slice(sliceId * sliceSize, (sliceId + 1) * sliceSize);
      reader.readAsArrayBuffer(blob);

      function addChunks(fileName, binarySlice, callback) {
        numOfChunksInSlice = Math.ceil(binarySlice.byteLength / chunkSize);
        for (var i = 0; i < numOfChunksInSlice; i++) {
          var start = i * chunkSize;
          listOfChunks[currentPosition] = {
            uuid: uuid,
            value: binarySlice.slice(start, Math.min(start + chunkSize, binarySlice.byteLength)),
            currentPosition: currentPosition,
            maxChunks: maxChunks,
            extra: extra
          };

          currentPosition++;
        }

        if (currentPosition == maxChunks) {
          hasEntireFile = true;
        }

        callback();
      }
    },

    Receiver: function(config) {
      var packets = {};

      function receive(chunk, callback) {
        if (!chunk.uuid) {
          FileConverter.ConvertToObject(chunk, function(object) {
            receive(object);
          });
          return;
        }

        if (chunk.start && !packets[chunk.uuid]) {
          packets[chunk.uuid] = [];
          if (config.onBegin) config.onBegin(chunk);
        }

        if (!chunk.end && chunk.value) {
          packets[chunk.uuid].push(chunk.value);
        }

        if (chunk.end) {
          var _packets = packets[chunk.uuid];
          var finalArray = [],
              length = _packets.length;

          for (var i = 0; i < length; i++) {
            if (!!_packets[i]) {
              finalArray.push(_packets[i]);
            }
          }

          var blob = new Blob(finalArray, {
            type: chunk.type
          });
          blob = merge(blob, chunk);
          blob.url = URL.createObjectURL(blob);
          blob.uuid = chunk.uuid;

          if (!blob.size) console.error('Something went wrong. Blob Size is 0.');

          if (config.onEnd) config.onEnd(blob);
        }

        if (chunk.value && config.onProgress) config.onProgress(chunk);

        if (!chunk.end) callback(chunk.uuid);
      }

      return {
        receive: receive
      };
    },
    SaveToDisk: function(fileUrl, fileName) {
      var hyperlink = document.createElement('a');
      hyperlink.href = fileUrl;
      hyperlink.target = '_blank';
      hyperlink.download = fileName || fileUrl;

      var mouseEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });

      hyperlink.dispatchEvent(mouseEvent);
      (window.URL || window.webkitURL).revokeObjectURL(hyperlink.href);
    }
  };

  // ________________
  // FileConverter.js
  var FileConverter = {
    ConvertToArrayBuffer: function(object, callback) {
      binarize.pack(object, function(dataView) {
        callback(dataView.buffer);
      });
    },
    ConvertToObject: function(buffer, callback) {
      binarize.unpack(buffer, callback);
    }
  };

  function merge(mergein, mergeto) {
    if (!mergein) mergein = {};
    if (!mergeto) return mergein;

    for (var item in mergeto) {
      mergein[item] = mergeto[item];
    }
    return mergein;
  }

  exports.FileBufferReader = FileBufferReader;
  exports.FileConverter = FileConverter;
  exports.FileSelector = FileSelector;
  exports.File = File;

})(typeof exports === 'undefined' ? jsd.data : exports);
