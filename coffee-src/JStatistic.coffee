JStatistic = ->

JStatistic.upload = 0
JStatistic.download = 0
JStatistic.serverDownload = 0
JStatistic.serverPercent = 0
JStatistic.peerDownload = 0
JStatistic.peerPercent = 0

JStatistic.addUploadSize = (sz) ->
  JStatistic.upload += sz
  return

JStatistic.addDownloadSize = (sz, isFromPeer) ->
  JStatistic.download += sz
  if isFromPeer
    JStatistic.peerDownload += sz
  else
    JStatistic.serverDownload += sz
  JStatistic.peerPercent = (JStatistic.peerDownload * 100) / JStatistic.download
  JStatistic.serverPercent = (JStatistic.serverDownload * 100) / JStatistic.download
  return


