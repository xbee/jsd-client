
// require('FileBufferReader.js');

(function(exports) {

    var logger = jsd.util.logger;

    function ChannelEvents() {

        this.channel = null;

        // rtcdatachannel events
        this.ondata = function(event) {
            var self = this;

            // must be a global variable
            var fileBufferReader = window.fileBufferReader || new jsd.data.FileBufferReader();

            //logger.log('ondata', event);
            var chunk = event.data;

            if (chunk instanceof ArrayBuffer || chunk instanceof DataView) {
                // array buffers are passed using WebRTC data channels
                // need to convert data back into JavaScript objects

                fileBufferReader.convertToObject(chunk, function(object) {
                    self.ondata({
                        data: object
                    });
                });
                return;
            }

            // if target user requested next chunk
            if (chunk.readyForNextChunk) {
                fileBufferReader.getNextChunk(chunk.uuid, function(nextChunk, isLastChunk) {
                    if(isLastChunk) {
                        logger.log('Channel', 'File Successfully sent.');
                    }
                    // sending using WebRTC data channels
                    self.channel.send(nextChunk);
                });
                return;
            }

            // if chunk is received
            fileBufferReader.addChunk(chunk, function(promptNextChunk) {
                // request next chunk
                chunk.uuid && chunk.currentPosition &&
                logger.log('Channel', 'File ' + chunk.uuid + ', ' + 'chunk: ' + chunk.currentPosition + ' received.');
                //logger.log('I am: ', self.channel.type);
                self.channel.send(promptNextChunk);
            });
        },
        this.onopen = function() {
            logger.info('Channel', 'Peer connection established.');
        },
        this.onclose = function(e) {
            logger.info('Channel', 'Channel disconnected: ', e);
        },
        this.onerror = function(e) {
            logger.error('Channel', 'Channel error: ', e);
        }
    };

    ChannelEvents.prototype = {

        hook: function(datachannel) {

            var self = this;
            var dc;
            //self.channel = dc = new jsd.transport.Reliable(datachannel, jsd.util.debug);
            self.channel = dc = datachannel;

            // set channel events
            dc.binaryType = 'arraybuffer';
            dc.onmessage = function(event) {
                self.ondata(event);
            };
            dc.onopen = function() {
                self.onopen();
            };

            dc.onerror = function(e) {
                //logger.error('channel.onerror', JSON.stringify(e, null, '\t'));
                self.onerror(e);
            };

            dc.onclose = function(e) {
                //logger.warn('channel.onclose', JSON.stringify(e, null, '\t'));
                self.onclose(e);
            };
        }
    };

    exports.ChannelEvents = ChannelEvents;

})(typeof exports === 'undefined' ? jsd.core : exports);
