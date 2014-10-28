
require.config({
    paths: {
        'domready': '../lib/requirejs-domready/domReady',
        'lodash': '../lib/lodash/dist/lodash',
        'eventemitter2': '../lib/eventemitter2/lib/eventemitter2',
        'idbwrapper': '../lib/idbwrapper/idbstore',
        'node-uuid': '../lib/node-uuid/uuid',
        'observe-js': '../lib/observe-js/src/observe',
        'q': '../lib/q/q',
        'jquery': '../lib/jquery',
        'sockjs': '../lib/sockjs/sockjs',
//        'swfobject': '../lib/evercookie/js/swfobject-2.2.min',
//        'evercookie': '../lib/evercookie/js/evercookie',
        'state-machine': '../lib/javascript-state-machine/state-machine',
        'fingerprint': '../lib/fingerprintjs/fingerprint',
        'sha1': '../lib/cryptojs/rollups/sha1',
        'binarize': '../lib/binarize.js/src/binarize',
        'fbr': './FileBufferReader',
        'utils': './utils'
    }
});

define(['jquery', 'app', 'fingerprint', 'sha1', 'binarize', 'fbr'],
function ($, jsd, fingerprint, sha1, binarize, fbr) {

  var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
  var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    try {
      var logger = jsd.logger;
      var app = new jsd.App();

      app.init();
      app.start();

      var peer = null;
      var createPeerConnection = function(peerid) {
        app.session.sendParticipantRequest(peerid);
      };

      var getPeer = function() {
        var peerid = $('#target').val();
        if (peerid) {
          return app.session.psm.getPeerByUuid(peerid);
        } else {
          return null;
        }
      };

      window.peer = peer;
      window.createPeerConnection = createPeerConnection;

      $('#uuid').val(app.settings.uuid);
      $('#call').click(function () {
        var target = $('#target').val();
        if (target) {
          window.createPeerConnection(target);
        } else {
          console.error('You need input the target id');
        }
      });
      var objectURL = undefined;
      $('#loadfile').click(function () {
        if (!objectURL) {
          var url = 'http://localhost:8081/images/1.jpg';
          load_binary_resource(url, function(b) {
            objectURL = URL.createObjectURL(b);
          });
        }
      });
//      var my_hasher = function(value, seed) {
//        return CryptoJS.SHA1(value).toString(CryptoJS.enc.Hex);
//      };

//      var fp = new fingerprint({hasher: my_hasher});
//      var bid = fp.get();
//      var mid = my_hasher(fp.getCanvasFingerprint(), 32);

//      console.info('Your bid: ', bid);
//      console.info('Your mid: ', mid);

//      app.settings.uuid = bid;
//      app.settings.mid = mid;

//      window.clientjs = clientjs;
      window.fingerprint = fingerprint;
      window.jsdapp = app;
      window.jsd = jsd;

      /**
       * Event-Handler, called when Network state changes
       *
       * @private
       * @method networkConnectivityStateChangeHandler
       * @param {Object} e
       */
      function networkConnectivityStateChangeHandler(e) {
        if (e.type === 'online') {
          logger.log('Network', 'online!');
          logger.log('Network', 'try to reconnecting ...');
          app.start();
        }
        else {
          logger.warn('Network', 'offline!');
          app.stop();
        }
      }

      window.addEventListener('offline', networkConnectivityStateChangeHandler);
      window.addEventListener('online', networkConnectivityStateChangeHandler);

      function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        var files = evt.dataTransfer.files; // FileList object.
        var file = files[0];

        // files is a FileList of File objects. List some properties.
        var output = [];
        for (var i = 0, f; f = files[i]; i++) {
            // Only process image files.
            if (!f.type.match('image.*')) {
                continue;
            }

            output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
              f.size, ' bytes, last modified: ',
              f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
              '</li>');
        }
        document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';

          var reader = new FileReader();

          // Closure to capture the file information.
          reader.onload = (function(theFile) {
              return function(e) {
                  // Render thumbnail.
                  var span = document.createElement('span');
                  span.innerHTML = ['<img class="thumb" src="', e.target.result,
                      '" title="', escape(theFile.name), '"/>'].join('');
                  document.getElementById('list').insertBefore(span, null);
              };
          })(f);

          // Read in the image file as a data URL.
          reader.readAsDataURL(f);
      }

      function handleDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
      }

      //// Setup the dnd listeners.
      //var dropZone = document.getElementById('drop_zone');
      //dropZone.addEventListener('dragover', handleDragOver, false);
      //dropZone.addEventListener('drop', handleFileSelect, false);

      var progressHelper = {};
      var outputPanel = document.querySelector('.output-panel');

      var FileHelper = {
        onBegin: function(file) {
          var li = document.createElement('li');
          li.title = file.name;
          li.innerHTML = '<label>0%</label> <progress></progress>';
          outputPanel.insertBefore(li, outputPanel.firstChild);
          progressHelper[file.uuid] = {
            li: li,
            progress: li.querySelector('progress'),
            label: li.querySelector('label')
          };
          progressHelper[file.uuid].progress.max = file.maxChunks;
        },
        onEnd: function(file) {
          progressHelper[file.uuid].li.innerHTML = '<a href="' + file.url + '" target="_blank" download="' + file.name + '">' + file.name + '</a>';
        },
        onProgress: function(chunk) {
          var helper = progressHelper[chunk.uuid];
          helper.progress.value = chunk.currentPosition || chunk.maxChunks || helper.progress.max;
          updateLabel(helper.progress, helper.label);
        }
      };

      function updateLabel(progress, label) {
        if (progress.position == -1) return;
        var position = +progress.position.toFixed(2).split('.')[1] || 100;
        label.innerHTML = position + '%';
      }

      var fileSelector = new FileSelector();
      var fileBufferReader = new FileBufferReader();

      fileBufferReader.onBegin    = FileHelper.onBegin;
      fileBufferReader.onProgress = FileHelper.onProgress;
      fileBufferReader.onEnd      = FileHelper.onEnd;

      var btnSelectFile = document.getElementById('select-file');
      btnSelectFile.onclick = function() {
        btnSelectFile.disabled = true;
        fileSelector.selectSingleFile(function(file) {
          fileBufferReader.readAsArrayBuffer(file, function(uuid) {
            fileBufferReader.getNextChunk(uuid, getNextChunkCallback);
            btnSelectFile.disabled = false;
          });
        });
      };

      // getNextChunkCallback gets next available buffer
      // you need to send that buffer using WebRTC data channels
      function getNextChunkCallback(nextChunk, isLastChunk) {
        if(isLastChunk) {
          // alert('File Successfully sent.');
        }

        var peer = getPeer();
        // sending using WebRTC data channels
        peer.channel.send(nextChunk);
      };

      function load_binary_resource(url, callback) {
        //deferred = Q.defer;
        var oReq = new XMLHttpRequest();
        oReq.open("GET", url, true);
        // oReq.setRequestHeader('Range', 'bytes=100-200');
        oReq.responseType = "blob";

        var blob;
        oReq.onload = function(oEvent) {
          blob = oReq.response;
          // do something with blob
          callback(blob);
        };

        oReq.send();
      };


    } catch(ex) {
        console.log(ex.stack);
    }

});



