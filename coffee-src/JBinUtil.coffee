JBinUtil = ->

JBinUtil.calculateHash = (data) ->
  result = 0
  idx = undefined
  ch = undefined
  len = undefined
  return result  if data.length is 0
  idx = 0
  len = data.length

  while idx < len
    ch = data.charCodeAt(idx)
    result = ((result << 5) - result) + ch
    result |= 0
    idx++
  result *= -1  if result < 0
  result

JBinUtil.LONG_BYTE_LENGTH = 8
JBinUtil.longToByteArray = (ln) ->
  ary = [
    0
    0
    0
    0
    0
    0
    0
    0
  ]
  ln *= -1  if ln < 0
  idx = 0

  while idx < ary.length
    v = ln & 0xff
    ary[idx] = v
    ln = (ln - v) / 256
    idx++
  ary

JBinUtil.byteArrayToLong = (bary) ->
  result = 0
  idx = bary.length - 1

  while idx >= 0
    result = (result * 256) + bary[idx]
    idx--
  result

JBinUtil.calculateLoopSize = (total, usize) ->
  rem = total % usize
  (if rem is 0 then total / usize else ((total - rem) / usize) + 1)

JBinUtil.byteToString = (bts) ->
  bts = bts.buffer  if bts.buffer?
  _0xb539x24 = 0x8000
  _0xb539x16 = 0
  _0xb539x25 = bts.byteLength
  result = ""
  _0xb539x27 = undefined
  while _0xb539x16 < _0xb539x25
    _0xb539x27 = bts.slice(_0xb539x16, Math.min(_0xb539x16 + _0xb539x24, _0xb539x25))
    result += String.fromCharCode.apply(null, new Uint8Array(_0xb539x27))
    _0xb539x16 += _0xb539x24
  result

JBinUtil.bytesToSize = (sz, dignum) ->
  kb = 1024
  mb = kb * 1024
  gb = mb * 1024
  tb = gb * 1024
  if (sz >= 0) and (sz < kb)
    return sz + " B"
  else
    if (sz >= kb) and (sz < mb)
      return (sz / kb)["toFixed"](dignum) + " KB"
    else
      if (sz >= mb) and (sz < gb)
        return (sz / mb)["toFixed"](dignum) + " MB"
      else
        if (sz >= gb) and (sz < tb)
          return (sz / gb)["toFixed"](dignum) + " GB"
        else
          if sz >= tb
            return (sz / tb)["toFixed"](dignum) + " TB"
          else
            return sz + " B"
  return

JBinUtil.ByteArray = (bts) ->
  @buf = new ArrayBuffer(bts)
  @bufView = new Uint8Array(@buf)
  @index = 0
  return

JBinUtil.ByteArray::addArray = (data, beg, end) ->
  idx = (if not beg? then 0 else beg)
  max = (if not end? then data.length else end)
  while idx < max
    @bufView[@index] = data[idx]
    idx++
    @index++
  return

JBinUtil.ByteArray::getArray = ->
  @bufView

JBinUtil.ByteArray::getArrayBuffer = ->
  @buf

JBinUtil.ByteArray::getLong = ->
  JBinUtil.byteArrayToLong @bufView

JBinUtil.FileByteArray = (req) ->
  @url = req.getUrl()
  @buf = new ArrayBuffer(req.getSize())
  @bufView = new Uint8Array(@buf)
  @index = 0
  @loopSize = JBinUtil.calculateLoopSize(req.getSize(), PeerConnection.SLICE)
  return

JBinUtil.FileByteArray::push = (_0xb539x16, _0xb539x1f, _0xb539x2d, _0xb539x2e) ->
  _0xb539x1b = _0xb539x16 * PeerConnection.SLICE
  _0xb539x31 = (_0xb539x2e - _0xb539x2d) + _0xb539x1b
  _0xb539x32 = _0xb539x2d

  while _0xb539x1b < _0xb539x31
    @bufView[_0xb539x1b] = _0xb539x1f[_0xb539x32]
    _0xb539x1b++
    _0xb539x32++
  @index++
  return true  if @loopSize is @index
  false

JBinUtil.FileByteArray::getUrl = ->
  @url

JBinUtil.FileByteArray::getArray = ->
  @bufView
