webrtcDetectedBrowser = null;
RTCPeerConnection = null
RTCSessionDescription = null
RTCIceCandidate = null

# Handle vendor prefixes
if window.webkitRTCPeerConnection
    RTCPeerConnection = webkitRTCPeerConnection
    RTCIceCandidate = window.RTCIceCandidate
    RTCSessionDescription = window.RTCSessionDescription
    webrtcDetectedBrowser = "chrome"

else if window.mozRTCPeerConnection
    RTCPeerConnection = mozRTCPeerConnection
    RTCIceCandidate = mozRTCIceCandidate
    RTCSessionDescription = mozRTCSessionDescription
    webrtcDetectedBrowser = "firefox"


indexedDB = window.indexedDB or
        window.webkitIndexedDB or
        window.mozIndexedDB or
        window.OIndexedDB or
        window.msIndexedDB

IDBTransaction = window.IDBTransaction or
        window.webkitIDBTransaction or
        window.OIDBTransaction or
        window.msIDBTransaction


unless document.querySelectorAll
    s = document.createStyleSheet()
    document.querySelectorAll = (r, c, i, j, a) ->
        a = document.all
        c = []
        r = r.replace(/\[for\b/g, "[htmlFor").split(",")

        i = r.length
        while i--
            s.addRule r[i], "k:v"
            j = a.length
            while j--
                a[j].currentStyle.k and c.push(a[j])
            s.removeRule 0
        c
