
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

