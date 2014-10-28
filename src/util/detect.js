/*
 *  get all of local ip address
 */
var detectLocalIPs = function (ctx, cb) {
    try {
        if (!window.navigator.onLine) {
            return false;
        }
        var RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        if (!RTCPeerConnection)
            return false;
        var iceEnded = false;
        var addrs = Object.create(null);
        addrs['0.0.0.0'] = false;
        var addAddress = function (newAddr) {
            if (newAddr in addrs)
                return;
            addrs[newAddr] = true;
        };
        var grepSDP = function (sdp) {
            sdp.split('\r\n').forEach(function (line) {
                if (~line.indexOf('a=candidate')) {
                    var parts = line.split(' '), addr = parts[4], type = parts[7];
                    if (type === 'host')
                        addAddress(addr);
                } else if (~line.indexOf('candidate:')) {
                    var parts = line.split(' '), addr = parts[4], type = parts[7];
                    if (type === 'host')
                        addAddress(addr);
                } else if (~line.indexOf('c=')) {
                    var parts = line.split(' '), addr = parts[2];
                    addAddress(addr);
                }
            });
        };

        // typescript do not support polyfill
        var rtc = new RTCPeerConnection({iceServers: []});
        if (window.mozRTCPeerConnection) {
            rtc.createDataChannel('', { reliable: false });
        }
        // for chrome: many times
        // for firefox: evt.candidate will be null
        rtc.onicecandidate = function (evt) {
            // for chrome: when offline, it will be called for ever until online
            // and the candidate is null,
            if (evt.candidate !== null) {
                //logger.log('DetectIPs', 'onicecandidate: ', evt.candidate);
                grepSDP(evt.candidate.candidate);
            } else {
                // TODO: need more test to check the state
                if (rtc.iceGatheringState === 'complete') {
                    // for chrome, if there is no network,
                    // it will be called many times , so we insure just one call
                    if (!iceEnded) {
                        // here we knew it is time to call callback
                        var displayAddrs = Object.keys(addrs).filter(function (k) { return addrs[k]; });
//          var xs = displayAddrs.join(', ');
//          logger.log('DetectIPs', 'addrs: ', xs);
                        if (displayAddrs) {
                            cb.apply(ctx, [displayAddrs.sort()]);
                            iceEnded = true;
                        }
                    }
                    rtc.onicecandidate = null;
                    rtc = null;
                }
            }

        };
        rtc.createOffer(function (offerDesc) {
            //logger.log('DetectIPs', 'createOffer: ', offerDesc.sdp);
            grepSDP(offerDesc.sdp);
            rtc.setLocalDescription(offerDesc);
        }, function (e) {
            logger.error('DetectIPs', 'createOffer failed: ', e);
        });
    } catch (e) {
        logger.error('DetectIPs', 'failed for: ', e);
        return false;
    }
    return true;
};